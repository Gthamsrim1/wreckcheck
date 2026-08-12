import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
	Check,
	CheckResult,
	Finding,
	ScanContext,
} from '@wreckcheck/core';
import { createFingerprint, findingIds } from '@wreckcheck/core';

interface SecretPattern {
	id: string;
	name: string;
	pattern: RegExp;
	severity: Finding['severity'];
}

const SECRET_PATTERNS: SecretPattern[] = [
	{
		id: 'aws-access-key',
		name: 'AWS access key',
		pattern: /\bAKIA[0-9A-Z]{16}\b/g,
		severity: 'critical',
	},
	{
		id: 'github-token',
		name: 'GitHub token',
		pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
		severity: 'critical',
	},
	{
		id: 'stripe-secret-key',
		name: 'Stripe secret key',
		pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/g,
		severity: 'critical',
	},
	{
		id: 'openai-api-key',
		name: 'OpenAI API key',
		pattern: /\bsk-[A-Za-z0-9]{40,}\b/g,
		severity: 'critical',
	},
	{
		id: 'private-key',
		name: 'Private key',
		pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
		severity: 'critical',
	},
];

const secretFindingIds: Record<string, string> = {
	'aws-access-key': findingIds.awsAccessKey,
	'github-token': findingIds.githubToken,
	'stripe-secret-key': findingIds.stripeSecretKey,
	'openai-api-key': findingIds.openaiApiKey,
	'private-key': findingIds.privateKey,
};

const IGNORED_DIRECTORIES = new Set([
	'.git',
	'node_modules',
	'dist',
	'build',
	'.next',
	'coverage',
]);

const MAX_FILE_SIZE = 1024 * 1024;

async function getFiles(
	rootDir: string,
	directory = rootDir,
): Promise<string[]> {
	const { readdir, stat } = await import('node:fs/promises');

	const entries = await readdir(directory, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
			continue;
		}

		const fullPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await getFiles(rootDir, fullPath)));
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const fileStat = await stat(fullPath);

		if (fileStat.size <= MAX_FILE_SIZE) {
			files.push(fullPath);
		}
	}

	return files;
}

async function scanFile(rootDir: string, filePath: string): Promise<Finding[]> {
	let content: string;

	try {
		content = await readFile(filePath, 'utf8');
	} catch {
		return [];
	}

	const findings: Finding[] = [];

	for (const secret of SECRET_PATTERNS) {
		secret.pattern.lastIndex = 0;

		const matches = [...content.matchAll(secret.pattern)];

		for (const match of matches) {
			const index = match.index ?? 0;
			const line = content.slice(0, index).split('\n').length;
			const findingId = secretFindingIds[secret.id] ?? `security:${secret.id}`;

			findings.push({
				id: findingId,
				fingerprint: createFingerprint(
					findingId,
					filePath.slice(rootDir.length + 1),
					line,
				),
				severity: secret.severity,
				category: 'security',
				title: `${secret.name} detected`,
				description: `A value matching the ${secret.name} pattern was found.`,
				file: filePath.slice(rootDir.length + 1),
				line,
				recommendation:
					'Remove the credential from source control and rotate it immediately.',
			});
		}
	}

	return findings;
}

export const secretsCheck: Check = {
	id: 'secrets',
	name: 'Secret detection',
	category: 'security',

	async run(context: ScanContext): Promise<CheckResult> {
		const files = await getFiles(context.rootDir);
		const start = performance.now();

		const results = await Promise.all(
			files.map((file) => scanFile(context.rootDir, file)),
		);
		const findings = results.flat();

		return { status: 'passed', findings, duration: performance.now() - start };
	},
};

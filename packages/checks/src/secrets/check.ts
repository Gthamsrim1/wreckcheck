/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
	Check,
	CheckResult,
	Finding,
	ScanContext,
} from '@wreckcheck/core';
import { createFingerprint, findingIds } from '@wreckcheck/core';

/** One kind of credential the scanner recognises. */
interface SecretPattern {
	/** Short identifier, such as `aws-access-key`. */
	id: string;
	/** Human-readable name used in the finding title. */
	name: string;
	/** Global pattern matching the credential format. */
	pattern: RegExp;
	/** Severity reported when the pattern matches. */
	severity: Finding['severity'];
}

/**
 * Credential formats the scanner looks for.
 *
 * The patterns match issuer-specific shapes rather than anything resembling a
 * high-entropy string, which keeps false positives rare enough for every match
 * to be worth treating as critical.
 */
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

/**
 * Collects the files worth scanning for secrets.
 *
 * Dependency, build, and VCS directories are skipped, and files above the size
 * limit are left out, since they are almost always assets or bundles rather
 * than hand-written source.
 *
 * @param rootDir - Project directory being scanned.
 * @param directory - Directory to walk; defaults to the project root and is
 * used for recursion.
 * @returns Absolute paths of every file to scan.
 */
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

/**
 * Scans one file for every known credential format.
 *
 * Findings carry a file and line so they can be located, and a fingerprint so
 * the same credential is recognisable across runs. The matched value itself is
 * never included in the finding.
 *
 * @param rootDir - Project directory, used to make paths project-relative.
 * @param filePath - Absolute path of the file to scan.
 * @returns One finding per match, or an empty array when the file cannot be
 * read as text.
 */
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

/**
 * Checks the project's files for hard-coded credentials.
 *
 * This scans the working tree as it is on disk, not Git history, so a secret
 * that was committed and later removed is not reported here.
 */
export const secretsCheck: Check = {
	id: 'secrets',
	name: 'Secret detection',
	category: 'security',

	/**
	 * Scans every eligible file in the project, concurrently.
	 *
	 * @param context - Project directory and details.
	 * @returns One finding per credential found, located by file and line.
	 */
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

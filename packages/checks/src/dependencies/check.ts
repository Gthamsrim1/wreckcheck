import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Check, Finding, ScanContext, Severity } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';
import { getInstalledVersion } from './npm.js';

const execFileAsync = promisify(execFile);

interface NpmVulnerability {
	severity?: string;
	isDirect?: boolean;
	via?: Array<
		| string
		| {
				title?: string;
				severity?: string;
				url?: string;
				range?: string;
				cwe?: string[];
		  }
	>;
	fixAvailable?:
		| boolean
		| {
				name?: string;
				version?: string;
				isSemVerMajor?: boolean;
		  };
	range?: string;
	nodes?: string[];
}

interface NpmAuditResult {
	vulnerabilities?: Record<string, NpmVulnerability>;
}

interface AuditVulnerability {
	title?: string;
	severity?: string;
	url?: string;
	range?: string;
	fixAvailable?: boolean;
}

interface PnpmAuditResult {
	advisories?: Record<string, AuditVulnerability>;
}

function mapSeverity(severity: string | undefined): Severity {
	switch (severity?.toLowerCase()) {
		case 'critical':
			return 'critical';
		case 'high':
			return 'high';
		case 'moderate':
		case 'medium':
			return 'medium';
		case 'low':
			return 'low';
		default:
			return 'info';
	}
}

async function runAudit(
	command: string,
	args: string[],
	rootDir: string,
): Promise<string | undefined> {
	try {
		const { stdout, stderr } = await execFileAsync(command, args, {
			cwd: rootDir,
			maxBuffer: 10 * 1024 * 1024,
		});

		return stdout || stderr;
	} catch (error) {
		const result = error as {
			stdout?: string;
			stderr?: string;
		};

		return result.stdout || result.stderr;
	}
}

async function parseNpmAudit(
	output: string,
	rootDir: string,
): Promise<Finding[]> {
	let audit: NpmAuditResult;

	try {
		audit = JSON.parse(output) as NpmAuditResult;
	} catch {
		return [];
	}

	const findings: Finding[] = [];

	for (const [packageName, vulnerability] of Object.entries(
		audit.vulnerabilities ?? {},
	)) {
		const severity = mapSeverity(vulnerability.severity);

		const advisory = vulnerability.via?.find(
			(
				item,
			): item is {
				title?: string;
				severity?: string;
				url?: string;
				range?: string;
				cwe?: string[];
			} => typeof item !== 'string',
		);

		const fixedVersion =
			typeof vulnerability.fixAvailable === 'object'
				? vulnerability.fixAvailable.version
				: undefined;

		const direct = vulnerability.isDirect ?? false;

		const installedVersion = await getInstalledVersion(rootDir, packageName);

		const packageInfo = {
			name: packageName,
			direct,
			...(installedVersion !== undefined && { installedVersion }),
			...(fixedVersion !== undefined && { fixedVersion }),
		};

		findings.push({
			id: findingIds.dependencyVulnerability,
			severity,
			category: 'dependencies',
			title: `${packageName} has a known vulnerability`,
			description:
				advisory?.title ??
				`A known ${vulnerability.severity ?? 'security'} vulnerability affects ${packageName}.`,
			recommendation: fixedVersion
				? `Upgrade ${packageName} to ${fixedVersion} or later.`
				: vulnerability.fixAvailable
					? `Upgrade ${packageName} to a secure version.`
					: 'Review the vulnerability and determine an appropriate remediation.',
			package: packageInfo,
			...(advisory?.url ? { references: [advisory.url] } : {}),
		});
	}

	return findings;
}

function parsePnpmAudit(output: string): Finding[] {
	let audit: PnpmAuditResult;

	try {
		audit = JSON.parse(output) as PnpmAuditResult;
	} catch {
		return [];
	}

	return Object.entries(audit.advisories ?? {}).map(([_, advisory]) => ({
		id: findingIds.dependencyVulnerability,
		severity: mapSeverity(advisory.severity),
		category: 'dependencies' as const,
		title: advisory.title ?? 'Known dependency vulnerability',
		description:
			advisory.range ??
			'A known vulnerability affects a dependency in this project.',
		recommendation: advisory.fixAvailable
			? 'Upgrade the affected dependency to a secure version.'
			: 'Review the vulnerability and determine an appropriate remediation.',
	}));
}

export const dependenciesCheck: Check = {
	id: 'dependencies',
	name: 'Dependency vulnerabilities',
	category: 'dependencies',

	async run(context: ScanContext): Promise<Finding[]> {
		switch (context.project.packageManager) {
			case 'npm': {
				const output = await runAudit(
					'npm',
					['audit', '--json'],
					context.rootDir,
				);

				return output ? await parseNpmAudit(output, context.rootDir) : [];
			}

			case 'pnpm': {
				const output = await runAudit(
					'pnpm',
					['audit', '--json'],
					context.rootDir,
				);

				return output ? parsePnpmAudit(output) : [];
			}

			default:
				return [];
		}
	},
};

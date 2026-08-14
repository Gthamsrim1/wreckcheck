/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
	Check,
	CheckResult,
	Finding,
	ScanContext,
	Severity,
} from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';
import { getInstalledVersion } from './npm.js';

const execFileAsync = promisify(execFile);

/** A single entry from `npm audit --json`. */
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

/** The `npm audit --json` payload, keyed by package name. */
interface NpmAuditResult {
	vulnerabilities?: Record<string, NpmVulnerability>;
}

/** A single advisory from `pnpm audit --json`. */
interface AuditVulnerability {
	title?: string;
	severity?: string;
	url?: string;
	range?: string;
	fixAvailable?: boolean;
}

/** The `pnpm audit --json` payload, keyed by advisory ID. */
interface PnpmAuditResult {
	advisories?: Record<string, AuditVulnerability>;
}

/**
 * Translates an audit severity into a WreckCheck one.
 *
 * @param severity - Severity string from the audit tool.
 * @returns The matching severity, or `info` for anything unrecognised.
 */
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

/**
 * Runs an audit command and returns whatever it printed.
 *
 * Audit tools exit non-zero when they find vulnerabilities, which is the
 * interesting case, so a failed exit is not treated as an error and its output
 * is still returned.
 *
 * @param command - Audit executable, such as `npm`.
 * @param args - Arguments passed to the executable.
 * @param rootDir - Project directory to audit.
 * @returns The captured stdout, falling back to stderr, or `undefined` when
 * the command produced nothing.
 */
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

/**
 * Turns `npm audit` output into findings.
 *
 * Each vulnerable package becomes one finding, enriched with the version the
 * lockfile installs and the version that fixes it where npm reports one.
 *
 * @param output - Raw JSON printed by `npm audit --json`.
 * @param rootDir - Project directory, used to resolve installed versions.
 * @returns One finding per vulnerable package, or an empty array when the
 * output is not valid JSON.
 */
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

/**
 * Turns `pnpm audit` output into findings.
 *
 * pnpm reports advisories rather than packages, and does not say which version
 * is installed, so these findings carry no package details.
 *
 * @param output - Raw JSON printed by `pnpm audit --json`.
 * @returns One finding per advisory, or an empty array when the output is not
 * valid JSON.
 */
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

/**
 * Checks a project's dependencies for known vulnerabilities.
 *
 * The audit is delegated to the project's own package manager, so it reports
 * exactly what that toolchain would.
 */
export const dependenciesCheck: Check = {
	id: 'dependencies',
	name: 'Dependency vulnerabilities',
	category: 'dependencies',

	/**
	 * Audits the project with npm or pnpm, whichever it uses.
	 *
	 * @param context - Project directory and details.
	 * @returns One finding per vulnerability, or none for yarn and bun
	 * projects, which are not audited yet.
	 */
	async run(context: ScanContext): Promise<CheckResult> {
		const start = performance.now();
		let findings: Finding[] = [];

		switch (context.project.packageManager) {
			case 'npm': {
				const output = await runAudit(
					'npm',
					['audit', '--json'],
					context.rootDir,
				);

				findings = output ? await parseNpmAudit(output, context.rootDir) : [];

				break;
			}

			case 'pnpm': {
				const output = await runAudit(
					'pnpm',
					['audit', '--json'],
					context.rootDir,
				);

				findings = output ? parsePnpmAudit(output) : [];

				break;
			}

			default:
				break;
		}

		return {
			status: 'passed',
			findings,
			duration: performance.now() - start,
		};
	},
};

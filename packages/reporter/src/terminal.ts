/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type {
	Finding,
	RiskLevel,
	ScanResult,
	Severity,
	WreckCheckConfig,
} from '@wreckcheck/core';
import {
	calculateScore,
	getActiveFindings,
	getRiskLevel,
} from '@wreckcheck/core';
import pc from 'picocolors';

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

/**
 * Renders a severity as a coloured heading.
 *
 * @param severity - Severity to render.
 * @returns The label, coloured by how urgent it is.
 */
function formatSeverity(severity: Severity): string {
	switch (severity) {
		case 'critical':
			return pc.bgRed(pc.white(' CRITICAL '));
		case 'high':
			return pc.red('HIGH');
		case 'medium':
			return pc.yellow('MEDIUM');
		case 'low':
			return pc.cyan('LOW');
		case 'info':
			return pc.dim('INFO');
	}
}

/**
 * Renders one finding as an indented block.
 *
 * Location, package details, and recommendation are each included only when
 * the finding carries them.
 *
 * @param finding - Finding to render.
 * @returns The block, as newline-joined lines.
 */
function formatFinding(finding: Finding): string {
	const location = finding.file
		? `${finding.file}${finding.line ? `:${finding.line}` : ''}`
		: undefined;

	const lines = [`  ${pc.red('✖')} ${finding.title}`];

	if (location) {
		lines.push(`    ${pc.dim(location)}`);
	}

	lines.push('');
	lines.push(`    ${finding.description}`);

	if (finding.package) {
		lines.push('');

		lines.push(
			`    ${pc.dim('Dependency')}  ${finding.package.direct ? 'direct' : 'transitive'}`,
		);

		if (finding.package.installedVersion) {
			lines.push(
				`    ${pc.dim('Installed')}    ${finding.package.installedVersion}`,
			);
		}

		if (finding.package.fixedVersion) {
			lines.push(
				`    ${pc.dim('Fixed')}        ${finding.package.fixedVersion}`,
			);
		}
	}

	if (finding.recommendation) {
		lines.push('');
		lines.push(`    ${pc.dim('→')} ${finding.recommendation}`);
	}

	return lines.join('\n');
}

/**
 * Renders the release verdict as a coloured line.
 *
 * @param riskLevel - Risk level from {@link getRiskLevel}.
 * @returns The verdict, coloured green, yellow, or red.
 */
function formatRiskLevel(riskLevel: RiskLevel): string {
	switch (riskLevel) {
		case 'safe':
			return pc.green('✓ SAFE TO SHIP');

		case 'review':
			return pc.yellow('⚠ REVIEW BEFORE SHIPPING');

		case 'risky':
			return pc.yellow('⚠ HIGH RISK');

		case 'blocked':
			return pc.red('✖ BLOCKED');
	}
}

/**
 * Buckets findings by severity so they can be printed in sections.
 *
 * @param findings - Findings to group.
 * @returns Findings keyed by severity, each bucket in its original order.
 */
function groupFindings(findings: Finding[]): Map<Severity, Finding[]> {
	const groups = new Map<Severity, Finding[]>();

	for (const finding of findings) {
		const existing = groups.get(finding.severity) ?? [];
		existing.push(finding);
		groups.set(finding.severity, existing);
	}

	return groups;
}

/**
 * Renders the ship-readiness score, coloured by how good it is.
 *
 * @param score - Score from {@link calculateScore}.
 * @returns The score as `n / 100`, in green, yellow, or red.
 */
function formatScore(score: number): string {
	if (score >= 90) {
		return pc.green(`${score} / 100`);
	}

	if (score >= 70) {
		return pc.yellow(`${score} / 100`);
	}

	return pc.red(`${score} / 100`);
}

/**
 * Renders a full scan report for the terminal.
 *
 * The report leads with the project and its ship-readiness verdict, then lists
 * active findings grouped by severity, most severe first. Findings the policy
 * ignores are listed separately at the end rather than hidden, so a suppressed
 * issue stays visible to whoever is reading.
 *
 * @param result - The scan to render.
 * @param config - Config whose policy decides what is ignored.
 * @returns The report, as newline-joined lines with ANSI colour.
 */
export function renderTerminal(
	result: ScanResult,
	config: WreckCheckConfig,
): string {
	const { project, findings, verification, duration } = result;
	const { policy } = config;

	const activeFindings = policy
		? getActiveFindings(findings, policy)
		: findings;

	const ignoredFindings = policy
		? findings.filter((finding) => policy.ignore.includes(finding.id))
		: [];

	const score = calculateScore(activeFindings);
	const riskLevel = getRiskLevel(activeFindings);
	const groups = groupFindings(activeFindings);

	const output: string[] = [];

	output.push('');
	output.push(pc.bold('  WRECKCHECK'));
	output.push(pc.dim('  Find what will wreck your release.'));
	output.push('');

	output.push(pc.bold('  PROJECT'));
	output.push(pc.dim('  ────────────────────────────────────────────'));
	output.push(`  ${project.rootDir}`);
	output.push(`  Language       ${project.language}`);
	output.push(`  Framework      ${project.framework ?? 'Unknown'}`);
	output.push(`  Package        ${project.packageManager ?? 'Unknown'}`);
	output.push(
		`  Docker         ${project.hasDocker ? pc.green('✓') : pc.dim('✗')}`,
	);
	output.push(
		`  Git            ${project.hasGit ? pc.green('✓') : pc.dim('✗')}`,
	);
	output.push('');

	if (config.path) {
		output.push('');
		output.push(pc.bold('  CONFIGURATION'));
		output.push(pc.dim('  ────────────────────────────────────────────'));

		output.push(`  Config         ${config.path}`);

		output.push(`  Fail on        ${policy.failOn}`);

		output.push(
			`  Ignored        ${policy.ignore.length} finding${
				policy.ignore.length === 1 ? '' : 's'
			}`,
		);
	}

	if (verification.length > 0) {
		output.push(pc.bold('  VERIFICATION'));
		output.push(pc.dim('  ────────────────────────────────────────────'));
		output.push('');

		for (const command of verification) {
			const failed = command.timedOut || command.exitCode !== 0;

			output.push(
				`  ${failed ? pc.red('✖') : pc.green('✓')} ${command.display}`,
			);

			if (failed && command.timedOut) {
				output.push(`    ${pc.dim('Timed out')}`);
			} else if (failed) {
				output.push(`    ${pc.dim(`Exited with code ${command.exitCode}`)}`);
			}
		}

		output.push('');
	}

	output.push(pc.bold('  SHIP READINESS'));
	output.push('');
	output.push(`             ${pc.bold(formatScore(score))}`);
	output.push('');
	output.push(`             ${formatRiskLevel(riskLevel)}`);
	output.push('');

	if (activeFindings.length === 0) {
		output.push(pc.green('  ✓ No active issues found'));
	} else {
		output.push(
			`  ${pc.yellow('⚠')} ${activeFindings.length} active issue${
				activeFindings.length === 1 ? '' : 's'
			}${
				ignoredFindings.length
					? pc.dim(` · ${ignoredFindings.length} ignored`)
					: ''
			}`,
		);
		output.push('');

		for (const severity of severityOrder) {
			const severityFindings = groups.get(severity);

			if (!severityFindings?.length) {
				continue;
			}

			output.push(`  ${formatSeverity(severity)}`);
			output.push('');

			for (const finding of severityFindings) {
				output.push(formatFinding(finding));
				output.push('');
			}
		}
	}

	if (ignoredFindings.length > 0) {
		output.push('');
		output.push(pc.bold('  IGNORED'));
		output.push(pc.dim('  ────────────────────────────────────────────'));
		output.push('');

		for (const finding of ignoredFindings) {
			output.push(`  ${pc.dim('○')} ${finding.title}`);
			output.push(`    ${pc.dim(finding.id)}`);
			output.push(`    ${pc.dim('Ignored by .wreckcheck.yml')}`);
			output.push('');
		}
	}

	const issueSummary =
		`${activeFindings.length} active issue${
			activeFindings.length === 1 ? '' : 's'
		}` +
		(ignoredFindings.length > 0 ? ` · ${ignoredFindings.length} ignored` : '');

	output.push(pc.dim('  ────────────────────────────────────────────'));

	output.push(pc.dim(`  ${issueSummary} · ${Math.round(duration)}ms`));

	output.push('');

	return output.join('\n');
}

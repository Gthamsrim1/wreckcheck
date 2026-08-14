/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Finding, Severity } from './checks/types.js';

const severityPenalty: Record<Severity, number> = {
	critical: 15,
	high: 8,
	medium: 4,
	low: 1,
	info: 0,
};

const severityCap: Record<Severity, number> = {
	critical: 40,
	high: 65,
	medium: 85,
	low: 98,
	info: 100,
};

const severityRank: Record<Severity, number> = {
	critical: 5,
	high: 4,
	medium: 3,
	low: 2,
	info: 1,
};

/** How risky a release is, as a single verdict. */
export type RiskLevel = 'safe' | 'review' | 'risky' | 'blocked';

/**
 * Finds the most severe finding in a list.
 *
 * @param findings - Findings to compare.
 * @returns The highest severity present, or `info` when the list is empty.
 */
function findHighestSeverity(findings: Finding[]): Severity {
	return findings.reduce(
		(highest, finding) =>
			severityRank[finding.severity] > severityRank[highest]
				? finding.severity
				: highest,
		'info' as Severity,
	);
}

/**
 * Scores how ready a project is to ship, from 0 to 100.
 *
 * Each finding subtracts a penalty weighted by severity. The most severe
 * finding also caps the score, so a single critical issue keeps the project
 * below 40 no matter how clean the rest of the scan is.
 *
 * @param findings - Active findings; ignored ones should be filtered out first
 * with {@link core/src/policy.getActiveFindings | getActiveFindings}.
 * @returns A score from 0 to 100, where 100 means nothing was found.
 */
export function calculateScore(findings: Finding[]): number {
	if (findings.length === 0) {
		return 100;
	}

	const highestSeverity = findHighestSeverity(findings);

	const penalty = findings.reduce(
		(total, finding) => total + severityPenalty[finding.severity],
		0,
	);

	return Math.max(0, Math.min(severityCap[highestSeverity], 100 - penalty));
}

/**
 * Turns findings into a one-word verdict on the release.
 *
 * The verdict follows the most severe finding: critical is `blocked`, high is
 * `risky`, medium is `review`, and anything less is `safe`.
 *
 * @param findings - Active findings; ignored ones should be filtered out first
 * with {@link core/src/policy.getActiveFindings | getActiveFindings}.
 * @returns The risk level for the release.
 */
export function getRiskLevel(findings: Finding[]): RiskLevel {
	if (findings.some((finding) => finding.severity === 'critical')) {
		return 'blocked';
	}

	if (findings.some((finding) => finding.severity === 'high')) {
		return 'risky';
	}

	if (findings.some((finding) => finding.severity === 'medium')) {
		return 'review';
	}

	return 'safe';
}

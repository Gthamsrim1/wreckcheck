/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Finding, Severity } from './checks/types.js';

/** Rules that decide which findings matter and when a scan fails. */
export interface Policy {
	/** Lowest severity that fails the scan. */
	failOn: Severity;
	/** Finding IDs to report but not act on. */
	ignore: string[];
}

const severityRank: Record<Severity, number> = {
	info: 1,
	low: 2,
	medium: 3,
	high: 4,
	critical: 5,
};

/** Policy used when a project has no config file: fail only on critical findings. */
export const DEFAULT_POLICY: Policy = {
	failOn: 'critical',
	ignore: [],
};

/**
 * Drops the findings the policy ignores.
 *
 * @param findings - Every finding the scan produced.
 * @param policy - Policy holding the ignore list.
 * @returns The findings whose IDs are not ignored. These are what the score,
 * risk level, and exit code are based on.
 */
export function getActiveFindings(
	findings: Finding[],
	policy: Policy,
): Finding[] {
	return findings.filter((finding) => !policy.ignore.includes(finding.id));
}

/**
 * Decides whether a scan should fail the build.
 *
 * @param findings - Every finding the scan produced; ignored ones are skipped.
 * @param policy - Policy holding the `failOn` threshold.
 * @returns `true` when any active finding is at least as severe as `failOn`.
 */
export function shouldFail(findings: Finding[], policy: Policy): boolean {
	const threshold = severityRank[policy.failOn];

	return getActiveFindings(findings, policy).some(
		(finding) => severityRank[finding.severity] >= threshold,
	);
}

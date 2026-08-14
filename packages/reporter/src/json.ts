/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { ScanResult, WreckCheckConfig } from '@wreckcheck/core';

import {
	calculateScore,
	getActiveFindings,
	getRiskLevel,
} from '@wreckcheck/core';

/**
 * Renders a scan as JSON for machines to consume.
 *
 * Ignored findings are reported separately from active ones rather than
 * dropped, so a consumer can see what the policy suppressed. The score and
 * risk level are derived from the active findings only.
 *
 * @param result - The scan to render.
 * @param config - Config whose policy decides what is ignored.
 * @returns Pretty-printed JSON.
 */
export function renderJson(
	result: ScanResult,
	config: WreckCheckConfig,
): string {
	const { policy } = config;

	const activeFindings = getActiveFindings(result.findings, policy);

	const ignoredFindings = result.findings.filter((finding) =>
		policy.ignore.includes(finding.id),
	);

	const score = calculateScore(activeFindings);

	const riskLevel = getRiskLevel(activeFindings);

	return JSON.stringify(
		{
			project: result.project,
			config,
			score,
			riskLevel,
			verification: result.verification.map((command) => ({
				command: command.display,
				exitCode: command.exitCode,
				timedOut: command.timedOut,
				...(command.output ? { output: command.output } : {}),
			})),
			findings: {
				active: activeFindings,
				ignored: ignoredFindings,
			},
			duration: Math.round(result.duration),
		},
		null,
		2,
	);
}

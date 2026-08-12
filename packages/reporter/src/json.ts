import type { ScanResult, WreckCheckConfig } from '@wreckcheck/core';

import {
	calculateScore,
	getActiveFindings,
	getRiskLevel,
} from '@wreckcheck/core';

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

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
			findings: {
				active: activeFindings,
				ignored: ignoredFindings,
			},
			verification: result.verification ?? [],
			duration: Math.round(result.duration),
		},
		null,
		2,
	);
}

import type { Policy, ScanResult } from '@wreckcheck/core';

import {
	calculateScore,
	getActiveFindings,
	getRiskLevel,
} from '@wreckcheck/core';

export function renderJson(result: ScanResult, policy?: Policy): string {
	const activeFindings = policy
		? getActiveFindings(result.findings, policy)
		: result.findings;

	const ignoredFindings = policy
		? result.findings.filter((finding) => policy.ignore.includes(finding.id))
		: [];
	const score = calculateScore(activeFindings);

	const riskLevel = getRiskLevel(activeFindings);

	return JSON.stringify(
		{
			project: result.project,
			...(policy ? { policy } : {}),
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

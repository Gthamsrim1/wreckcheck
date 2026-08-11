import type { Finding, Severity } from './checks/types.js';

export interface Policy {
	failOn: Severity;
	ignore: string[];
}

const severityRank: Record<Severity, number> = {
	info: 1,
	low: 2,
	medium: 3,
	high: 4,
	critical: 5,
};

export const DEFAULT_POLICY: Policy = {
	failOn: 'critical',
	ignore: [],
};

export function getActiveFindings(
	findings: Finding[],
	policy: Policy,
): Finding[] {
	return findings.filter((finding) => !policy.ignore.includes(finding.id));
}

export function shouldFail(findings: Finding[], policy: Policy): boolean {
	const threshold = severityRank[policy.failOn];

	return getActiveFindings(findings, policy).some(
		(finding) => severityRank[finding.severity] >= threshold,
	);
}

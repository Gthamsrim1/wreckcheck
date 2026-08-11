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

export type RiskLevel = 'safe' | 'review' | 'risky' | 'blocked';

function findHighestSeverity(findings: Finding[]): Severity {
	return findings.reduce(
		(highest, finding) =>
			severityRank[finding.severity] > severityRank[highest]
				? finding.severity
				: highest,
		'info' as Severity,
	);
}

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

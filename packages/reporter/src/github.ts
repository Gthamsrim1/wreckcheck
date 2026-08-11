import type { Finding } from '@wreckcheck/core';

export function renderGithubSummary(findings: Finding[]): string {
	if (findings.length === 0) {
		return ['## WreckCheck Report', '', 'No issues found.'].join('\n');
	}

	const lines = [
		'## WreckCheck Report',
		'',
		`Found ${findings.length} issue${findings.length === 1 ? '' : 's'}.`,
		'',
	];

	for (const finding of findings) {
		lines.push(`### ${finding.severity.toUpperCase()}: ${finding.title}`);

		if (finding.file) {
			lines.push(
				`Location: \`${finding.file}${
					finding.line ? `:${finding.line}` : ''
				}\``,
			);
		}

		lines.push('');
		lines.push(finding.description);

		if (finding.recommendation) {
			lines.push('');
			lines.push(`Recommendation: ${finding.recommendation}`);
		}

		lines.push('');
	}

	return lines.join('\n');
}

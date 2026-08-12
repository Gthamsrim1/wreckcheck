import type { ScanResult } from '@wreckcheck/core';

export function renderGithubSummary(result: ScanResult): string {
	const { findings, verification } = result;

	if (findings.length === 0 && verification.length === 0) {
		return ['## WreckCheck Report', '', 'No issues found.'].join('\n');
	}

	const lines = ['## WreckCheck Report', ''];

	if (verification.length > 0) {
		lines.push('### Verification', '');

		for (const command of verification) {
			const failed = command.timedOut || command.exitCode !== 0;

			lines.push(`${failed ? '❌' : '✅'} \`${command.display}\``);
		}

		lines.push('');
	}

	if (findings.length === 0) {
		lines.push('No issues found.');
		return lines.join('\n');
	}

	lines.push(
		`Found ${findings.length} issue${findings.length === 1 ? '' : 's'}.`,
	);
	lines.push('');

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

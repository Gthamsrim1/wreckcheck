import * as fs from 'node:fs/promises';
import * as core from '@actions/core';
import { checks } from '@wreckcheck/checks';
import { scan } from '@wreckcheck/core';
import { renderGithubSummary } from '@wreckcheck/reporter';

const severityRank = {
	info: 0,
	low: 1,
	medium: 2,
	high: 3,
	critical: 4,
} as const;

type Severity = keyof typeof severityRank;

function isSeverity(value: string): value is Severity {
	return value in severityRank;
}

async function writeSummary(content: string): Promise<void> {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;

	if (!summaryPath) {
		await fs.writeFile('wreckcheck-summary.md', content, 'utf8');

		core.info(
			'GitHub summary file not available. Written to wreckcheck-summary.md',
		);

		return;
	}

	await core.summary.addRaw(content).write();
}

async function run(): Promise<void> {
	try {
		const verifyInput = core.getInput('verify');

		const verify = verifyInput === '' ? false : core.getBooleanInput('verify');

		const failOnInput = core.getInput('fail-on') || 'critical';

		const failOn: Severity = isSeverity(failOnInput) ? failOnInput : 'critical';

		core.startGroup('Running WreckCheck');

		const result = await scan(process.cwd(), checks, {
			verify,
		});

		core.endGroup();

		const findings = result.findings;

		await writeSummary(renderGithubSummary(findings));

		core.startGroup('Findings');

		for (const finding of findings) {
			core.error(`${finding.title}: ${finding.description}`, {
				...(finding.file
					? {
							file: finding.file,
						}
					: {}),
				...(finding.line !== undefined
					? {
							startLine: finding.line,
						}
					: {}),
			});
		}

		core.endGroup();

		const shouldFail = findings.some(
			(finding) => severityRank[finding.severity] >= severityRank[failOn],
		);

		if (shouldFail) {
			core.setFailed(
				`WreckCheck failed: ${failOn} or higher severity issue detected.`,
			);

			return;
		}

		core.info(
			`WreckCheck passed: ${findings.length} issue${
				findings.length === 1 ? '' : 's'
			} found.`,
		);
	} catch (error) {
		core.setFailed(error instanceof Error ? error.message : String(error));
	}
}

void run();

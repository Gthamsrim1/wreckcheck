import * as fs from 'node:fs/promises';
import * as core from '@actions/core';

import { checks } from '@wreckcheck/checks';
import { loadConfig, scan, shouldFail } from '@wreckcheck/core';
import { renderGithubSummary, renderSarif } from '@wreckcheck/reporter';

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

async function writeSarif(content: string, workspace: string): Promise<void> {
	const sarifPath =
		process.env.WRECKCHECK_SARIF ?? `${workspace}/wreckcheck-results.sarif`;

	await fs.writeFile(sarifPath, content, 'utf8');

	core.info(`SARIF written to ${sarifPath}`);
}

async function run(): Promise<void> {
	try {
		const verifyInput = core.getInput('verify');

		const verify = verifyInput === '' ? false : core.getBooleanInput('verify');

		const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

		const config = await loadConfig(workspace);

		core.startGroup('Running WreckCheck');

		const result = await scan(workspace, checks, {
			verify,
		});

		core.endGroup();

		const findings = result.findings;

		await writeSummary(renderGithubSummary(findings));

		await writeSarif(renderSarif(findings, config), workspace);

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

		if (shouldFail(findings, config.policy)) {
			core.setFailed(
				`WreckCheck failed: ${config.policy.failOn} or higher severity issue detected.`,
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

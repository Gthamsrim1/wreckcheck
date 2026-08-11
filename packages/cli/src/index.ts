#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { checks } from '@wreckcheck/checks';
import { DEFAULT_POLICY, loadConfig, scan, shouldFail } from '@wreckcheck/core';
import { renderJson, renderSarif, renderTerminal } from '@wreckcheck/reporter';

import { Command } from 'commander';

const program = new Command();

program
	.name('wreckcheck')
	.description('Find what will wreck your release')
	.argument('[directory]', 'Project directory to scan', '.')
	.option('--verify', 'Run project build, lint, and test commands')
	.option('--ci', 'Run in CI mode with machine-readable output')
	.option('--no-config', 'Ignore project configuration file', false)
	.option('--config <file>', 'Use a custom configuration file')
	.option('--sarif <file>', 'Write SARIF output')
	.action(
		async (
			directory: string,
			options: {
				verify?: boolean;
				ci?: boolean;
				config?: string;
				noConfig?: boolean;
				sarif?: string;
			},
		) => {
			const rootDir = path.resolve(directory);

			const config = options.noConfig
				? { policy: DEFAULT_POLICY }
				: await loadConfig(
						rootDir,
						typeof options.config === 'string' ? options.config : undefined,
					);

			const result = await scan(rootDir, checks, {
				verify: options.verify || options.ci || false,
			});

			if (options.sarif) {
				await writeFile(options.sarif, renderSarif(result.findings), 'utf8');
			}

			if (options.ci) {
				console.log(renderJson(result, config));
				if (shouldFail(result.findings, config.policy)) {
					process.exitCode = 1;
				}
				return;
			}

			console.log(renderTerminal(result, config));
		},
	);

await program.parseAsync();

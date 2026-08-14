#!/usr/bin/env node
/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

/**
 * The `wreckcheck` command.
 *
 * Loads the project config, runs every check, and renders the result for
 * either a human or a machine. In CI mode it prints JSON and sets a non-zero
 * exit code when the policy says the findings should fail the build.
 *
 * @packageDocumentation
 */

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
	.option('--skip-config', 'Ignore project configuration file')
	.option('--config <file>', 'Use a custom configuration file')
	.option('--sarif <file>', 'Write SARIF output')
	/**
	 * Scans a directory and reports the result.
	 *
	 * `--verify` and `--ci` both run the project's own build, lint, and test
	 * commands. SARIF is written whenever `--sarif` is given, in either mode.
	 *
	 * @param directory - Project directory to scan, defaulting to the
	 * current one.
	 * @param options - Parsed command-line flags.
	 */
	.action(
		async (
			directory: string,
			options: {
				verify?: boolean;
				ci?: boolean;
				config?: string;
				skipConfig?: boolean;
				sarif?: string;
			},
		) => {
			const rootDir = path.resolve(directory);

			const config = options.skipConfig
				? { policy: DEFAULT_POLICY }
				: await loadConfig(
						rootDir,
						typeof options.config === 'string' ? options.config : undefined,
					);

			const result = await scan(rootDir, checks, {
				verify: options.verify || options.ci || false,
			});

			if (options.sarif) {
				await writeFile(
					options.sarif,
					renderSarif(result.findings, config),
					'utf8',
				);
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

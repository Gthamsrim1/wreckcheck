#!/usr/bin/env node

import path from 'node:path';
import { checks } from '@wreckcheck/checks';

import { loadPolicy, scan, shouldFail } from '@wreckcheck/core';
import { renderJson, renderTerminal } from '@wreckcheck/reporter';
import { Command } from 'commander';

const program = new Command();

program
	.name('wreckcheck')
	.description('Find what will wreck your release')
	.argument('[directory]', 'Project directory to scan', '.')
	.option('--verify', 'Run project build, lint, and test commands')
	.option('--ci', 'Run in CI mode with machine-readable output')
	.action(async (directory: string, options) => {
		const rootDir = path.resolve(directory);

		const result = await scan(rootDir, checks, {
			verify: options.verify || options.ci,
		});

		const policy = await loadPolicy(rootDir);

		if (options.ci) {
			console.log(renderJson(result, policy));

			if (shouldFail(result.findings, policy)) {
				process.exitCode = 1;
			}

			return;
		}

		console.log(renderTerminal(result, policy));
	});

await program.parseAsync();

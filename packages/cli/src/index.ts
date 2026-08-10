#!/usr/bin/env node

import path from 'node:path';
import { Command } from 'commander';

import { scan, loadPolicy, shouldFail } from '@wreckcheck/core';
import { checks } from '@wreckcheck/checks';
import {
  renderJson,
  renderTerminal,
} from '@wreckcheck/reporter';

const program = new Command();

program
  .name('wreckcheck')
  .description('Find what will wreck your release')
  .argument('[directory]', 'Project directory to scan', '.')
  .option(
    '--verify',
    'Run project build, lint, and test commands',
  )
  .option(
    '--ci',
    'Run in CI mode with machine-readable output',
  )
  .action(async (directory: string, options) => {
    const rootDir = path.resolve(directory);

    const result = await scan(
      rootDir,
      checks,
      {
        verify: options.verify || options.ci,
      },
    );

    if (options.ci) {
      const policy = await loadPolicy(rootDir);

      console.log(
        renderJson(result, policy),
      );

      if (shouldFail(result.findings, policy)) {
        process.exitCode = 1;
      }

      return;
    }

    console.log(renderTerminal(result));
  });

await program.parseAsync();
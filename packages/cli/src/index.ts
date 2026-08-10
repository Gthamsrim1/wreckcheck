#!/usr/bin/env node

import path from 'node:path';
import { Command } from 'commander';

import { scan, getRiskLevel } from '@wreckcheck/core';
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

    const output = options.ci
      ? renderJson(result)
      : renderTerminal(result);

    console.log(output);

    if (options.ci) {
      const riskLevel = getRiskLevel(
        result.findings,
      );

      if (riskLevel === 'blocked') {
        process.exitCode = 1;
      }
    }
  });

await program.parseAsync();
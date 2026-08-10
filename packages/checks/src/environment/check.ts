import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  Check,
  Finding,
  ScanContext,
} from '@wreckcheck/core';

import { isIgnored, isTracked } from './git.js';
import { parseEnvFile } from './parser.js';

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const environmentCheck: Check = {
  id: 'environment',
  name: 'Environment configuration',
  category: 'environment',

  async run(context: ScanContext): Promise<Finding[]> {
    const { rootDir } = context;
    const findings: Finding[] = [];

    const envPath = join(rootDir, '.env');
    const examplePath = join(rootDir, '.env.example');

    const hasEnv = await exists(envPath);
    const hasExample = await exists(examplePath);

    if (hasEnv) {
      const tracked = await isTracked(rootDir, '.env');
      const ignored = await isIgnored(rootDir, '.env');

      if (tracked) {
        findings.push({
          id: 'environment-env-tracked',
          severity: 'critical',
          category: 'environment',
          title: '.env is tracked by Git',
          description:
            'The .env file is committed to the repository and may contain secrets.',
          file: '.env',
          recommendation:
            'Remove .env from Git, add it to .gitignore, and rotate any exposed credentials.',
        });
      } else if (!ignored) {
        findings.push({
          id: 'environment-env-not-ignored',
          severity: 'high',
          category: 'environment',
          title: '.env is not ignored by Git',
          description:
            'The .env file exists but is not protected by a Git ignore rule.',
          file: '.env',
          recommendation:
            'Add .env to .gitignore to prevent accidentally committing environment secrets.',
        });
      }
    }

    if (hasEnv && hasExample) {
      const envVariables = await parseEnvFile(envPath);
      const exampleVariables = await parseEnvFile(examplePath);

      const missingFromEnv = [...exampleVariables].filter(
        (variable) => !envVariables.has(variable),
      );

      if (missingFromEnv.length > 0) {
        findings.push({
          id: 'environment-example-mismatch',
          severity: 'medium',
          category: 'environment',
          title: 'Environment configuration is incomplete',
          description: `.env.example contains ${missingFromEnv.length} variable${
            missingFromEnv.length === 1 ? '' : 's'
          } missing from .env: ${missingFromEnv.join(', ')}.`,
          file: '.env.example',
          recommendation:
            'Verify that all required environment variables are configured before deployment.',
        });
      }
    }

    return findings;
  },
};
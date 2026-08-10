import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parse } from 'yaml';

import type { Severity } from './checks/types.js';
import {
  DEFAULT_POLICY,
  type Policy,
} from './policy.js';

const validSeverities: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

export async function loadPolicy(
  rootDir: string,
): Promise<Policy> {
  const configPath = join(
    rootDir,
    '.wreckcheck.yml',
  );

  let contents: string;

  try {
    contents = await readFile(
      configPath,
      'utf8',
    );
  } catch {
    return DEFAULT_POLICY;
  }

  let config: unknown;

  try {
    config = parse(contents);
  } catch {
    throw new Error(
      'Invalid .wreckcheck.yml: failed to parse YAML.',
    );
  }

  if (
    typeof config !== 'object' ||
    config === null
  ) {
    return DEFAULT_POLICY;
  }

  const failOn = (
    config as {
      failOn?: unknown;
    }
  ).failOn;

  if (failOn === undefined) {
    return DEFAULT_POLICY;
  }

  if (
    typeof failOn !== 'string' ||
    !validSeverities.includes(
      failOn as Severity,
    )
  ) {
    throw new Error(
      `Invalid failOn value "${String(
        failOn,
      )}". Expected one of: ${validSeverities.join(
        ', ',
      )}.`,
    );
  }

  return {
    failOn: failOn as Severity,
  };
}
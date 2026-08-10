import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type { Finding } from '@wreckcheck/core';

import { readDockerignore } from '../dockerignore.js';
import type { DockerRule } from './types.js';

const SENSITIVE_DOCKERIGNORE_PATTERNS = [
  '.env',
  '.env.*',
  '.git',
  'node_modules',
];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isExcluded(
  patterns: Set<string>,
  target: string,
): boolean {
  return (
    patterns.has(target) ||
    patterns.has(`${target}/`) ||
    patterns.has(`/${target}`) ||
    patterns.has('**') ||
    patterns.has('*')
  );
}

export const dockerBuildContextRule: DockerRule = async ({
  scan,
  instructions,
}) => {
  const findings: Finding[] = [];

  const dockerignorePath = join(
    scan.rootDir,
    '.dockerignore',
  );

  const hasDockerignore = await exists(dockerignorePath);

  const hasCopyAll = instructions.some(
    (instruction) =>
      instruction.instruction === 'COPY' &&
      instruction.value.trim().startsWith('.'),
  );

  if (!hasCopyAll) {
    return findings;
  }

  if (!hasDockerignore) {
    findings.push({
      id: 'docker-no-dockerignore',
      severity: 'medium',
      category: 'docker',
      title: 'No .dockerignore with COPY .',
      description:
        'The Dockerfile copies the build context without a .dockerignore file.',
      file: 'Dockerfile',
      recommendation:
        'Add a .dockerignore file and exclude secrets, Git metadata, dependencies, and build artifacts.',
    });

    return findings;
  }

  const dockerignore = await readDockerignore(scan.rootDir);

  if (!dockerignore) {
    return findings;
  }

  const missingPatterns =
    SENSITIVE_DOCKERIGNORE_PATTERNS.filter(
      (pattern) => !isExcluded(dockerignore, pattern),
    );

  for (const pattern of missingPatterns) {
    if (pattern === 'node_modules') {
      findings.push({
        id: 'docker-context-node-modules',
        severity: 'low',
        category: 'docker',
        title: 'node_modules is not excluded from build context',
        description:
          'The Dockerfile copies the build context, but node_modules is not excluded by .dockerignore.',
        file: '.dockerignore',
        recommendation:
          'Add node_modules to .dockerignore to reduce the build context and avoid copying host dependencies.',
      });

      continue;
    }

    findings.push({
      id: `docker-context-${pattern.replace(/[^a-z0-9]+/gi, '-')}`,
      severity: pattern === '.git' ? 'medium' : 'high',
      category: 'docker',
      title: 'Sensitive path is not excluded from build context',
      description:
        `${pattern} is not excluded by .dockerignore while the Dockerfile copies the build context.`,
      file: '.dockerignore',
      recommendation:
        `Add ${pattern} to .dockerignore to prevent it from being included in the Docker build context.`,
    });
  }

  return findings;
};
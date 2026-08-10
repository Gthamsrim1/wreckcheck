import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ProjectInfo } from './checks/types.js';

function detectPackageManager(rootDir: string): ProjectInfo['packageManager'] {
  if (existsSync(join(rootDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (existsSync(join(rootDir, 'yarn.lock'))) {
    return 'yarn';
  }

  if (existsSync(join(rootDir, 'bun.lockb')) || existsSync(join(rootDir, 'bun.lock'))) {
    return 'bun';
  }

  if (existsSync(join(rootDir, 'package-lock.json'))) {
    return 'npm';
  }

  return undefined;
}

function detectLanguage(rootDir: string): ProjectInfo['language'] {
  const hasTypeScript =
    existsSync(join(rootDir, 'tsconfig.json')) ||
    existsSync(join(rootDir, 'tsconfig.base.json'));

  const hasJavaScript =
    existsSync(join(rootDir, 'package.json')) ||
    existsSync(join(rootDir, 'jsconfig.json'));

  if (hasTypeScript && hasJavaScript) {
    return 'mixed';
  }

  if (hasTypeScript) {
    return 'typescript';
  }

  if (hasJavaScript) {
    return 'javascript';
  }

  return 'unknown';
}

function detectFramework(rootDir: string): string | undefined {
  const packagePath = join(rootDir, 'package.json');

  if (!existsSync(packagePath)) {
    return undefined;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (dependencies.next) return 'Next.js';
    if (dependencies.react) return 'React';
    if (dependencies.vue) return 'Vue';
    if (dependencies.svelte) return 'Svelte';
    if (dependencies.express) return 'Express';
    if (dependencies.fastify) return 'Fastify';

    return undefined;
  } catch {
    return undefined;
  }
}

export function discoverProject(rootDir: string): ProjectInfo {
  const packageManager = detectPackageManager(rootDir);
  const language = detectLanguage(rootDir);
  const framework = detectFramework(rootDir);

  return {
    rootDir,
    ...(packageManager !== undefined && { packageManager }),
    language,
    ...(framework !== undefined && { framework }),
    hasDocker:
      existsSync(join(rootDir, 'Dockerfile')) ||
      existsSync(join(rootDir, 'docker-compose.yml')) ||
      existsSync(join(rootDir, 'docker-compose.yaml')),
    hasGit: existsSync(join(rootDir, '.git')),
  };
}
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import type {
  ProjectInfo,
  VerificationResult,
} from './checks/types.js';

export async function runVerification(
  rootDir: string,
  project: ProjectInfo,
): Promise<VerificationResult[]> {
  const dependenciesInstalled = await hasInstalledDependencies(
    rootDir,
  );

  if (!dependenciesInstalled) {
    return [
      {
        command: 'dependency check',
        status: 'skipped',
        duration: 0,
        reason:
          'Dependencies are not installed.',
      },
    ];
  }

  const scripts = [
    'lint',
    'test',
    'build',
  ];

  const results: VerificationResult[] = [];

  for (const script of scripts) {
    const result = await runScript(
      rootDir,
      project,
      script,
    );

    if (result === undefined) {
      continue;
    }

    results.push(result);

    if (result.status === 'failed') {
      break;
    }
  }

  return results;
}

async function hasInstalledDependencies(
  rootDir: string,
): Promise<boolean> {
  try {
    await access(join(rootDir, 'node_modules'));
    return true;
  } catch {
    return false;
  }
}

async function runScript(
  rootDir: string,
  project: ProjectInfo,
  script: string,
): Promise<VerificationResult | undefined> {
  const command = getPackageCommand(
    project,
    script,
  );

  if (!command) {
    return undefined;
  }

  const startedAt = performance.now();

  return new Promise((resolve) => {
    const child = spawn(
      command.command,
      command.args,
      {
        cwd: rootDir,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let output = '';

    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.on('error', (error) => {
      resolve({
        command: command.display,
        status: 'failed',
        duration: performance.now() - startedAt,
        output: error.message,
      });
    });

    child.on('close', (code) => {
      resolve({
        command: command.display,
        status: code === 0 ? 'passed' : 'failed',
        duration: performance.now() - startedAt,
        ...(output.trim()
          ? { output }
          : {}),
      });
    });
  });
}

interface PackageCommand {
  command: string;
  args: string[];
  display: string;
}

function getPackageCommand(
  project: ProjectInfo,
  script: string,
): PackageCommand | undefined {
  switch (project.packageManager) {
    case 'npm':
      return {
        command: 'npm',
        args: ['run', script],
        display: `npm run ${script}`,
      };

    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['run', script],
        display: `pnpm run ${script}`,
      };

    case 'yarn':
      return {
        command: 'yarn',
        args: [script],
        display: `yarn ${script}`,
      };

    case 'bun':
      return {
        command: 'bun',
        args: ['run', script],
        display: `bun run ${script}`,
      };

    default:
      return undefined;
  }
}
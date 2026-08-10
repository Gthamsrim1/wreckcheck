import type {
  Check,
  Finding,
  ProjectInfo,
  VerificationResult,
} from './checks/types.js';

import { discoverProject } from './project.js';
import { runVerification } from './verification.js';

export interface ScanResult {
  project: ProjectInfo;
  findings: Finding[];
  verification?: VerificationResult[];
  duration: number;
}

export interface ScanOptions {
  verify?: boolean;
}

export async function scan(
  rootDir: string,
  checks: Check[],
  options: ScanOptions = {},
): Promise<ScanResult> {
  const start = performance.now();

  const project = discoverProject(rootDir);

  const context = {
    rootDir,
    project,
    verify: options.verify ?? false,
  };

  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        return await check.run(context);
      } catch (error) {
        console.error(
          `Check "${check.id}" failed:`,
          error,
        );

        return [];
      }
    }),
  );

  const findings = results.flat();

  const verification = options.verify
    ? await runVerification(
        rootDir,
        project,
      )
    : undefined;

  return {
    project,
    findings,
    ...(verification
      ? { verification }
      : {}),
    duration: performance.now() - start,
  };
}
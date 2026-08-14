/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Check, Finding, ProjectInfo } from './checks/types.js';

import { discoverProject } from './project.js';
import type { CommandResult } from './verification/types.js';

/** Everything a single scan produced. */
export interface ScanResult {
	/** The project the checks ran against. */
	project: ProjectInfo;
	/** Findings from every check, in no particular order. */
	findings: Finding[];
	/** Results of any verification commands that were run. */
	verification: CommandResult[];
	/** Wall-clock time of the scan, in milliseconds. */
	duration: number;
}

/** Options that change what a scan does. */
export interface ScanOptions {
	/** Whether to run the project's own build, lint, and test commands. */
	verify?: boolean;
}

/**
 * Runs every check against a project and collects the results.
 *
 * Checks run concurrently. A check that throws is reported on stderr and
 * contributes no findings rather than failing the whole scan, so one broken
 * check cannot hide the others' results.
 *
 * @param rootDir - Project directory to scan.
 * @param checks - Checks to run.
 * @param options - Scan options, such as whether to verify the project.
 * @returns The discovered project, the combined findings and verification
 * results, and how long the scan took.
 */
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
				console.error(`Check "${check.id}" failed:`, error);
				return {
					status: 'error',
					findings: [],
					verification: [],
					duration: 0,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}),
	);

	const findings = results.flatMap((result) => result.findings);

	const verification = results.flatMap((result) => result.verification ?? []);

	return {
		project,
		findings,
		verification,
		duration: performance.now() - start,
	};
}

import type { Check, Finding, ProjectInfo } from './checks/types.js';

import { discoverProject } from './project.js';
import type { CommandResult } from './verification/types.js';

export interface ScanResult {
	project: ProjectInfo;
	findings: Finding[];
	verification: CommandResult[];
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

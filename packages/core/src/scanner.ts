import type { Check, Finding, ProjectInfo } from './checks/types.js';

import { discoverProject } from './project.js';

export interface ScanResult {
	project: ProjectInfo;
	findings: Finding[];
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
				return [];
			}
		}),
	);

	const findings = results.flat();

	return {
		project,
		findings,
		duration: performance.now() - start,
	};
}

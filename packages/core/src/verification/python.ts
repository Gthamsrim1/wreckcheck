/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { runCommand } from './runner.js';

import type { VerificationAdapter } from './types.js';

/**
 * Reports whether a path exists.
 *
 * @param path - Absolute path to test.
 * @returns `true` when the path is accessible.
 */
async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

/** Verifies Python projects by running pytest. */
export const pythonAdapter: VerificationAdapter = {
	id: 'python',

	/**
	 * Detects a Python project by its pyproject.toml or requirements.txt.
	 *
	 * @param context - Project directory and details.
	 * @returns `true` when either file is present.
	 */
	async detect(context) {
		return (
			(await exists(join(context.rootDir, 'pyproject.toml'))) ||
			(await exists(join(context.rootDir, 'requirements.txt')))
		);
	},

	/**
	 * Runs pytest against the project.
	 *
	 * @param context - Project directory and details.
	 * @returns A single result for the pytest run.
	 */
	async run(context) {
		return [
			await runCommand('pytest', [], {
				cwd: context.rootDir,
				display: 'pytest',
			}),
		];
	},
};

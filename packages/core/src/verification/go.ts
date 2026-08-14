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
async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

/** Verifies Go modules with `go test` followed by `go vet`. */
export const goAdapter: VerificationAdapter = {
	id: 'go',

	/**
	 * Detects a Go module by its go.mod.
	 *
	 * @param context - Project directory and details.
	 * @returns `true` when the project has a go.mod.
	 */
	async detect(context) {
		return exists(join(context.rootDir, 'go.mod'));
	},

	/**
	 * Runs `go test ./...`, then `go vet ./...` only if the tests passed.
	 *
	 * @param context - Project directory and details.
	 * @returns The test result, plus the vet result when the tests passed.
	 */
	async run(context) {
		const results = [];

		const test = await runCommand('go', ['test', './...'], {
			cwd: context.rootDir,
			display: 'go test ./...',
		});

		results.push(test);

		if (test.exitCode !== 0 || test.timedOut) {
			return results;
		}

		const vet = await runCommand('go', ['vet', './...'], {
			cwd: context.rootDir,
			display: 'go vet ./...',
		});

		results.push(vet);

		return results;
	},
};

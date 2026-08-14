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

/** Verifies Cargo projects with `cargo test` followed by `cargo clippy`. */
export const rustAdapter: VerificationAdapter = {
	id: 'rust',

	/**
	 * Detects a Cargo project by its Cargo.toml.
	 *
	 * @param context - Project directory and details.
	 * @returns `true` when the project has a Cargo.toml.
	 */
	async detect(context) {
		return exists(join(context.rootDir, 'Cargo.toml'));
	},

	/**
	 * Runs `cargo test`, then `cargo clippy` only if the tests passed.
	 *
	 * @param context - Project directory and details.
	 * @returns The test result, plus the clippy result when the tests passed.
	 */
	async run(context) {
		const results = [];

		const test = await runCommand('cargo', ['test'], {
			cwd: context.rootDir,
			display: 'cargo test',
		});

		results.push(test);

		if (test.exitCode !== 0 || test.timedOut) {
			return results;
		}

		const clippy = await runCommand('cargo', ['clippy'], {
			cwd: context.rootDir,
			display: 'cargo clippy',
		});

		results.push(clippy);

		return results;
	},
};

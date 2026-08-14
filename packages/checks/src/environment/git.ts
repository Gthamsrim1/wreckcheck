/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Runs a Git command in a project and captures its output.
 *
 * @param rootDir - Project directory to run Git in.
 * @param args - Arguments passed to `git`.
 * @returns The trimmed stdout, or `undefined` when Git exits non-zero or is
 * not available. Callers use that distinction as the answer to a yes/no
 * question, so a missing Git reads as "no".
 */
async function git(
	rootDir: string,
	args: string[],
): Promise<string | undefined> {
	try {
		const { stdout } = await execFileAsync('git', args, {
			cwd: rootDir,
		});

		return stdout.trim();
	} catch {
		return undefined;
	}
}

/**
 * Reports whether Git tracks a file.
 *
 * @param rootDir - Project directory to check in.
 * @param file - Project-relative path of the file.
 * @returns `true` when the file is committed to the repository.
 */
export async function isTracked(
	rootDir: string,
	file: string,
): Promise<boolean> {
	const result = await git(rootDir, [
		'ls-files',
		'--error-unmatch',
		'--',
		file,
	]);

	return result !== undefined;
}

/**
 * Reports whether a file is covered by a Git ignore rule.
 *
 * @param rootDir - Project directory to check in.
 * @param file - Project-relative path of the file.
 * @returns `true` when an ignore rule matches the file.
 */
export async function isIgnored(
	rootDir: string,
	file: string,
): Promise<boolean> {
	const result = await git(rootDir, ['check-ignore', '--quiet', '--', file]);

	return result !== undefined;
}

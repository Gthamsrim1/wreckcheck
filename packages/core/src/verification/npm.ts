/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runCommand } from './runner.js';
import type {
	CommandResult,
	VerificationAdapter,
	VerificationContext,
} from './types.js';

/** The part of package.json this adapter reads. */
interface PackageJson {
	/** Scripts defined by the project. */
	scripts?: Record<string, string>;
}

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

/**
 * Reads the scripts a project defines.
 *
 * @param rootDir - Project directory holding package.json.
 * @returns The scripts, or an empty object when package.json is missing,
 * unreadable, or defines none.
 */
async function readScripts(rootDir: string): Promise<Record<string, string>> {
	try {
		const content = await readFile(join(rootDir, 'package.json'), 'utf8');

		const packageJson = JSON.parse(content) as PackageJson;

		return packageJson.scripts ?? {};
	} catch {
		return {};
	}
}

/**
 * Builds the command that runs a script under a given package manager.
 *
 * @param manager - Package manager detected for the project.
 * @param script - Name of the script to run, such as `test`.
 * @returns The executable, its arguments, and the command as shown to the
 * user, or `undefined` for an unknown package manager.
 */
function getCommand(manager: string | undefined, script: string) {
	switch (manager) {
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

/**
 * Verifies Node.js projects by running their lint, test, and build scripts.
 *
 * Scripts run in that order and stop at the first failure, so the earliest
 * problem is the one reported.
 */
export const npmAdapter: VerificationAdapter = {
	id: 'npm',

	/**
	 * Detects a Node.js project by its package.json.
	 *
	 * @param context - Project directory and details.
	 * @returns `true` when the project has a package.json.
	 */
	async detect(context: VerificationContext) {
		return await exists(join(context.rootDir, 'package.json'));
	},

	/**
	 * Runs the lint, test, and build scripts the project actually defines.
	 *
	 * @param context - Project directory and details.
	 * @returns One result per script that ran, stopping after the first
	 * failure or timeout.
	 */
	async run(context: VerificationContext): Promise<CommandResult[]> {
		const scripts = await readScripts(context.rootDir);

		const results: CommandResult[] = [];

		for (const script of ['lint', 'test', 'build']) {
			if (!scripts[script]) {
				continue;
			}

			const command = getCommand(
				context.project.packageManager ?? 'npm',
				script,
			);

			if (!command) {
				continue;
			}

			const result = await runCommand(command.command, command.args, {
				cwd: context.rootDir,
				display: command.display,
			});

			results.push(result);

			if (result.exitCode !== 0 || result.timedOut) {
				break;
			}
		}

		return results;
	},
};

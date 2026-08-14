/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { spawn } from 'node:child_process';

import type { CommandResult } from './types.js';

const DEFAULT_TIMEOUT = 2 * 60 * 1000;
const KILL_GRACE_PERIOD = 5000;
const MAX_OUTPUT_LENGTH = 12000;

/** How to run a single verification command. */
interface RunCommandOptions {
	/** Directory to run the command in. */
	cwd: string;
	/** The command as shown to the user. */
	display: string;
	/** Time limit in milliseconds. Defaults to two minutes. */
	timeout?: number;
}

/**
 * Runs a command and captures its output, without letting it hang the scan.
 *
 * The command is spawned without a shell, so arguments are never interpreted
 * by one. On timeout the whole process group is sent SIGTERM and then SIGKILL
 * after a grace period, so child processes cannot outlive the scan. This never
 * rejects: a command that fails to start resolves with a `null` exit code.
 *
 * @param command - Executable to run.
 * @param args - Arguments passed to the executable.
 * @param options - Working directory, display name, and time limit.
 * @returns The exit code, captured output, duration, and whether it timed out.
 */
export async function runCommand(
	command: string,
	args: string[],
	options: RunCommandOptions,
): Promise<CommandResult> {
	const startedAt = performance.now();

	return new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			shell: false,
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: process.platform !== 'win32',
		});

		let output = '';
		let timedOut = false;
		let finished = false;

		const timeout = options.timeout ?? DEFAULT_TIMEOUT;

		const timer = setTimeout(() => {
			if (finished) {
				return;
			}

			timedOut = true;

			killProcessTree(child);

			setTimeout(() => {
				if (finished) {
					return;
				}

				killProcessTree(child, true);
			}, KILL_GRACE_PERIOD);
		}, timeout);

		child.stdout.on('data', (chunk: Buffer) => {
			output += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer) => {
			output += chunk.toString();
		});

		child.once('error', (error) => {
			if (finished) {
				return;
			}

			finished = true;
			clearTimeout(timer);

			resolve({
				command,
				display: options.display,
				exitCode: null,
				output: truncateOutput(
					timedOut
						? `${output}\n\nCommand timed out: ${error.message}`
						: error.message,
				),
				duration: performance.now() - startedAt,
				timedOut,
			});
		});

		child.once('close', (code) => {
			if (finished) {
				return;
			}

			finished = true;
			clearTimeout(timer);

			resolve({
				command,
				display: options.display,
				exitCode: timedOut ? null : code,
				output: truncateOutput(
					timedOut
						? `${output}\n\nCommand timed out after ${timeout / 1000} seconds.`
						: output,
				),
				duration: performance.now() - startedAt,
				timedOut,
			});
		});
	});
}

/**
 * Terminates a spawned command along with anything it started.
 *
 * The command is detached on POSIX so it leads its own process group, which is
 * signalled as a whole; killing only the direct child would leave test runners
 * and dev servers behind. Windows has no process groups, so the child is
 * signalled directly.
 *
 * @param child - The spawned process to terminate.
 * @param force - Send SIGKILL instead of SIGTERM.
 */
function killProcessTree(child: ReturnType<typeof spawn>, force = false): void {
	if (child.pid === undefined) {
		return;
	}

	if (process.platform === 'win32') {
		child.kill(force ? 'SIGKILL' : 'SIGTERM');
		return;
	}

	try {
		process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM');
	} catch {
		try {
			child.kill(force ? 'SIGKILL' : 'SIGTERM');
		} catch {
			// Nothing left to terminate.
		}
	}
}

/**
 * Keeps command output small enough to put in a report.
 *
 * Output longer than the limit is cut from the middle, keeping the head and
 * tail, since the useful parts of a failure are usually the command that ran
 * and the error it ended with.
 *
 * @param output - Raw combined stdout and stderr.
 * @returns The trimmed output, or `undefined` when the command printed nothing.
 */
function truncateOutput(output: string): string | undefined {
	const trimmed = output.trim();

	if (!trimmed) {
		return undefined;
	}

	if (trimmed.length <= MAX_OUTPUT_LENGTH) {
		return trimmed;
	}

	const half = Math.floor(MAX_OUTPUT_LENGTH / 2);

	return [
		trimmed.slice(0, half),
		'',
		'... output truncated ...',
		'',
		trimmed.slice(-half),
	].join('\n');
}

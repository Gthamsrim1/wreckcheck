import { spawn } from 'node:child_process';

import type { CommandResult } from './types.js';

const DEFAULT_TIMEOUT = 2 * 60 * 1000;
const KILL_GRACE_PERIOD = 5000;
const MAX_OUTPUT_LENGTH = 12000;

interface RunCommandOptions {
	cwd: string;
	display: string;
	timeout?: number;
}

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

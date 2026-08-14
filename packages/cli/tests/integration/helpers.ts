/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export async function createTempProject(): Promise<string> {
	return mkdtemp(path.join(tmpdir(), 'wreckcheck-test-'));
}

export async function removeTempProject(rootDir: string): Promise<void> {
	await rm(rootDir, {
		recursive: true,
		force: true,
	});
}

export async function runCli(
	rootDir: string,
	args: string[] = [],
): Promise<CliResult> {
	const cliPath = path.resolve(process.cwd(), 'dist/index.js');

	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [cliPath, rootDir, ...args], {
			cwd: process.cwd(),
			env: {
				...process.env,
				FORCE_COLOR: '0',
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', reject);

		child.on('close', (code) => {
			resolve({
				stdout,
				stderr,
				exitCode: code ?? 1,
			});
		});
	});
}

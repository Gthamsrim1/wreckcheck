/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { readFile, writeFile } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { createTempProject, removeTempProject, runCli } from './helpers.js';

describe('SARIF output', () => {
	let projectDir: string;

	afterEach(async () => {
		if (projectDir) {
			await removeTempProject(projectDir);
		}
	});

	it('writes valid SARIF output', async () => {
		projectDir = await createTempProject();

		const awsKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');

		await writeFile(`${projectDir}/config.js`, `const key = "${awsKey}";`);

		const sarifPath = `${projectDir}/wreckcheck.sarif`;

		const result = await runCli(projectDir, ['--sarif', sarifPath]);

		expect(result.exitCode).toBe(0);

		const contents = await readFile(sarifPath, 'utf8');
		const sarif = JSON.parse(contents) as {
			version: string;
			runs: unknown[];
		};

		expect(sarif.version).toBe('2.1.0');
		expect(sarif.runs).toHaveLength(1);
	});
});

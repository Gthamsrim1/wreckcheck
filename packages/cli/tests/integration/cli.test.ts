/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { mkdir, writeFile } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { createTempProject, removeTempProject, runCli } from './helpers.js';

describe('WreckCheck CLI', () => {
	let projectDir: string;

	afterEach(async () => {
		if (projectDir) {
			await removeTempProject(projectDir);
		}
	});

	it('scans a project successfully', async () => {
		projectDir = await createTempProject();

		await mkdir(`${projectDir}/.git`);

		const result = await runCli(projectDir);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('WRECKCHECK');
		expect(result.stdout).toContain('SHIP READINESS');
	});

	it('supports --ci', async () => {
		projectDir = await createTempProject();

		const result = await runCli(projectDir, ['--ci']);

		expect(result.stdout).toContain('"project"');
		expect(result.stdout).toContain('"findings"');
		expect(result.stdout).toContain('"score"');
	});

	it('supports --skip-config', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/.wreckcheck.yml`,
			`failOn: high
ignore:
  - docker:floating-base-image
`,
		);

		const result = await runCli(projectDir, ['--skip-config']);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).not.toContain('Ignored by');
	});

	it('supports a custom config file', async () => {
		projectDir = await createTempProject();

		const configPath = `${projectDir}/custom.yml`;

		await writeFile(
			configPath,
			`failOn: low
`,
		);

		const result = await runCli(projectDir, ['--config', configPath]);

		expect(result.stdout).toContain('Fail on');
		expect(result.stdout).toContain('low');
	});
});

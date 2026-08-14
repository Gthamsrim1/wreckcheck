/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { writeFile } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { createTempProject, removeTempProject, runCli } from './helpers.js';

describe('configuration', () => {
	let projectDir: string;

	afterEach(async () => {
		if (projectDir) {
			await removeTempProject(projectDir);
		}
	});

	it('loads .wreckcheck.yml automatically', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/.wreckcheck.yml`,
			`failOn: high
`,
		);

		const result = await runCli(projectDir);

		expect(result.stdout).toContain('Fail on');
		expect(result.stdout).toContain('high');
	});

	it('ignores configuration with --skip-config', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/.wreckcheck.yml`,
			`failOn: high
`,
		);

		const result = await runCli(projectDir, ['--skip-config']);

		expect(result.stdout).not.toContain('.wreckcheck.yml');
	});

	it('loads an explicitly supplied config', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/custom.yml`,
			`failOn: low
`,
		);

		const result = await runCli(projectDir, [
			'--config',
			`${projectDir}/custom.yml`,
		]);

		expect(result.stdout).toContain('low');
	});

	it('rejects an invalid failOn value', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/.wreckcheck.yml`,
			`failOn: banana
`,
		);

		const result = await runCli(projectDir);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain('Invalid failOn');
	});
});

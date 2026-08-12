import { writeFile } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { createTempProject, removeTempProject, runCli } from './helpers.js';

describe('security checks', () => {
	let projectDir: string;

	afterEach(async () => {
		if (projectDir) {
			await removeTempProject(projectDir);
		}
	});

	it('detects an AWS access key pattern', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/config.js`,
			`const key = "AKIAIOSFODNN7EXAMPLE";`,
		);

		const result = await runCli(projectDir, ['--ci']);

		expect(result.exitCode).not.toBe(0);
		expect(result.stdout).toContain('"id": "security:aws-access-key"');
	});
});

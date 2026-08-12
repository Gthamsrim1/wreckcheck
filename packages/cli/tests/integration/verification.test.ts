import { mkdir, writeFile } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { createTempProject, removeTempProject, runCli } from './helpers.js';

describe('verification', () => {
	let projectDir: string;

	afterEach(async () => {
		if (projectDir) {
			await removeTempProject(projectDir);
		}
	});

	it('runs npm verification commands', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/package.json`,
			JSON.stringify({
				name: 'verification-test',
				scripts: {
					lint: 'echo lint-pass',
					test: 'echo test-pass',
					build: 'echo build-pass',
				},
			}),
		);

		await mkdir(`${projectDir}/node_modules`);

		const result = await runCli(projectDir, ['--verify']);

		expect(result.stdout).toContain('npm run lint');
		expect(result.stdout).toContain('npm run test');
		expect(result.stdout).toContain('npm run build');
	});

	it('stops verification after a failed command', async () => {
		projectDir = await createTempProject();

		await writeFile(
			`${projectDir}/package.json`,
			JSON.stringify({
				name: 'verification-test',
				scripts: {
					lint: 'echo lint-pass',
					test: 'exit 1',
					build: 'echo build-should-not-run',
				},
			}),
		);

		await mkdir(`${projectDir}/node_modules`);

		const result = await runCli(projectDir, ['--verify']);

		expect(result.stdout).toContain('npm run test');
		expect(result.stdout).not.toContain('build-should-not-run');
	});

	it('stops after timeout');
});

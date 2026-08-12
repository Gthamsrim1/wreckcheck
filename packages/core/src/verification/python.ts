import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { runCommand } from './runner.js';

import type { VerificationAdapter } from './types.js';

async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export const pythonAdapter: VerificationAdapter = {
	id: 'python',

	async detect(context) {
		return (
			(await exists(join(context.rootDir, 'pyproject.toml'))) ||
			(await exists(join(context.rootDir, 'requirements.txt')))
		);
	},

	async run(context) {
		return [
			await runCommand('pytest', [], {
				cwd: context.rootDir,
				display: 'pytest',
			}),
		];
	},
};

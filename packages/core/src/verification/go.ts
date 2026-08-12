import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { runCommand } from './runner.js';

import type { VerificationAdapter } from './types.js';

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export const goAdapter: VerificationAdapter = {
	id: 'go',

	async detect(context) {
		return exists(join(context.rootDir, 'go.mod'));
	},

	async run(context) {
		const results = [];

		const test = await runCommand('go', ['test', './...'], {
			cwd: context.rootDir,
			display: 'go test ./...',
		});

		results.push(test);

		if (test.exitCode !== 0 || test.timedOut) {
			return results;
		}

		const vet = await runCommand('go', ['vet', './...'], {
			cwd: context.rootDir,
			display: 'go vet ./...',
		});

		results.push(vet);

		return results;
	},
};

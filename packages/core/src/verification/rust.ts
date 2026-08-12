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

export const rustAdapter: VerificationAdapter = {
	id: 'rust',

	async detect(context) {
		return exists(join(context.rootDir, 'Cargo.toml'));
	},

	async run(context) {
		const results = [];

		const test = await runCommand('cargo', ['test'], {
			cwd: context.rootDir,
			display: 'cargo test',
		});

		results.push(test);

		if (test.exitCode !== 0 || test.timedOut) {
			return results;
		}

		const clippy = await runCommand('cargo', ['clippy'], {
			cwd: context.rootDir,
			display: 'cargo clippy',
		});

		results.push(clippy);

		return results;
	},
};

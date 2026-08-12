import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runCommand } from './runner.js';
import type {
	CommandResult,
	VerificationAdapter,
	VerificationContext,
} from './types.js';

interface PackageJson {
	scripts?: Record<string, string>;
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function readScripts(rootDir: string): Promise<Record<string, string>> {
	try {
		const content = await readFile(join(rootDir, 'package.json'), 'utf8');

		const packageJson = JSON.parse(content) as PackageJson;

		return packageJson.scripts ?? {};
	} catch {
		return {};
	}
}

function getCommand(manager: string | undefined, script: string) {
	switch (manager) {
		case 'npm':
			return {
				command: 'npm',
				args: ['run', script],
				display: `npm run ${script}`,
			};

		case 'pnpm':
			return {
				command: 'pnpm',
				args: ['run', script],
				display: `pnpm run ${script}`,
			};

		case 'yarn':
			return {
				command: 'yarn',
				args: [script],
				display: `yarn ${script}`,
			};

		case 'bun':
			return {
				command: 'bun',
				args: ['run', script],
				display: `bun run ${script}`,
			};

		default:
			return undefined;
	}
}

export const npmAdapter: VerificationAdapter = {
	id: 'npm',

	async detect(context: VerificationContext) {
		return await exists(join(context.rootDir, 'package.json'));
	},

	async run(context: VerificationContext): Promise<CommandResult[]> {
		const scripts = await readScripts(context.rootDir);

		const results: CommandResult[] = [];

		for (const script of ['lint', 'test', 'build']) {
			if (!scripts[script]) {
				continue;
			}

			const command = getCommand(context.project.packageManager, script);

			if (!command) {
				continue;
			}

			const result = await runCommand(command.command, command.args, {
				cwd: context.rootDir,
				display: command.display,
			});

			results.push(result);

			if (result.exitCode !== 0 || result.timedOut) {
				break;
			}
		}

		return results;
	},
};

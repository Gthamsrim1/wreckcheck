import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function git(
	rootDir: string,
	args: string[],
): Promise<string | undefined> {
	try {
		const { stdout } = await execFileAsync('git', args, {
			cwd: rootDir,
		});

		return stdout.trim();
	} catch {
		return undefined;
	}
}

export async function isTracked(
	rootDir: string,
	file: string,
): Promise<boolean> {
	const result = await git(rootDir, [
		'ls-files',
		'--error-unmatch',
		'--',
		file,
	]);

	return result !== undefined;
}

export async function isIgnored(
	rootDir: string,
	file: string,
): Promise<boolean> {
	const result = await git(rootDir, ['check-ignore', '--quiet', '--', file]);

	return result !== undefined;
}

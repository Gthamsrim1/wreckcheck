import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface PackageLock {
	packages?: Record<
		string,
		{
			version?: string;
		}
	>;
}

export async function getInstalledVersion(
	rootDir: string,
	packageName: string,
): Promise<string | undefined> {
	try {
		const content = await readFile(join(rootDir, 'package-lock.json'), 'utf8');

		const lockfile = JSON.parse(content) as PackageLock;

		const entry = lockfile.packages?.[`node_modules/${packageName}`];

		return entry?.version;
	} catch {
		return undefined;
	}
}

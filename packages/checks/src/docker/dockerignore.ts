import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function readDockerignore(
	rootDir: string,
): Promise<Set<string> | undefined> {
	try {
		const content = await readFile(join(rootDir, '.dockerignore'), 'utf8');

		const patterns = new Set<string>();

		for (const line of content.split(/\r?\n/)) {
			const trimmed = line.trim();

			if (!trimmed || trimmed.startsWith('#')) {
				continue;
			}

			patterns.add(trimmed);
		}

		return patterns;
	} catch {
		return undefined;
	}
}

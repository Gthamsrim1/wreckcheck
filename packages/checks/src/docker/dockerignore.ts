/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Reads the patterns a project's `.dockerignore` declares.
 *
 * Comments and blank lines are dropped; patterns are returned verbatim rather
 * than expanded, so callers compare them literally.
 *
 * @param rootDir - Project directory holding the `.dockerignore`.
 * @returns The patterns, or `undefined` when there is no `.dockerignore`.
 */
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

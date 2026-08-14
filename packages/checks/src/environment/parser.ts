/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { readFile } from 'node:fs/promises';

/**
 * Collects the variable names declared in a dotenv file.
 *
 * Only names are read, never values, so comparing a `.env` against a
 * `.env.example` never puts a secret in memory. Comments, blank lines, and
 * `export` prefixes are handled.
 *
 * @param filePath - Absolute path of the dotenv file to read.
 * @returns The variable names the file declares.
 * @throws Error If the file cannot be read.
 */
export async function parseEnvFile(filePath: string): Promise<Set<string>> {
	const content = await readFile(filePath, 'utf8');
	const variables = new Set<string>();

	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);

		if (match?.[1]) {
			variables.add(match[1]);
		}
	}

	return variables;
}

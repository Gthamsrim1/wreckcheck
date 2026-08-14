/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The part of package.json the build check reads. */
export interface PackageJson {
	/** Scripts defined by the project. */
	scripts?: Record<string, string>;
	/** The `packageManager` field, when the project pins one. */
	packageManager?: string;
}

/**
 * Reads a project's package.json.
 *
 * @param rootDir - Project directory to read from.
 * @returns The parsed package.json, or `undefined` when it is missing or not
 * valid JSON.
 */
export async function readPackageJson(
	rootDir: string,
): Promise<PackageJson | undefined> {
	try {
		const content = await readFile(join(rootDir, 'package.json'), 'utf8');

		return JSON.parse(content) as PackageJson;
	} catch {
		return undefined;
	}
}

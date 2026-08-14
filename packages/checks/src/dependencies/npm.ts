/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The part of package-lock.json this module reads. */
interface PackageLock {
	packages?: Record<
		string,
		{
			version?: string;
		}
	>;
}

/**
 * Looks up which version of a package the lockfile installs.
 *
 * `npm audit` reports the affected version range rather than what is actually
 * installed, so the lockfile is consulted to make findings concrete.
 *
 * @param rootDir - Project directory holding package-lock.json.
 * @param packageName - Package to look up.
 * @returns The installed version, or `undefined` when the lockfile is missing,
 * unreadable, or does not contain the package.
 */
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

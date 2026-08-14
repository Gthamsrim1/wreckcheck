/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { ProjectInfo } from '../checks/types.js';
import { goAdapter } from './go.js';
import { npmAdapter } from './npm.js';
import { pythonAdapter } from './python.js';
import { rustAdapter } from './rust.js';
import type { CommandResult, VerificationContext } from './types.js';

const adapters = [npmAdapter, goAdapter, rustAdapter, pythonAdapter];

/**
 * Runs the project's own build, lint, and test commands.
 *
 * Adapters are tried in order and only the first one that recognises the
 * project runs, so a repository with both a package.json and a go.mod is
 * verified as an npm project.
 *
 * @param context - Project directory and details.
 * @returns One result per command that ran, or an empty array when no adapter
 * recognises the project.
 */
export async function runVerification(context: {
	rootDir: string;
	project: ProjectInfo;
}): Promise<CommandResult[]> {
	const verificationContext: VerificationContext = {
		rootDir: context.rootDir,
		project: context.project,
		ci: process.env.CI === 'true',
	};

	for (const adapter of adapters) {
		if (await adapter.detect(verificationContext)) {
			return adapter.run(verificationContext);
		}
	}

	return [];
}

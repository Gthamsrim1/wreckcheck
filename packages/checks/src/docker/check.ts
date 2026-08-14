/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Check, CheckResult } from '@wreckcheck/core';

import { parseDockerfile } from './parser.js';
import { dockerBaseImageRule } from './rules/base-image.js';
import { dockerBuildContextRule } from './rules/build-context.js';
import { dockerSecretsRule } from './rules/secrets.js';
import { dockerUserRule } from './rules/user.js';

/**
 * Reports whether a path exists.
 *
 * @param path - Absolute path to test.
 * @returns `true` when the path is accessible.
 */
async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

const rules = [
	dockerSecretsRule,
	dockerUserRule,
	dockerBaseImageRule,
	dockerBuildContextRule,
];

/**
 * Checks a project's Dockerfile for issues that reach production images.
 *
 * The Dockerfile is parsed once and handed to every rule, so the rules work
 * from a shared view of the file rather than re-reading it.
 */
export const dockerCheck: Check = {
	id: 'docker',
	name: 'Docker configuration',
	category: 'docker',

	/**
	 * Parses the Dockerfile and runs every Docker rule against it.
	 *
	 * @param context - Project directory and details.
	 * @returns The rules' combined findings, or an `error` result when the
	 * project has no Dockerfile.
	 */
	async run(context): Promise<CheckResult> {
		const dockerfilePath = join(context.rootDir, 'Dockerfile');
		const start = performance.now();

		if (!(await exists(dockerfilePath))) {
			return {
				status: 'error',
				findings: [],
				duration: 0,
				error: "Filepath doesn't exist",
			};
		}

		const dockerfile = await readFile(dockerfilePath, 'utf8');

		const instructions = parseDockerfile(dockerfile);

		const ruleContext = {
			scan: context,
			instructions,
			dockerfile,
		};

		const results = await Promise.all(rules.map((rule) => rule(ruleContext)));
		const findings = results.flat();

		return { status: 'passed', findings, duration: performance.now() - start };
	},
};

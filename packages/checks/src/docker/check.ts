import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Check, CheckResult } from '@wreckcheck/core';

import { parseDockerfile } from './parser.js';
import { dockerBaseImageRule } from './rules/base-image.js';
import { dockerBuildContextRule } from './rules/build-context.js';
import { dockerSecretsRule } from './rules/secrets.js';
import { dockerUserRule } from './rules/user.js';

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

export const dockerCheck: Check = {
	id: 'docker',
	name: 'Docker configuration',
	category: 'docker',

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

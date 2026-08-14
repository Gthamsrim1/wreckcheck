/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type { Finding } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';

import { readDockerignore } from '../dockerignore.js';
import type { DockerRule } from './types.js';

const SENSITIVE_DOCKERIGNORE_PATTERNS = [
	'.env',
	'.env.*',
	'.git',
	'node_modules',
];

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

/**
 * Reports whether `.dockerignore` excludes a path.
 *
 * Matching covers the common ways the same path is written, plus the catch-all
 * patterns that exclude everything by default.
 *
 * @param patterns - Patterns declared in `.dockerignore`.
 * @param target - Path to test, such as `.env`.
 * @returns `true` when a pattern excludes the path.
 */
function isExcluded(patterns: Set<string>, target: string): boolean {
	return (
		patterns.has(target) ||
		patterns.has(`${target}/`) ||
		patterns.has(`/${target}`) ||
		patterns.has('**') ||
		patterns.has('*')
	);
}

/**
 * Flags sensitive paths that a `COPY .` would pull into the image.
 *
 * The rule only applies to Dockerfiles that copy the build context: without a
 * `COPY .`, what `.dockerignore` excludes does not affect the image. When one
 * is present, a missing `.dockerignore` is reported on its own, since every
 * sensitive path would follow from it.
 *
 * @param context - The parsed Dockerfile and the surrounding scan.
 * @returns A finding for a missing `.dockerignore`, or one per sensitive path
 * it fails to exclude.
 */
export const dockerBuildContextRule: DockerRule = async ({
	scan,
	instructions,
}) => {
	const findings: Finding[] = [];

	const dockerignorePath = join(scan.rootDir, '.dockerignore');

	const hasDockerignore = await exists(dockerignorePath);

	const hasCopyAll = instructions.some(
		(instruction) =>
			instruction.instruction === 'COPY' &&
			instruction.value.trim().startsWith('.'),
	);

	if (!hasCopyAll) {
		return findings;
	}

	if (!hasDockerignore) {
		findings.push({
			id: findingIds.dockerNoDockerignore,
			severity: 'medium',
			category: 'docker',
			title: 'No .dockerignore with COPY .',
			description:
				'The Dockerfile copies the build context without a .dockerignore file.',
			file: 'Dockerfile',
			recommendation:
				'Add a .dockerignore file and exclude secrets, Git metadata, dependencies, and build artifacts.',
		});

		return findings;
	}

	const dockerignore = await readDockerignore(scan.rootDir);

	if (!dockerignore) {
		return findings;
	}

	const missingPatterns = SENSITIVE_DOCKERIGNORE_PATTERNS.filter(
		(pattern) => !isExcluded(dockerignore, pattern),
	);

	for (const pattern of missingPatterns) {
		let id: string;
		let severity: Finding['severity'];

		switch (pattern) {
			case '.env':
				id = findingIds.dockerSensitiveEnv;
				severity = 'high';
				break;

			case '.env.*':
				id = findingIds.dockerSensitiveEnvWildcard;
				severity = 'high';
				break;

			case '.git':
				id = findingIds.dockerSensitiveGit;
				severity = 'medium';
				break;

			case 'node_modules':
				id = findingIds.dockerSensitiveNodeModules;
				severity = 'low';
				break;

			default:
				continue;
		}

		if (pattern === 'node_modules') {
			findings.push({
				id,
				severity,
				category: 'docker',
				title: 'node_modules is not excluded from build context',
				description:
					'The Dockerfile copies the build context, but node_modules is not excluded by .dockerignore.',
				file: '.dockerignore',
				recommendation:
					'Add node_modules to .dockerignore to reduce the build context and avoid copying host dependencies.',
			});

			continue;
		}

		findings.push({
			id,
			severity,
			category: 'docker',
			title: 'Sensitive path is not excluded from build context',
			description: `${pattern} is not excluded by .dockerignore while the Dockerfile copies the build context.`,
			file: '.dockerignore',
			recommendation: `Add ${pattern} to .dockerignore to prevent it from being included in the Docker build context.`,
		});
	}

	return findings;
};

/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ProjectInfo } from './checks/types.js';

/**
 * Identifies the package manager from the lockfile in the project root.
 *
 * @param rootDir - Project directory to inspect.
 * @returns The package manager, or `undefined` when no lockfile is present.
 */
function detectPackageManager(rootDir: string): ProjectInfo['packageManager'] {
	if (existsSync(join(rootDir, 'pnpm-lock.yaml'))) {
		return 'pnpm';
	}

	if (existsSync(join(rootDir, 'yarn.lock'))) {
		return 'yarn';
	}

	if (
		existsSync(join(rootDir, 'bun.lockb')) ||
		existsSync(join(rootDir, 'bun.lock'))
	) {
		return 'bun';
	}

	if (existsSync(join(rootDir, 'package-lock.json'))) {
		return 'npm';
	}

	return undefined;
}

/**
 * Infers the project language from the config files in the root.
 *
 * @param rootDir - Project directory to inspect.
 * @returns `mixed` when both TypeScript and JavaScript config are present, the
 * single language when only one is, and `unknown` when neither is.
 */
function detectLanguage(rootDir: string): ProjectInfo['language'] {
	const hasTypeScript =
		existsSync(join(rootDir, 'tsconfig.json')) ||
		existsSync(join(rootDir, 'tsconfig.base.json'));

	const hasJavaScript =
		existsSync(join(rootDir, 'package.json')) ||
		existsSync(join(rootDir, 'jsconfig.json'));

	if (hasTypeScript && hasJavaScript) {
		return 'mixed';
	}

	if (hasTypeScript) {
		return 'typescript';
	}

	if (hasJavaScript) {
		return 'javascript';
	}

	return 'unknown';
}

/**
 * Names the framework a project is built on, based on its dependencies.
 *
 * Only the first match is reported, so a Next.js project is labelled Next.js
 * rather than React.
 *
 * @param rootDir - Project directory to inspect.
 * @returns The framework name, or `undefined` when package.json is missing,
 * unreadable, or names no known framework.
 */
function detectFramework(rootDir: string): string | undefined {
	const packagePath = join(rootDir, 'package.json');

	if (!existsSync(packagePath)) {
		return undefined;
	}

	try {
		const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

		const dependencies = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		if (dependencies.next) return 'Next.js';
		if (dependencies.react) return 'React';
		if (dependencies.vue) return 'Vue';
		if (dependencies.svelte) return 'Svelte';
		if (dependencies.express) return 'Express';
		if (dependencies.fastify) return 'Fastify';

		return undefined;
	} catch {
		return undefined;
	}
}

/**
 * Works out what kind of project sits in a directory.
 *
 * Runs before the checks so each one can adapt to the project: the dependency
 * check picks its audit command from the package manager, for example. All
 * detection is filesystem-based and synchronous.
 *
 * @param rootDir - Project directory to inspect.
 * @returns Language, package manager, framework, and whether the project uses
 * Docker and Git.
 */
export function discoverProject(rootDir: string): ProjectInfo {
	const packageManager = detectPackageManager(rootDir);
	const language = detectLanguage(rootDir);
	const framework = detectFramework(rootDir);

	return {
		rootDir,
		...(packageManager !== undefined && { packageManager }),
		language,
		...(framework !== undefined && { framework }),
		hasDocker:
			existsSync(join(rootDir, 'Dockerfile')) ||
			existsSync(join(rootDir, 'docker-compose.yml')) ||
			existsSync(join(rootDir, 'docker-compose.yaml')),
		hasGit: existsSync(join(rootDir, '.git')),
	};
}

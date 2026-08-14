/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Check, CheckResult, Finding } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';
import { readPackageJson } from './package-json.js';

/**
 * Checks that a project defines the scripts a release pipeline needs.
 *
 * A missing build or test script means nothing produces or validates the
 * artifact being shipped; a missing lint script is reported more gently.
 */
export const buildCheck: Check = {
	id: 'build',
	name: 'Build configuration',
	category: 'build',

	/**
	 * Reports the build, test, and lint scripts the project does not define.
	 *
	 * @param context - Project directory and details.
	 * @returns One finding per missing script, or an `error` result when the
	 * project has no package.json.
	 */
	async run(context): Promise<CheckResult> {
		const packageJson = await readPackageJson(context.rootDir);

		if (!packageJson) {
			return {
				status: 'error',
				findings: [],
				duration: 0,
				error: "package.json doesn't exist",
			};
		}

		const scripts = packageJson.scripts ?? {};
		const start = performance.now();
		const findings: Finding[] = [];

		if (!scripts.build) {
			findings.push({
				id: findingIds.missingBuildScript,
				severity: 'medium',
				category: 'build',
				title: 'No build script configured',
				description: 'package.json does not define a build script.',
				file: 'package.json',
				recommendation:
					'Add a build script that produces the application artifact used for deployment.',
			});
		}

		if (!scripts.test) {
			findings.push({
				id: findingIds.missingTestScript,
				severity: 'medium',
				category: 'build',
				title: 'No test script configured',
				description: 'package.json does not define a test script.',
				file: 'package.json',
				recommendation:
					'Add a test script so automated checks can verify the project before release.',
			});
		}

		if (!scripts.lint) {
			findings.push({
				id: findingIds.missingLintScript,
				severity: 'low',
				category: 'build',
				title: 'No lint script configured',
				description: 'package.json does not define a lint script.',
				file: 'package.json',
				recommendation:
					'Add a lint script to catch code-quality and correctness issues before release.',
			});
		}

		return { status: 'passed', findings, duration: performance.now() - start };
	},
};

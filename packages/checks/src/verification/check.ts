/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Check, CheckResult } from '@wreckcheck/core';
import { findingIds, runVerification } from '@wreckcheck/core';

/**
 * Checks that the project's own build, lint, and test commands still pass.
 *
 * Unlike the other checks, this one executes project code, which is why it is
 * gated behind `--verify` and CI mode.
 */
export const verificationCheck: Check = {
	id: 'verification',
	name: 'Project verification',
	category: 'verification',

	/**
	 * Runs the project's verification commands and reports the failures.
	 *
	 * @param context - Project directory and details.
	 * @returns A finding per command that failed or timed out, plus every
	 * command result for reporters to display.
	 */
	async run(context): Promise<CheckResult> {
		const results = await runVerification(context);
		const start = performance.now();

		return {
			status: 'passed',
			findings: results
				.filter((result) => result.exitCode !== 0 || result.timedOut)
				.map((result) => ({
					id: result.timedOut
						? findingIds.verificationCommandTimedOut
						: findingIds.verificationCommandFailed,
					severity: 'high',
					category: 'verification',
					title: result.timedOut
						? 'Verification command timed out'
						: 'Verification command failed',
					description: result.timedOut
						? `${result.display} exceeded the allowed execution time.`
						: `${result.display} exited with code ${result.exitCode}.`,
					recommendation: 'Fix verification failures before releasing.',
					...(result.output
						? {
								evidence: result.output,
							}
						: {}),
				})),
			duration: performance.now() - start,
			verification: results,
		};
	},
};

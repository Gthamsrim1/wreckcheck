import type { Check, CheckResult } from '@wreckcheck/core';
import { findingIds, runVerification } from '@wreckcheck/core';

export const verificationCheck: Check = {
	id: 'verification',
	name: 'Project verification',
	category: 'verification',

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

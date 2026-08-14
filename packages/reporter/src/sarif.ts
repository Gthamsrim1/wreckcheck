/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Finding, WreckCheckConfig } from '@wreckcheck/core';

/** Where a SARIF result points in the codebase. */
interface SarifLocation {
	physicalLocation: {
		artifactLocation: {
			uri: string;
		};
		region?: {
			startLine: number;
		};
	};
}

/**
 * Translates a severity into the levels SARIF defines.
 *
 * SARIF has three levels where WreckCheck has five, so critical and high both
 * become `error`, and low and info both become `note`.
 *
 * @param severity - Severity of the finding.
 * @returns The matching SARIF level.
 */
function mapLevel(severity: Finding['severity']): 'error' | 'warning' | 'note' {
	switch (severity) {
		case 'critical':
		case 'high':
			return 'error';

		case 'medium':
			return 'warning';

		default:
			return 'note';
	}
}

/**
 * Builds the SARIF location for a finding.
 *
 * @param finding - Finding to locate.
 * @returns The location, or `undefined` for findings that are about the
 * project as a whole rather than a file.
 */
function createLocation(finding: Finding): SarifLocation {
	return {
		physicalLocation: {
			artifactLocation: {
				uri: finding.file ?? '.',
			},
			...(finding.line !== undefined
				? {
						region: {
							startLine: finding.line,
						},
					}
				: {}),
		},
	};
}

/**
 * Renders findings as SARIF 2.1.0, for GitHub code scanning and similar tools.
 *
 * Findings that share an ID are collapsed into one rule, and each finding
 * becomes a result referencing it. Unlike the other reporters, this one takes
 * findings directly and applies no policy filtering.
 *
 * @param findings - Findings to include in the report.
 * @param config - Config recorded on the run, so the report says which
 * configuration produced it.
 * @returns Pretty-printed SARIF JSON.
 */
export function renderSarif(
	findings: Finding[],
	config?: WreckCheckConfig,
): string {
	const rules = [
		...new Map(
			findings.map((finding) => [
				finding.id,
				{
					id: finding.id,
					shortDescription: {
						text: finding.title,
					},
					fullDescription: {
						text: finding.description,
					},
					help: finding.recommendation
						? {
								text: finding.recommendation,
							}
						: undefined,
				},
			]),
		).values(),
	];

	const results = findings.map((finding) => ({
		ruleId: finding.id,

		level: mapLevel(finding.severity),

		message: {
			text: finding.description,
		},

		locations: [createLocation(finding)],
	}));

	return JSON.stringify(
		{
			version: '2.1.0',

			$schema: 'https://json.schemastore.org/sarif-2.1.0.json',

			runs: [
				{
					tool: {
						driver: {
							name: 'WreckCheck',

							version: '0.1.0',

							informationUri: 'https://github.com/Gthamsrim1/wreckcheck',

							rules,
						},
					},

					invocations: [
						{
							executionSuccessful: true,
							properties: {
								config: config?.path ?? 'default',
							},
						},
					],

					results,
				},
			],
		},
		null,
		2,
	);
}

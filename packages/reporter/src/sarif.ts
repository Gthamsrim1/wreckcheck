import type { Finding, WreckCheckConfig } from '@wreckcheck/core';

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

function createLocation(finding: Finding): SarifLocation | undefined {
	if (!finding.file) {
		return undefined;
	}

	return {
		physicalLocation: {
			artifactLocation: {
				uri: finding.file,
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

	const results = findings.map((finding) => {
		const location = createLocation(finding);

		return {
			ruleId: finding.id,

			level: mapLevel(finding.severity),

			message: {
				text: finding.description,
			},

			...(location
				? {
						locations: [location],
					}
				: {}),
		};
	});

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

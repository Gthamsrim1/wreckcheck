import type { Finding } from '@wreckcheck/core';

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

export function renderSarif(findings: Finding[]): string {
	return JSON.stringify(
		{
			version: '2.1.0',
			$schema: 'https://json.schemastore.org/sarif-2.1.0.json',

			runs: [
				{
					tool: {
						driver: {
							name: 'WreckCheck',
							informationUri: 'https://github.com/Gthamsrim1/wreckcheck',
							rules: findings.map((finding) => ({
								id: finding.id,
								shortDescription: {
									text: finding.title,
								},
							})),
						},
					},

					results: findings.map((finding) => ({
						ruleId: finding.id,

						level: mapLevel(finding.severity),

						message: {
							text: finding.description,
						},

						...(createLocation(finding)
							? {
									locations: [createLocation(finding)],
								}
							: {}),
					})),
				},
			],
		},
		null,
		2,
	);
}

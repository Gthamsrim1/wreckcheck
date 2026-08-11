import type { Finding } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';

import type { DockerRule } from './types.js';

const SECRET_NAME_PATTERN =
	/(?:PASSWORD|PASSWD|SECRET|API[_-]?KEY|PRIVATE[_-]?KEY|ACCESS[_-]?KEY|TOKEN|AUTH[_-]?TOKEN)/i;

const SECRET_VALUE_PATTERN = /(?:^|=)\s*(['"]?)(?!\$\{?)[^\s'"]{8,}\1\s*$/;

export const dockerSecretsRule: DockerRule = ({ instructions }) => {
	const findings: Finding[] = [];

	for (const instruction of instructions) {
		if (
			instruction.instruction !== 'ENV' &&
			instruction.instruction !== 'ARG'
		) {
			continue;
		}

		const assignment = instruction.value.match(
			/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
		);

		if (!assignment) {
			continue;
		}

		const name = assignment[1]!;
		const value = assignment[2]!.trim();

		if (!SECRET_NAME_PATTERN.test(name)) {
			continue;
		}

		if (
			!value ||
			value.startsWith('$') ||
			value.startsWith('${') ||
			!SECRET_VALUE_PATTERN.test(value)
		) {
			continue;
		}

		findings.push({
			id: findingIds.dockerSecret,
			severity: 'critical',
			category: 'docker',
			title: 'Secret embedded in Dockerfile',
			description:
				`${name} appears to contain a hard-coded secret that will be ` +
				'included in the Docker build configuration.',
			file: 'Dockerfile',
			line: instruction.line,
			recommendation:
				'Pass secrets at runtime instead of embedding them in the Dockerfile or image.',
		});
	}

	return findings;
};

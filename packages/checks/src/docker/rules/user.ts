import type { Finding } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';

import type { DockerRule } from './types.js';

export const dockerUserRule: DockerRule = ({ instructions }) => {
	const hasUserInstruction = instructions.some(
		(instruction) => instruction.instruction === 'USER',
	);

	if (hasUserInstruction) {
		return [];
	}

	const finding: Finding = {
		id: findingIds.dockerRootUser,
		severity: 'medium',
		category: 'docker',
		title: 'No explicit non-root USER configured',
		description: 'No USER instruction was found in the Dockerfile.',
		file: 'Dockerfile',
		recommendation:
			'Create a dedicated non-root user and run the application with USER.',
	};

	return [finding];
};

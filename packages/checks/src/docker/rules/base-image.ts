import type { Finding } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';
import type { DockerRule } from './types.js';

export const dockerBaseImageRule: DockerRule = ({ instructions }) => {
	const findings: Finding[] = [];

	for (const instruction of instructions) {
		if (instruction.instruction !== 'FROM') {
			continue;
		}

		const image = instruction.value.split(/\s+/)[0]?.trim();

		if (!image || image.includes('@sha256:')) {
			continue;
		}

		const imageName = image.split('/').pop() ?? image;

		const tag = imageName.includes(':')
			? imageName.split(':').pop()
			: undefined;

		const isFloating =
			tag === undefined ||
			tag === 'latest' ||
			/^\d+$/.test(tag) ||
			/^\d+\.\d+$/.test(tag);

		if (!isFloating) {
			continue;
		}

		findings.push({
			id: findingIds.dockerFloatingBaseImage,
			severity: 'medium',
			category: 'docker',
			title: 'Floating Docker base image',
			description: `${image} does not pin the base image to an exact version.`,
			file: 'Dockerfile',
			line: instruction.line,
			recommendation:
				'Pin the base image to an exact version. For maximum reproducibility, pin it by digest.',
		});
	}

	return findings;
};

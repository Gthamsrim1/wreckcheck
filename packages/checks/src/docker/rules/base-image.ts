/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Finding } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';
import type { DockerRule } from './types.js';

/**
 * Flags `FROM` instructions that do not pin the base image.
 *
 * A missing tag, `latest`, or a partial version like `20` or `20.1` all resolve
 * to something different over time, so the image that passes review is not
 * necessarily the one that ships. Digest-pinned images are always accepted.
 *
 * @param context - The parsed Dockerfile.
 * @returns One finding per floating base image, located by line.
 */
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

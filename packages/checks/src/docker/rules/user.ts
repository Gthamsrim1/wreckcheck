/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Finding } from '@wreckcheck/core';
import { findingIds } from '@wreckcheck/core';

import type { DockerRule } from './types.js';

/**
 * Flags Dockerfiles that never switch away from root.
 *
 * Without a `USER` instruction the container runs as root, so a process
 * compromise starts with full privileges inside the container.
 *
 * @param context - The parsed Dockerfile.
 * @returns A single finding, or nothing when a `USER` instruction is present.
 */
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

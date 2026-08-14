/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { ProjectInfo } from '../checks/types.js';

/** What a verification adapter is given when it detects or runs. */
export interface VerificationContext {
	/** Project directory the commands run in. */
	rootDir: string;
	/** Project details from {@link core/src/project.discoverProject | discoverProject}. */
	project: ProjectInfo;
	/** Whether the scan is running on CI. */
	ci: boolean;
}

/** Outcome of a single verification command. */
export interface CommandResult {
	/** Executable that was run, such as `pnpm`. */
	command: string;
	/** The full command as shown to the user, such as `pnpm run test`. */
	display: string;
	/** Exit code, or `null` when the command timed out or never started. */
	exitCode: number | null;
	/** Combined stdout and stderr, truncated in the middle if very long. */
	output?: string | undefined;
	/** Time the command took, in milliseconds. */
	duration: number;
	/** Whether the command was killed for exceeding its time limit. */
	timedOut: boolean;
}

/**
 * Knows how to run one ecosystem's build, lint, and test commands.
 *
 * Adapters are tried in order and the first one that detects the project wins,
 * so a project is verified by a single toolchain.
 */
export interface VerificationAdapter {
	/** Identifier for the adapter, such as `npm`. */
	id: string;

	/**
	 * Reports whether this adapter handles the project.
	 *
	 * @param context - Project directory and details.
	 * @returns `true` when the project belongs to this ecosystem.
	 */
	detect(context: VerificationContext): Promise<boolean>;

	/**
	 * Runs the project's own verification commands.
	 *
	 * @param context - Project directory and details.
	 * @returns One result per command that ran, in the order they ran.
	 */
	run(context: VerificationContext): Promise<CommandResult[]>;
}

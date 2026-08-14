/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { Finding, ScanContext } from '@wreckcheck/core';
import type { DockerInstruction } from '../parser.js';

/** What a Docker rule is given when it runs. */
export interface DockerRuleContext {
	/** The surrounding scan, for rules that need the project directory. */
	scan: ScanContext;
	/** The parsed Dockerfile. */
	instructions: DockerInstruction[];
	/** Raw Dockerfile contents, for rules that inspect the text itself. */
	dockerfile: string;
}

/**
 * One rule applied to a parsed Dockerfile.
 *
 * Rules may be synchronous or asynchronous; the Docker check runs them all
 * concurrently and merges their findings.
 */
export type DockerRule = (
	context: DockerRuleContext,
) => Promise<Finding[]> | Finding[];

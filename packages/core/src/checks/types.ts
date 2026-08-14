/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import type { CommandResult } from '../verification/types.js';

/** How damaging a finding is if it ships. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** The area of the project a finding belongs to. */
export type Category =
	| 'security'
	| 'dependencies'
	| 'environment'
	| 'docker'
	| 'build'
	| 'production'
	| 'project'
	| 'verification';

/** A single problem a check found in the project. */
export interface Finding {
	/** Stable finding ID from {@link core/src/ids.findingIds | findingIds}, used by the ignore list. */
	id: string;
	/** Identifier for this finding at this location, across runs. */
	fingerprint?: string;
	/** How damaging the finding is. */
	severity: Severity;
	/** Area of the project the finding belongs to. */
	category: Category;
	/** One-line summary shown in reports. */
	title: string;
	/** What was found and why it matters. */
	description: string;

	/** Project-relative path the finding was reported against. */
	file?: string;
	/** 1-based line number within {@link Finding.file}. */
	line?: number;

	/** What to do about the finding. */
	recommendation?: string;

	/** Set on dependency findings, describing the affected package. */
	package?: {
		/** Name of the affected package. */
		name: string;
		/** Version currently installed, when it could be resolved. */
		installedVersion?: string;
		/** Earliest version that resolves the vulnerability, if one exists. */
		fixedVersion?: string;
		/** Whether the project depends on the package directly. */
		direct: boolean;
	};

	/** Advisory or documentation URLs backing the finding. */
	references?: string[];
}

/** Outcome of running a single check. */
export type CheckStatus = 'passed' | 'findings' | 'error' | 'skipped';

/** What a check reports back to the scanner. */
export interface CheckResult {
	/** Whether the check ran, was skipped, or failed. */
	status: CheckStatus;
	/** Problems the check found. */
	findings: Finding[];
	/** Commands the check ran, for checks that execute the project. */
	verification?: CommandResult[];
	/** Time the check took, in milliseconds. */
	duration: number;
	/** Why the check could not run, when `status` is `error`. */
	error?: string;
}

/** What every check is given when it runs. */
export interface ScanContext {
	/** Project directory being scanned. */
	rootDir: string;
	/** Project details from {@link core/src/project.discoverProject | discoverProject}. */
	project: ProjectInfo;
	/** Whether the user asked for the project's own commands to be run. */
	verify: boolean;
}

/** One area of the project that WreckCheck knows how to inspect. */
export interface Check {
	/** Identifier for the check, such as `docker`. */
	id: string;
	/** Human-readable name shown in reports. */
	name: string;
	/** Category the check's findings belong to. */
	category: Category;

	/**
	 * Inspects the project.
	 *
	 * @param context - The project and directory to inspect.
	 * @returns The findings, plus how long the check took.
	 */
	run(context: ScanContext): Promise<CheckResult>;
}

/** What was discovered about a project before the checks ran. */
export interface ProjectInfo {
	/** Absolute path of the project directory. */
	rootDir: string;
	/** Package manager inferred from the lockfile, if there is one. */
	packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
	/** Language inferred from the project's config files. */
	language: 'typescript' | 'javascript' | 'mixed' | 'unknown';
	/** Framework inferred from the project's dependencies, if recognised. */
	framework?: string;
	/** Whether the project has a Dockerfile or Compose file. */
	hasDocker: boolean;
	/** Whether the project is a Git repository. */
	hasGit: boolean;
}

/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { parse } from 'yaml';

import type { Severity } from './checks/types.js';
import { DEFAULT_POLICY, type Policy } from './policy.js';

const validSeverities: Severity[] = [
	'critical',
	'high',
	'medium',
	'low',
	'info',
];

/** Resolved configuration for a scan. */
export interface WreckCheckConfig {
	/** Policy applied to the findings a scan produces. */
	policy: Policy;
	/** Absolute path of the config file that was loaded, if any was found. */
	path?: string;
}

/**
 * Narrows an unvalidated config value to a {@link Severity}.
 *
 * @param value - Raw value read from the config file.
 * @returns The severity, or `undefined` when the value is not a known one.
 */
function validateSeverity(value: unknown): Severity | undefined {
	if (
		typeof value !== 'string' ||
		!validSeverities.includes(value as Severity)
	) {
		return undefined;
	}

	return value as Severity;
}

/**
 * Reads and validates the WreckCheck config for a project.
 *
 * Settings may sit under a `policy` key or at the top level of the file. A
 * missing or empty config file is not an error: the scan falls back to
 * {@link DEFAULT_POLICY}. Malformed YAML and invalid values are errors, so a
 * typo never silently weakens the policy.
 *
 * @param rootDir - Project directory to load the config from.
 * @param customFile - Config path to use instead of `.wreckcheck.yml`,
 * resolved relative to `rootDir`.
 * @returns The resolved policy, plus the path of the file it came from.
 * @throws Error If the file is not valid YAML, `failOn` is not a known
 * severity, or `ignore` is not a list of finding IDs.
 */
export async function loadConfig(
	rootDir: string,
	customFile?: string,
): Promise<WreckCheckConfig> {
	const configPath =
		typeof customFile === 'string'
			? resolve(rootDir, customFile)
			: join(rootDir, '.wreckcheck.yml');

	let contents: string;

	try {
		contents = await readFile(configPath, 'utf8');
	} catch {
		return {
			policy: DEFAULT_POLICY,
		};
	}

	let config: unknown;

	try {
		config = parse(contents);
	} catch {
		throw new Error(`Invalid WreckCheck config: failed to parse ${configPath}`);
	}

	if (typeof config !== 'object' || config === null) {
		return {
			policy: DEFAULT_POLICY,
		};
	}

	const raw = config as Record<string, unknown>;

	const policyConfig =
		typeof raw.policy === 'object' && raw.policy !== null
			? (raw.policy as Record<string, unknown>)
			: raw;

	const failOn = policyConfig.failOn;

	const ignore = policyConfig.ignore;

	let policy: Policy = DEFAULT_POLICY;

	if (failOn !== undefined) {
		const severity = validateSeverity(failOn);

		if (!severity) {
			throw new Error(
				`Invalid failOn value "${String(
					failOn,
				)}". Expected one of: ${validSeverities.join(', ')}`,
			);
		}

		policy = {
			...policy,
			failOn: severity,
		};
	}

	if (ignore !== undefined) {
		if (
			!Array.isArray(ignore) ||
			!ignore.every((item) => typeof item === 'string')
		) {
			throw new Error('Invalid ignore value. Expected a list of finding IDs.');
		}

		policy = {
			...policy,
			ignore,
		};
	}

	return {
		policy,
		path: configPath,
	};
}

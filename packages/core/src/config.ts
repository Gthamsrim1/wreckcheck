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

export interface WreckCheckConfig {
	policy: Policy;
	path?: string;
}

function validateSeverity(value: unknown): Severity | undefined {
	if (
		typeof value !== 'string' ||
		!validSeverities.includes(value as Severity)
	) {
		return undefined;
	}

	return value as Severity;
}

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

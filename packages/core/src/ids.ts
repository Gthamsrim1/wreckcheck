/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

/**
 * Stable IDs for every finding WreckCheck can report.
 *
 * These strings are part of the tool's public contract: they appear in JSON
 * and SARIF output and are what users list under `ignore` in `.wreckcheck.yml`,
 * so an existing ID must not be renamed.
 */
export const findingIds = {
	// Security
	awsAccessKey: 'security-aws-access-key',
	githubToken: 'security-github-token',
	stripeSecretKey: 'security-stripe-secret-key',
	openaiApiKey: 'security-openai-api-key',
	privateKey: 'security-private-key',

	// Environment
	envTracked: 'environment-env-tracked',
	envNotIgnored: 'environment-env-not-ignored',
	envMismatch: 'environment-env-mismatch',

	// Docker
	dockerNoDockerignore: 'docker-no-dockerignore',
	dockerSensitiveEnv: 'docker-missing-ignore-env',
	dockerSensitiveEnvWildcard: 'docker-missing-ignore-env-wildcard',
	dockerSensitiveGit: 'docker-missing-ignore-git',
	dockerSensitiveNodeModules: 'docker-missing-ignore-node-modules',
	dockerFloatingBaseImage: 'docker-floating-base-image',
	dockerRootUser: 'docker-root-user',
	dockerSecret: 'docker-embedded-secret',

	// Build
	missingBuildScript: 'build-missing-build-script',
	missingTestScript: 'build-missing-test-script',
	missingLintScript: 'build-missing-lint-script',

	// Dependencies
	dependencyVulnerability: 'dependencies-vulnerability',

	// Verification
	verificationCommandFailed: 'verification-command-failed',
	verificationCommandTimedOut: 'verification-command-timed-out',
	verificationNoProjectAdapter: 'verification-no-project-adapter',
	verificationMissingScript: 'verification-missing-script',
} as const;

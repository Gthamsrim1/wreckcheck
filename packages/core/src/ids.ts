export const findingIds = {
	// Security
	awsAccessKey: 'security:aws-access-key',
	githubToken: 'security:github-token',
	stripeSecretKey: 'security:stripe-secret-key',
	openaiApiKey: 'security:openai-api-key',
	privateKey: 'security:private-key',

	// Environment
	envTracked: 'environment:env-tracked',
	envNotIgnored: 'environment:env-not-ignored',
	envMismatch: 'environment:env-mismatch',

	// Docker
	dockerNoDockerignore: 'docker:no-dockerignore',
	dockerSensitiveEnv: 'docker:missing-ignore-env',
	dockerSensitiveEnvWildcard: 'docker:missing-ignore-env-wildcard',
	dockerSensitiveGit: 'docker:missing-ignore-git',
	dockerSensitiveNodeModules: 'docker:missing-ignore-node-modules',
	dockerFloatingBaseImage: 'docker:floating-base-image',
	dockerRootUser: 'docker:root-user',
	dockerSecret: 'docker:embedded-secret',

	// Build
	missingBuildScript: 'build:missing-build-script',
	missingTestScript: 'build:missing-test-script',
	missingLintScript: 'build:missing-lint-script',

	// Dependencies
	dependencyVulnerability: 'dependencies:vulnerability',
} as const;

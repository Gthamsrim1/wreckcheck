export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Category =
	| 'security'
	| 'dependencies'
	| 'environment'
	| 'docker'
	| 'build'
	| 'production'
	| 'project'
	| 'verification';

export interface Finding {
	id: string;
	fingerprint?: string;
	severity: Severity;
	category: Category;
	title: string;
	description: string;

	file?: string;
	line?: number;

	recommendation?: string;

	package?: {
		name: string;
		installedVersion?: string;
		fixedVersion?: string;
		direct: boolean;
	};

	references?: string[];
}

export type CheckStatus = 'passed' | 'findings' | 'error' | 'skipped';

export interface CheckResult {
	status: CheckStatus;
	findings: Finding[];
	duration: number;
	error?: string;
}

export interface ScanContext {
	rootDir: string;
	project: ProjectInfo;
	verify: boolean;
}

export interface Check {
	id: string;
	name: string;
	category: Category;

	run(context: ScanContext): Promise<Finding[]>;
}

export interface ProjectInfo {
	rootDir: string;
	packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
	language: 'typescript' | 'javascript' | 'mixed' | 'unknown';
	framework?: string;
	hasDocker: boolean;
	hasGit: boolean;
}

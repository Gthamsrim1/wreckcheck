import type { ProjectInfo } from '../checks/types.js';

export interface VerificationContext {
	rootDir: string;
	project: ProjectInfo;
	ci: boolean;
}

export interface CommandResult {
	command: string;
	display: string;
	exitCode: number | null;
	output?: string | undefined;
	duration: number;
	timedOut: boolean;
}

export interface VerificationAdapter {
	id: string;
	detect(context: VerificationContext): Promise<boolean>;
	run(context: VerificationContext): Promise<CommandResult[]>;
}

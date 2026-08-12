import type { ProjectInfo } from '../checks/types.js';
import { goAdapter } from './go.js';
import { npmAdapter } from './npm.js';
import { pythonAdapter } from './python.js';
import { rustAdapter } from './rust.js';
import type { CommandResult, VerificationContext } from './types.js';

const adapters = [npmAdapter, goAdapter, rustAdapter, pythonAdapter];

export async function runVerification(context: {
	rootDir: string;
	project: ProjectInfo;
}): Promise<CommandResult[]> {
	const verificationContext: VerificationContext = {
		rootDir: context.rootDir,
		project: context.project,
		ci: process.env.CI === 'true',
	};

	for (const adapter of adapters) {
		if (await adapter.detect(verificationContext)) {
			return adapter.run(verificationContext);
		}
	}

	return [];
}

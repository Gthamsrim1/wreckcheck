import type {
  Finding,
  ScanContext,
} from '@wreckcheck/core';
import type { DockerInstruction } from '../parser.js';

export interface DockerRuleContext {
  scan: ScanContext;
  instructions: DockerInstruction[];
  dockerfile: string;
}

export type DockerRule = (
  context: DockerRuleContext,
) => Promise<Finding[]> | Finding[];
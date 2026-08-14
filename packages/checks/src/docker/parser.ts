/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

/** A single instruction parsed out of a Dockerfile. */
export interface DockerInstruction {
	/** The keyword, such as `FROM` or `ENV`. */
	instruction: string;
	/** Everything after the keyword, with line continuations joined. */
	value: string;
	/** 1-based line the instruction starts on. */
	line: number;
}

/**
 * Parses a Dockerfile into instructions the rules can inspect.
 *
 * Comments and blank lines are dropped, and instructions split across lines
 * with a trailing backslash are joined into one. The reported line is where
 * the instruction started, so findings point at the keyword rather than the
 * last line of a continuation.
 *
 * @param content - Raw contents of the Dockerfile.
 * @returns The instructions, in file order.
 */
export function parseDockerfile(content: string): DockerInstruction[] {
	const instructions: DockerInstruction[] = [];

	let current = '';
	let startLine = 0;

	const lines = content.split(/\r?\n/);

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]?.trimEnd() ?? '';

		if (!current) {
			startLine = index + 1;
		}

		if (!line.trim() || line.trimStart().startsWith('#')) {
			continue;
		}

		current += line.trim();

		if (current.endsWith('\\')) {
			current = current.slice(0, -1);
			continue;
		}

		const match = current.match(/^([A-Z]+)\s+(.*)$/);

		if (match) {
			instructions.push({
				instruction: match[1] ?? '',
				value: match[2] ?? '',
				line: startLine,
			});
		}

		current = '';
	}

	return instructions;
}

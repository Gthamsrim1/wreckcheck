/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

/**
 * Builds a stable identifier for a finding at a specific place in the project.
 *
 * The same issue in the same file and line always produces the same
 * fingerprint, so findings can be compared across runs.
 *
 * @param id - Finding ID, such as `security:aws-access-key`.
 * @param file - Project-relative path the finding was reported against.
 * @param line - 1-based line number the finding was reported against.
 * @returns The `id:file:line` fingerprint, with `unknown` and `0` standing in
 * for a missing file or line.
 */
export function createFingerprint(
	id: string,
	file?: string,
	line?: number,
): string {
	return [id, file ?? 'unknown', line ?? 0].join(':');
}

/**
 * Copyright (c) 2026 Gautham Sriram All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	target: 'node20',
	clean: true,
	bundle: true,
	dts: false,
	noExternal: [
		'@wreckcheck/core',
		'@wreckcheck/checks',
		'@wreckcheck/reporter',
	],
	external: ['yaml'],
});

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

import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		types: 'src/types.ts',
		advanced: 'src/advanced.ts',
		utils: 'src/utils.ts',
		'core/index': 'src/core/index.ts',
		'transformers/index': 'src/transformers/index.ts',
		cli: 'src/mcp-cli.ts',
	},
	format: ['cjs', 'esm'],
	dts: true,
	splitting: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	minify: true,
	outDir: 'dist',
	external: ['reflect-metadata'],
	// Soporte para path aliases (@/*)
	esbuildOptions(options) {
		options.alias = {
			'@': './src',
		};
	},
});

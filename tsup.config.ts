import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		types: 'src/types.ts',
		advanced: 'src/advanced.ts',
		utils: 'src/utils.ts',
		forms: 'src/forms.ts',
		matchers: 'src/matchers.ts',
		validators: 'src/core/decorators/validators.ts',
		'compat/ts5/forms': 'src/compat/ts5/forms.ts',
		'core/index': 'src/core/index.ts',
		'schema/zod': 'src/core/services/zod-schema-generator.service.ts',
		'transformers/index': 'src/transformers/index.ts',
		'transformers/bigint': 'src/transformers/bigint.transformer.ts',
		'transformers/buffer': 'src/transformers/buffer.transformer.ts',
		'transformers/date': 'src/transformers/date.transformer.ts',
		'transformers/error': 'src/transformers/error.transformer.ts',
		'transformers/map-set': 'src/transformers/map-set.transformer.ts',
		'transformers/primitive': 'src/transformers/primitive.transformer.ts',
		'transformers/regexp': 'src/transformers/regexp.transformer.ts',
		'transformers/special-float':
			'src/transformers/special-float.transformer.ts',
		'transformers/symbol': 'src/transformers/symbol.transformer.ts',
		'transformers/typed-array':
			'src/transformers/typed-array.transformer.ts',
		'transformers/weak-collections':
			'src/transformers/weak-collections.transformer.ts',
		'transformers/web-apis': 'src/transformers/web-apis.transformer.ts',
		cli: 'src/mcp-cli.ts',
	},
	format: ['cjs', 'esm'],
	dts: true,
	splitting: true,
	sourcemap: true,
	clean: true,
	treeshake: {
		preset: 'smallest',
		moduleSideEffects: false,
	},
	minify: true,
	minifyIdentifiers: true,
	minifySyntax: true,
	minifyWhitespace: true,
	outDir: 'dist',
	external: ['reflect-metadata'],
	// Soporte para path aliases (@/*)
	esbuildOptions(options) {
		options.alias = {
			'@': './src',
		};
	},
});

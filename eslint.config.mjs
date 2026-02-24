// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import securityPlugin from 'eslint-plugin-security';

export default tseslint.config(
	{
		ignores: [
			'dist/',
			'node_modules/',
			'docs/',
			'docs-vitepress/public/**/*',
			'docs-vitepress/tsdoc/**/*',
			'docs-vitepress/.vitepress/cache/**/*',
			'coverage/',
			'**/*.js',
			'**/*.mjs',
			'**/*.d.ts',
			'tsup.config.ts',
		],
	},
	eslint.configs.recommended,
	securityPlugin.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		rules: {
			'security/detect-object-injection': 'off', // Essential for a reflection/serialization library
			'security/detect-non-literal-fs-filename': 'off', // We validate paths manually in tools
			'security/detect-unsafe-regex': 'warn', // checking manually
		},
	},
	{
		languageOptions: {
			parserOptions: {
				project: [
					'./tsconfig.json',
					'./tsconfig.scripts.json',
					'./tests/tsconfig.json',
					'./tests/mcp/tsconfig.json',
					'./docs-vitepress/tsconfig.json',
					'./tests/unit/decorators/tc39/tsconfig.json',
				],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			prettier: prettierPlugin,
		},
		rules: {
			// Manually apply eslint-config-prettier rules (turns off conflicting rules)
			...prettierConfig.rules,

			// Customize typescript-eslint rules
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-non-null-assertion': 'off',

			// Reflection/serialization libraries require dynamic type access.
			// These rules are intentionally disabled for metadata operations and runtime type transformations.
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-unsafe-enum-comparison': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
			'@typescript-eslint/no-base-to-string': 'off',
			'@typescript-eslint/no-this-alias': 'off',

			// Prettier rule
			// "prettier/prettier": "error",

			// ---------------------------------------------------------------------------
			// Reglas portadas desde beatgames
			// ---------------------------------------------------------------------------

			// PROHIBIR auto-importación desde el nombre del paquete publicado
			// Dentro de src/, importar '@cartago-git/quickmodel' crea una dependencia circular al barrel.
			// Además se prohíbe importar '@mcp' sin especificar archivo.
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@cartago-git/quickmodel'],
							message:
								"PROHIBIDO: auto-importar el paquete desde sí mismo. Usa rutas internas '@/core/...', '@/transformers/...', etc.",
						},
						{
							group: ['@mcp'],
							message:
								"PROHIBIDO: importar desde '@mcp' sin especificar archivo. Usa '@mcp/server' o la ruta completa.",
						},
					],
				},
			],

			// OBLIGAR mínimo 3 caracteres en nombres de variables, funciones y parámetros
			// Alternativas esperadas para nombres cortos prohibidos:
			//   e   → err          (errores en catch)
			//   i   → idx          (índice en loops)
			//   k   → key          (clave en iteración)
			//   v   → val / value  (valor genérico)
			//   fn  → func         (callback/función)
			//   a,b → valA, valB   (comparadores de sort u operandos)
			'id-length': [
				'error',
				{
					min: 3,
					max: 50,
					properties: 'never', // No validar propiedades de objeto (APIs externas pueden enviar { x, y })
					exceptions: [
						'_', // Variable descartada en destructuring
						'id', // Identificador ubicuo
						'err', // Error en catch,
						'ts', // Timestamp o timespan o typescript (contexto claro)
						'on', // Método de testing / event listeners
						'fs', // Node.js filesystem module
						'cb', // Callback
						'md', // Markdown content (estándar en herramientas de documentación)
					],
					exceptionPatterns: [
						'^_', // Variables ignoradas con prefijo _ (_err, _val, etc.)
					],
				},
			],

			// PROHIBIR más de 3 parámetros posicionales — usar objeto si necesitas más
			'max-params': ['error', { max: 3 }],

			// OBLIGAR prefijo I en interfaces y type aliases
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'interface',
					format: ['PascalCase'],
					prefix: ['I'],
				},
				{
					selector: 'typeAlias',
					format: ['PascalCase'],
					prefix: ['I'],
				},
			],
		},
	},
	// Override para ficheros de test: relajar solo reglas que genuinamente dificultan el testing
	{
		files: ['**/*.test.ts', '**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			// Los tests importan desde el barrel público para probar la API expuesta
			'no-restricted-imports': 'off',
			// id-length, max-params y naming-convention aplican igual que en src/
		},
	},
	// Override para ejemplos: demuestran la API pública, importan desde el barrel raíz a propósito
	{
		files: ['src/examples/**'],
		rules: {
			'no-restricted-imports': 'off',
		},
	},
	// Override para transformers: deserialize(value, propertyKey, className, context?) es
	// el contrato fijo del interfaz IQTransformer — 4 parámetros son estructuralmente necesarios
	{
		files: ['src/transformers/**', 'src/core/bases/**'],
		rules: {
			'max-params': 'off',
		},
	}
);

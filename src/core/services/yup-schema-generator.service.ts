/**
 * YupSchemaGenerator — Yup schema source string generation from QuickModel
 * decorator configuration.
 *
 * Produces a TypeScript source string that imports Yup and declares a
 * `const <ClassName>Schema = yup.object({ … })` with each field mapped to
 * the corresponding Yup validator.  The output can be pasted directly into
 * a project that has `yup` installed.
 *
 * **Zero runtime dependencies** — this generator is pure string composition,
 * consistent with `TypeScriptSchemaGenerator` and `GraphQLSchemaGenerator`.
 * `yup` does NOT need to be installed in the QuickModel consumer's project
 * to call this generator.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link PrismaSchemaGenerator} — Prisma schema string equivalent
 * @see {@link ValibotSchemaGenerator} — Valibot schema string equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('yup')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/**
 * Generates a Yup schema source string from QuickModel decorator configuration.
 *
 * Maps QuickModel type specs to Yup validators:
 *
 * | QuickModel  | Yup                         |
 * |-------------|-----------------------------|
 * | `Number`    | `yup.number().required()`   |
 * | `String`    | `yup.string().required()`   |
 * | `Boolean`   | `yup.boolean().required()`  |
 * | `Date`      | `yup.date().required()`     |
 * | `BigInt`    | `yup.string().required()`   |
 * | `Set`       | `yup.array().required()`    |
 * | `Array`     | `yup.array().required()`    |
 * | `Map`       | `yup.mixed().required()`    |
 * | `Object`    | `yup.object().required()`   |
 * | _(default)_ | `yup.string().required()`   |
 *
 * > Note: Yup does not have a native `bigint` validator; `BigInt` fields are
 * > mapped to `yup.string()` as they are commonly serialized to strings when
 * > crossing schema boundaries.
 *
 * @example
 * ```ts
 * const src = YupSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { id: Number, name: String, createdAt: Date },
 *   properties: ['id', 'name', 'createdAt'],
 * });
 * // "import * as yup from 'yup';\n\nexport const UserSchema = yup.object({\n\tid: yup.number().required(),\n\t...\n});\n\nexport type IUserInput = yup.InferType<typeof UserSchema>;\n"
 * ```
 *
 * @see {@link ISchemaGeneratorConfig} — config shape
 * @see {@link QModel.getSchema} — entry point for `getSchema('yup')`
 * @see {@link PrismaSchemaGenerator} — Prisma equivalent
 * @see {@link ValibotSchemaGenerator} — Valibot equivalent
 */
export class YupSchemaGenerator {
	/**
	 * Generates a Yup schema source string.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns A TypeScript source string declaring a `yup.object(…)` schema
	 *   and the corresponding `InferType` type alias
	 * @see {@link ISchemaGeneratorConfig} — input shape
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;

		const fields = properties
			.map((prop) => {
				const transformer = decoratorConfig[prop];
				const yupType = YupSchemaGenerator._getYupType(transformer);
				return `\t${prop}: ${yupType},`;
			})
			.join('\n');

		return [
			"import * as yup from 'yup';",
			'',
			`export const ${className}Schema = yup.object({`,
			fields,
			'});',
			'',
			`export type I${className}Input = yup.InferType<typeof ${className}Schema>;`,
			'',
		].join('\n');
	}

	/**
	 * Maps a transformer token to its Yup validator expression string.
	 *
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns Yup validator expression string (e.g. `'yup.string().required()'`)
	 */
	private static _getYupType(transformer: unknown): string {
		if (!transformer) {
			return 'yup.string().required()';
		}

		const name =
			typeof transformer === 'function'
				? (transformer as { name: string }).name
				: String(transformer);

		switch (name.toLowerCase()) {
			case 'number':
				return 'yup.number().required()';
			case 'string':
				return 'yup.string().required()';
			case 'boolean':
				return 'yup.boolean().required()';
			case 'date':
				return 'yup.date().required()';
			case 'bigint':
				// Yup has no native BigInt — serialize via string (common pattern)
				return 'yup.string().required()';
			case 'set':
			case 'array':
				return 'yup.array().required()';
			case 'map':
				return 'yup.mixed().required()';
			case 'object':
				return 'yup.object().required()';
			default:
				return 'yup.string().required()';
		}
	}
}

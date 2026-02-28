/**
 * ValibotSchemaGenerator — Valibot v1.x schema source string generation
 * from QuickModel decorator configuration.
 *
 * Produces a TypeScript source string that imports Valibot and declares a
 * `const <ClassName>Schema = v.object({ … })` with each field mapped to
 * the corresponding Valibot validator.  The output can be pasted directly
 * into a project that has `valibot` installed.
 *
 * **Zero runtime dependencies** — this generator is pure string composition,
 * consistent with `TypeScriptSchemaGenerator` and `GraphQLSchemaGenerator`.
 * `valibot` does NOT need to be installed in the QuickModel consumer's project
 * to call this generator.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link PrismaSchemaGenerator} — Prisma schema string equivalent
 * @see {@link YupSchemaGenerator} — Yup schema string equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('valibot')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/**
 * Generates a Valibot v1.x schema source string from QuickModel decorator configuration.
 *
 * Maps QuickModel type specs to Valibot validators:
 *
 * | QuickModel  | Valibot                           |
 * |-------------|-----------------------------------|
 * | `Number`    | `v.number()`                      |
 * | `String`    | `v.string()`                      |
 * | `Boolean`   | `v.boolean()`                     |
 * | `Date`      | `v.date()`                        |
 * | `BigInt`    | `v.bigint()`                      |
 * | `Set`       | `v.set(v.string())`               |
 * | `Map`       | `v.map(v.string(), v.unknown())`  |
 * | `Array`     | `v.array(v.unknown())`            |
 * | `Object`    | `v.record(v.string(), v.unknown())`|
 * | _(default)_ | `v.string()`                      |
 *
 * @example
 * ```ts
 * const src = ValibotSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { id: Number, name: String, createdAt: Date },
 *   properties: ['id', 'name', 'createdAt'],
 * });
 * // "import * as v from 'valibot';\n\nexport const UserSchema = v.object({\n\tid: v.number(),\n\tname: v.string(),\n\tcreatedAt: v.date(),\n});\n\nexport type IUserInput = v.InferInput<typeof UserSchema>;\n"
 * ```
 *
 * @see {@link ISchemaGeneratorConfig} — config shape
 * @see {@link QModel.getSchema} — entry point for `getSchema('valibot')`
 * @see {@link PrismaSchemaGenerator} — Prisma equivalent
 * @see {@link YupSchemaGenerator} — Yup equivalent
 */
export class ValibotSchemaGenerator {
	/**
	 * Generates a Valibot v1.x schema source string.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns A TypeScript source string declaring a Valibot `v.object(…)` schema
	 *   and the corresponding `InferInput` type alias
	 * @see {@link ISchemaGeneratorConfig} — input shape
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;

		const fields = properties
			.map((prop) => {
				const transformer = decoratorConfig[prop];
				const valibotType =
					ValibotSchemaGenerator._getValibotType(transformer);
				return `\t${prop}: ${valibotType},`;
			})
			.join('\n');

		return [
			"import * as v from 'valibot';",
			'',
			`export const ${className}Schema = v.object({`,
			fields,
			'});',
			'',
			`export type I${className}Input = v.InferInput<typeof ${className}Schema>;`,
			'',
		].join('\n');
	}

	/**
	 * Maps a transformer token to its Valibot v1.x validator expression string.
	 *
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns Valibot validator expression string (e.g. `'v.string()'`, `'v.date()'`)
	 */
	private static _getValibotType(transformer: unknown): string {
		if (!transformer) {
			return 'v.string()';
		}

		const name =
			typeof transformer === 'function'
				? (transformer as { name: string }).name
				: String(transformer);

		switch (name.toLowerCase()) {
			case 'number':
				return 'v.number()';
			case 'string':
				return 'v.string()';
			case 'boolean':
				return 'v.boolean()';
			case 'date':
				return 'v.date()';
			case 'bigint':
				return 'v.bigint()';
			case 'set':
				return 'v.set(v.string())';
			case 'map':
				return 'v.map(v.string(), v.unknown())';
			case 'array':
				return 'v.array(v.unknown())';
			case 'object':
				return 'v.record(v.string(), v.unknown())';
			default:
				return 'v.string()';
		}
	}
}

/**
 * TypeBoxSchemaGenerator — `@sinclair/typebox` `Type.Object(…)` source string
 * from QuickModel decorator configuration.
 *
 * Produces TypeScript source that imports `Type` and `Static` from TypeBox and
 * declares a `const <ClassName>Schema = Type.Object({ … })` with each field
 * mapped to the appropriate TypeBox schema. The `Static<typeof …>` type export
 * is included as a convenience.
 *
 * TypeBox is the **native validator for Fastify v5** and is widely used in
 * high-performance API scenarios.
 *
 * **Zero runtime dependencies** — pure string composition.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link ValibotSchemaGenerator} — Valibot equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('typebox')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/**
 * Generates a TypeBox `Type.Object(…)` source string from QuickModel decorator
 * configuration.
 *
 * Maps QuickModel type specs to TypeBox schemas:
 *
 * | QuickModel  | TypeBox                                         |
 * |-------------|-------------------------------------------------|
 * | `Number`    | `Type.Number()`                                 |
 * | `String`    | `Type.String()`                                 |
 * | `Boolean`   | `Type.Boolean()`                                |
 * | `Date`      | `Type.String({ format: 'date-time' })`          |
 * | `BigInt`    | `Type.BigInt()`                                 |
 * | `Set`       | `Type.Array(Type.String())`                     |
 * | `Map`       | `Type.Record(Type.String(), Type.Unknown())`    |
 * | _(default)_ | `Type.String()`                                 |
 *
 * @example
 * ```ts
 * const src = TypeBoxSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { id: Number, name: String, active: Boolean },
 *   properties: ['id', 'name', 'active'],
 * });
 * // "import { Type, Static } from '@sinclair/typebox';\n\nexport const UserSchema = Type.Object({\n\t…\n});\nexport type IUser = Static<typeof UserSchema>;\n"
 * ```
 *
 * @see {@link ISchemaGeneratorConfig} — config shape
 * @see {@link QModel.getSchema} — entry point for `getSchema('typebox')`
 * @see {@link ValibotSchemaGenerator} — Valibot equivalent
 */
export class TypeBoxSchemaGenerator {
	/**
	 * Generates a TypeBox `Type.Object(…)` source string.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns TypeScript source string declaring the TypeBox schema and Static type alias
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;

		const fields = properties
			.map((prop) => {
				const transformer = decoratorConfig[prop];
				const typeExpr =
					TypeBoxSchemaGenerator._getTypeBoxType(transformer);
				return `\t${prop}: ${typeExpr},`;
			})
			.join('\n');

		return [
			"import { Type, Static } from '@sinclair/typebox';",
			'',
			`export const ${className}Schema = Type.Object({`,
			fields,
			'});',
			'',
			`export type I${className} = Static<typeof ${className}Schema>;`,
			'',
		].join('\n');
	}

	/**
	 * Maps a transformer token to its TypeBox type expression string.
	 *
	 * @internal
	 * @param transformer - Transformer constructor or string token
	 * @returns TypeBox expression string (e.g. `'Type.Number()'`, `'Type.Date()'`)
	 */
	private static _getTypeBoxType(transformer: unknown): string {
		if (!transformer) return 'Type.String()';

		const name =
			typeof transformer === 'function'
				? (transformer as { name: string }).name
				: String(transformer);

		switch (name.toLowerCase()) {
			case 'number':
				return 'Type.Number()';
			case 'boolean':
				return 'Type.Boolean()';
			case 'date':
				return "Type.String({ format: 'date-time' })";
			case 'bigint':
				return 'Type.BigInt()';
			case 'set':
				return 'Type.Array(Type.String())';
			case 'map':
				return 'Type.Record(Type.String(), Type.Unknown())';
			default:
				return 'Type.String()';
		}
	}
}

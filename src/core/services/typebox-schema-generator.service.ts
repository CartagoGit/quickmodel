/**
 * TypeBoxSchemaGenerator — `@sinclair/typebox` `Type.Object(…)` source string
 * from QuickModel decorator configuration.
 *
 * The output starts with `import { Type, Static } from '@sinclair/typebox';`
 * followed by `const <ClassName>Schema = Type.Object({...})` and the
 * corresponding `export type I<ClassName>` helper.
 *
 * **Zero runtime dependencies** — pure string composition.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link ValibotSchemaGenerator} — Valibot equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('typebox')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/** @internal */
function isArrayToken(transformer: unknown): boolean {
	return Array.isArray(transformer);
}

/**
 * Generates a TypeBox `Type.Object(…)` source string from QuickModel decorator
 * configuration.
 *
 * | QuickModel  | TypeBox                                         |
 * |-------------|-------------------------------------------------|
 * | `Number`    | `Type.Number()`                                 |
 * | `String`    | `Type.String()`                                 |
 * | `Boolean`   | `Type.Boolean()`                                |
 * | `Date`      | `Type.String({ format: 'date-time' })`          |
 * | `BigInt`    | `Type.BigInt()`                                 |
 * | `[Type]`    | `Type.Array(Type.Unknown())`                    |
 * | `Set`       | `Type.Array(Type.String())`                     |
 * | `Map`       | `Type.Record(Type.String(), Type.Unknown())`    |
 * | _(default)_ | `Type.String()`                                 |
 *
 * @see {@link ISchemaGeneratorConfig}
 * @see {@link QModel.getSchema}
 */
export class TypeBoxSchemaGenerator {
	/**
	 * Generates a TypeBox `Type.Object(…)` source string.
	 * The output **starts with** `import { Type, Static } from '@sinclair/typebox';`
	 * for direct use in a TypeBox project.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns TypeScript source string with real `@sinclair/typebox` import
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
			`import { Type, Static } from '@sinclair/typebox';`,
			'',
			`const ${className}Schema = Type.Object({`,
			fields,
			'});',
			'',
			`export type I${className} = Static<typeof ${className}Schema>;`,
			'',
		].join('\n');
	}

	/** @internal */
	private static _getTypeBoxType(transformer: unknown): string {
		if (isArrayToken(transformer)) return 'Type.Array(Type.Unknown())';
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

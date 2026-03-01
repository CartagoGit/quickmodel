/**
 * EffectSchemaGenerator — `effect/schema` `Schema.Struct(…)` source string
 * from QuickModel decorator configuration.
 *
 * The output starts with `import * as Schema from 'effect/schema';` followed by
 * `const <ClassName>Schema = Schema.Struct({...})` and the corresponding
 * `export type I<ClassName>` helper using `Schema.Schema.Type`.
 *
 * **Zero runtime dependencies** — pure string composition.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link TypeBoxSchemaGenerator} — TypeBox equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('effect-schema')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/** @internal */
function isArrayToken(transformer: unknown): boolean {
	return Array.isArray(transformer);
}

/**
 * Generates an `effect/schema` `Schema.Struct(…)` source string from QuickModel
 * decorator configuration.
 *
 * | QuickModel  | Effect Schema                        |
 * |-------------|--------------------------------------|
 * | `Number`    | `Schema.Number`                      |
 * | `String`    | `Schema.String`                      |
 * | `Boolean`   | `Schema.Boolean`                     |
 * | `Date`      | `Schema.Date`                        |
 * | `BigInt`    | `Schema.BigIntFromSelf`              |
 * | `[Type]`    | `Schema.Array(Schema.Unknown)`       |
 * | `Set`       | `Schema.Array(Schema.String)`        |
 * | `Map`       | `Schema.Record(Schema.String, Schema.Unknown)` |
 * | _(default)_ | `Schema.String`                      |
 *
 * @see {@link ISchemaGeneratorConfig}
 * @see {@link QModel.getSchema}
 */
export class EffectSchemaGenerator {
	/**
	 * Generates an `effect/schema` `Schema.Struct(…)` source string.
	 * The output **starts with** `import * as Schema from 'effect/schema';`
	 * for direct use in an Effect.ts project.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns TypeScript source string with real `effect/schema` import
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;

		const fields = properties
			.map((prop) => {
				const transformer = decoratorConfig[prop];
				const typeExpr =
					EffectSchemaGenerator._getEffectType(transformer);
				return `\t${prop}: ${typeExpr},`;
			})
			.join('\n');

		return [
			`import * as Schema from 'effect/schema';`,
			'',
			`const ${className}Schema = Schema.Struct({`,
			fields,
			'});',
			'',
			`export type I${className} = Schema.Schema.Type<typeof ${className}Schema>;`,
			'',
		].join('\n');
	}

	/** @internal */
	private static _getEffectType(transformer: unknown): string {
		if (isArrayToken(transformer)) return 'Schema.Array(Schema.Unknown)';
		if (!transformer) return 'Schema.String';

		const name =
			typeof transformer === 'function'
				? (transformer as { name: string }).name
				: String(transformer);

		switch (name.toLowerCase()) {
			case 'number':
				return 'Schema.Number';
			case 'string':
				return 'Schema.String';
			case 'boolean':
				return 'Schema.Boolean';
			case 'date':
				return 'Schema.Date';
			case 'bigint':
				return 'Schema.BigIntFromSelf';
			case 'set':
				return 'Schema.Array(Schema.String)';
			case 'map':
				return 'Schema.Record(Schema.String, Schema.Unknown)';
			default:
				return 'Schema.String';
		}
	}
}

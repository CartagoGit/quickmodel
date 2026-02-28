/**
 * PrismaSchemaGenerator — Prisma schema generation from QuickModel decorator configuration.
 *
 * Produces a Prisma `.prisma` `model` block string from the type metadata
 * declared via `@Quick()` decorators.  The output can be pasted directly into
 * a Prisma schema file and refined (e.g. adding `@id`, relations, optionality).
 *
 * No external runtime dependencies — this generator is pure string composition,
 * consistent with `TypeScriptSchemaGenerator` and `GraphQLSchemaGenerator`.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link ValibotSchemaGenerator} — Valibot schema string equivalent
 * @see {@link YupSchemaGenerator} — Yup schema string equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('prisma')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/** Minimum extra padding added after the longest field name (for readability). */
const EXTRA_PAD = 2;

/**
 * Generates a Prisma schema `model` block string from QuickModel decorator configuration.
 *
 * Maps QuickModel type specs to Prisma scalar types:
 *
 * | QuickModel  | Prisma    |
 * |-------------|-----------|
 * | `Number`    | `Float`   |
 * | `String`    | `String`  |
 * | `Boolean`   | `Boolean` |
 * | `Date`      | `DateTime`|
 * | `BigInt`    | `BigInt`  |
 * | `Set`       | `Json`    |
 * | `Map`       | `Json`    |
 * | `Array`     | `Json`    |
 * | `Object`    | `Json`    |
 * | _(default)_ | `String`  |
 *
 * @example
 * ```ts
 * const prisma = PrismaSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { id: Number, name: String, createdAt: Date },
 *   properties: ['id', 'name', 'createdAt'],
 * });
 * // "model User {\n  id      Float\n  name    String\n  createdAt DateTime\n}"
 * ```
 *
 * @see {@link ISchemaGeneratorConfig} — config shape
 * @see {@link QModel.getSchema} — entry point for `getSchema('prisma')`
 * @see {@link ValibotSchemaGenerator} — Valibot equivalent
 * @see {@link YupSchemaGenerator} — Yup equivalent
 */
export class PrismaSchemaGenerator {
	/**
	 * Generates a Prisma `model` block as a string.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns A Prisma SDL `model` block string
	 *   (e.g. `"model User {\n  id    Float\n  name  String\n}"`)
	 * @see {@link ISchemaGeneratorConfig} — input shape
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;

		// Column width = longest field name + EXTRA_PAD for readability
		const maxPropLen = properties.reduce(
			(acc, prop) => Math.max(acc, prop.length),
			0
		);
		const colWidth = maxPropLen + EXTRA_PAD;

		let block = `model ${className} {\n`;

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			const prismaType =
				PrismaSchemaGenerator._getPrismaType(transformer);
			block += `\t${prop.padEnd(colWidth)}${prismaType}\n`;
		}

		block += '}';
		return block;
	}

	/**
	 * Maps a transformer token to its Prisma scalar type name.
	 *
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns Prisma scalar type string (e.g. `'Float'`, `'DateTime'`, `'Json'`)
	 */
	private static _getPrismaType(transformer: unknown): string {
		if (!transformer) {
			return 'String'; // default fallback
		}

		const name =
			typeof transformer === 'function'
				? (transformer as { name: string }).name
				: String(transformer);

		switch (name.toLowerCase()) {
			case 'number':
				return 'Float';
			case 'string':
				return 'String';
			case 'boolean':
				return 'Boolean';
			case 'date':
				return 'DateTime';
			case 'bigint':
				return 'BigInt';
			case 'set':
			case 'map':
			case 'array':
			case 'object':
				return 'Json';
			default:
				return 'String';
		}
	}
}

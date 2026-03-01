/**
 * DrizzleSchemaGenerator — Drizzle ORM `pgTable` column definition from QuickModel metadata.
 *
 * Produces a TypeScript source string that imports Drizzle ORM helpers and
 * declares a `const <classNameTable> = pgTable('<tableName>', { … })` with each
 * field mapped to the appropriate Drizzle column type.
 *
 * It targets the **PostgreSQL** dialect (`drizzle-orm/pg-core`) as default,
 * which is the most common. MySQL and SQLite imports follow the same API.
 *
 * **Zero runtime dependencies** — pure string composition.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link PrismaSchemaGenerator} — Prisma model block equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('drizzle')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/**
 * Converts a camelCase class name to a snake_case table name.
 * @internal
 */
function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
		.replace(/^_/, '');
}

/**
 * Generates a Drizzle ORM (`drizzle-orm/pg-core`) `pgTable` source string from
 * QuickModel decorator configuration.
 *
 * Maps QuickModel type specs to Drizzle column helpers:
 *
 * | QuickModel  | Drizzle column                              |
 * |-------------|---------------------------------------------|
 * | `Number`    | `integer('field')`                          |
 * | `String`    | `varchar('field', { length: 255 })`         |
 * | `Boolean`   | `boolean('field')`                          |
 * | `Date`      | `timestamp('field')`                        |
 * | `BigInt`    | `bigint('field', { mode: 'number' })`       |
 * | `Set`/`Map` | `json('field')`                             |
 * | _(default)_ | `varchar('field', { length: 255 })`         |
 *
 * @example
 * ```ts
 * const src = DrizzleSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { id: Number, name: String, createdAt: Date },
 *   properties: ['id', 'name', 'createdAt'],
 * });
 * ```
 *
 * @see {@link ISchemaGeneratorConfig} — config shape
 * @see {@link QModel.getSchema} — entry point for `getSchema('drizzle')`
 * @see {@link PrismaSchemaGenerator} — Prisma equivalent
 */
export class DrizzleSchemaGenerator {
	/**
	 * Generates a Drizzle ORM `pgTable` source string.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns TypeScript source string with the `pgTable` call and imports
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;
		const tableName = toSnakeCase(className) + 's';
		const varName = tableName.replace(/_([a-z])/g, (_, chr: string) =>
			chr.toUpperCase()
		);

		const usedTypes = new Set<string>();

		const columns = properties
			.map((prop) => {
				const transformer = decoratorConfig[prop];
				const { col, types } = DrizzleSchemaGenerator._getColumn(
					prop,
					transformer
				);
				types.forEach((typ) => usedTypes.add(typ));
				return `\t${prop}: ${col},`;
			})
			.join('\n');

		const imports = ['pgTable', ...usedTypes].sort().join(', ');

		return [
			`import { ${imports} } from 'drizzle-orm/pg-core';`,
			'',
			`export const ${varName} = pgTable('${tableName}', {`,
			columns,
			'});',
			'',
			`export type I${className}Select = typeof ${varName}.$inferSelect;`,
			`export type I${className}Insert = typeof ${varName}.$inferInsert;`,
			'',
		].join('\n');
	}

	/**
	 * Maps a transformer token to a Drizzle column helper call and the helper names used.
	 *
	 * @internal
	 * @param prop - The property name (used as column name)
	 * @param transformer - Transformer constructor or string token
	 * @returns Column expression string and helper names required in the import
	 */
	private static _getColumn(
		prop: string,
		transformer: unknown
	): { col: string; types: string[] } {
		const colName = toSnakeCase(prop);

		if (!transformer) {
			return {
				col: `varchar('${colName}', { length: 255 })`,
				types: ['varchar'],
			};
		}

		const name =
			typeof transformer === 'function'
				? (transformer as { name: string }).name
				: String(transformer);

		switch (name.toLowerCase()) {
			case 'number':
				return { col: `integer('${colName}')`, types: ['integer'] };
			case 'boolean':
				return { col: `boolean('${colName}')`, types: ['boolean'] };
			case 'date':
				return { col: `timestamp('${colName}')`, types: ['timestamp'] };
			case 'bigint':
				return {
					col: `bigint('${colName}', { mode: 'number' })`,
					types: ['bigint'],
				};
			case 'set':
			case 'map':
				return { col: `json('${colName}')`, types: ['json'] };
			default:
				return {
					col: `varchar('${colName}', { length: 255 })`,
					types: ['varchar'],
				};
		}
	}
}

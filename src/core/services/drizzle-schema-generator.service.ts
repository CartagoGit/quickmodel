/**
 * DrizzleSchemaGenerator — Drizzle ORM `pgTable` column definition from QuickModel metadata.
 *
 * Produces a TypeScript source string that declares a `export const <table> = pgTable(…)`
 * with each field mapped to the appropriate Drizzle column type (pg-core dialect).
 * The required import is included as a commented hint at the top of the output.
 *
 * **Zero runtime dependencies** — pure string composition.
 *
 * @see {@link ISchemaGeneratorConfig} — input shape accepted by `generate()`
 * @see {@link PrismaSchemaGenerator} — Prisma model block equivalent
 * @see {@link QModel.getSchema} — public API entry point (`getSchema('drizzle')`)
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/** @internal */
function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
		.replace(/^_/, '');
}

/** @internal */
function toCamelCase(str: string): string {
	return str.replace(/_([a-z])/g, (_, chr: string) => chr.toUpperCase());
}

/** @internal */
function isArrayToken(transformer: unknown): boolean {
	return Array.isArray(transformer);
}

/**
 * Generates a Drizzle ORM (`drizzle-orm/pg-core`) `pgTable` source string from
 * QuickModel decorator configuration.
 *
 * | QuickModel  | Drizzle column                              |
 * |-------------|---------------------------------------------|
 * | `Number`    | `integer('field')`                          |
 * | `String`    | `varchar('field', { length: 255 })`         |
 * | `Boolean`   | `boolean('field')`                          |
 * | `Date`      | `timestamp('field')`                        |
 * | `BigInt`    | `bigint('field', { mode: 'number' })`       |
 * | `[Type]`    | `jsonb('field')`                            |
 * | `Set`/`Map` | `jsonb('field')`                            |
 * | _(default)_ | `varchar('field', { length: 255 })`         |
 *
 * @see {@link ISchemaGeneratorConfig}
 * @see {@link QModel.getSchema}
 */
export class DrizzleSchemaGenerator {
	/**
	 * Generates a Drizzle ORM `pgTable` source string.
	 * The output **starts with `export const`** for direct use in a Drizzle project.
	 *
	 * @param config - Class name, decorator type-map, and ordered property list
	 * @returns TypeScript source string
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;
		const tableName = toSnakeCase(className) + 's';
		const varName = toCamelCase(tableName);

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

		const usedImports = ['pgTable', ...Array.from(usedTypes).sort()].join(
			', '
		);

		return [
			`export const ${varName} = pgTable('${tableName}', {`,
			columns,
			'});',
			'',
			`export type I${className}Select = typeof ${varName}.$inferSelect;`,
			`export type I${className}Insert = typeof ${varName}.$inferInsert;`,
			'',
			`// Required: import { ${usedImports} } from 'drizzle-orm/pg-core';`,
			'',
		].join('\n');
	}

	/** @internal */
	private static _getColumn(
		prop: string,
		transformer: unknown
	): { col: string; types: string[] } {
		const colName = toSnakeCase(prop);

		if (isArrayToken(transformer)) {
			return { col: `jsonb('${colName}')`, types: ['jsonb'] };
		}

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
			case 'array':
			case 'object':
				return { col: `jsonb('${colName}')`, types: ['jsonb'] };
			default:
				return {
					col: `varchar('${colName}', { length: 255 })`,
					types: ['varchar'],
				};
		}
	}
}

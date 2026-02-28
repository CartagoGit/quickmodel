/**
 * ZodSchemaGenerator – Zod schema generation with lazy-loaded `zod`
 *
 * `zod` is a required dependency but is NOT imported statically here.
 * Instead it is loaded on first use via `createRequire`, mirroring the
 * pattern already used for `@faker-js/faker` in `mock-generator.service.ts`.
 *
 * This means bundlers that resolve static-import graphs (webpack, esbuild,
 * Rollup/Vite) will NOT include `zod` in a consumer's bundle unless they
 * actually call `ZodSchemaGenerator.generate()` or `QModel.getSchema('zod')`.
 *
 * @see {@link ZodSchemaGenerator} — the class exported by this module
 * @see {@link JsonSchemaGenerator} — sibling service for JSON Schema Draft-07 output
 * @see {@link QModel.getSchema} — public API entry point that delegates to this generator
 */

import { createRequire } from 'node:module';
import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

// ─── Lazy Zod loader ──────────────────────────────────────────────────────────
const _req = createRequire(import.meta.url);

// Type-only import: erased at compile time, zero runtime/bundle cost.
// Provides full intellisense for callers while keeping zod out of static imports.
type IZodNs = (typeof import('zod'))['z'];

let _zodCache: IZodNs | undefined;

/** @internal Load `zod` on first use. */
function _getZod(): IZodNs {
	if (_zodCache) return _zodCache;
	const mod = _req('zod') as typeof import('zod');
	_zodCache = mod.z;
	return _zodCache;
}

/**
 * Generates a Zod validation schema (`z.ZodObject`) from QuickModel decorator configuration.
 *
 * Useful for runtime input validation with the same type information
 * already declared in the model's decorators.
 *
 * `zod` is loaded lazily on first call — it will not appear in the static
 * import graph of consumer bundles that never call this generator.
 *
 * @example
 * ```typescript
 * import { QZodSchemaGenerator } from 'quickmodel/advanced';
 *
 * const schema = QZodSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { id: Number, name: String },
 *   properties: ['id', 'name'],
 * });
 * schema.parse({ id: 1, name: 'Alice' }); // ✅
 * ```
 * @see {@link ISchemaGeneratorConfig} — config shape accepted by `generate()`
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 equivalent generator
 */
export class ZodSchemaGenerator {
	/**
	 * Generates a Zod `z.ZodObject` schema from a QuickModel decorator configuration.
	 *
	 * Each decorated property is mapped to a matching Zod type based on its
	 * transformer token (e.g. `Number` → `z.number()`, `Date` → `z.string().datetime()`).
	 * Unknown or missing tokens fall back to `z.string()`.
	 *
	 * @param config - Schema generation config (class name, decorator map, property list)
	 * @returns A Zod object schema with one entry per property in `config.properties`
	 *
	 * @see {@link ISchemaGeneratorConfig} for the config shape
	 * @see {@link JsonSchemaGenerator.generate} for the JSON Schema equivalent
	 */
	static generate(
		config: ISchemaGeneratorConfig
	): import('zod').z.ZodObject<any> {
		const { decoratorConfig, properties } = config;
		const zod = _getZod();
		const shape: Record<string, import('zod').z.ZodTypeAny> = {};

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			shape[prop] = this._getZodType(zod, transformer);
		}

		return zod.object(shape);
	}

	/**
	 * Maps a transformer token to a Zod schema type.
	 * @internal
	 */
	private static _getZodType(
		zod: IZodNs,
		transformer: unknown
	): import('zod').z.ZodTypeAny {
		if (!transformer) {
			return zod.string();
		}

		const transformerName =
			typeof transformer === 'function'
				? (transformer as { name: string }).name
				: String(transformer);

		switch (transformerName.toLowerCase()) {
			case 'number':
				return zod.number();
			case 'string':
				return zod.string();
			case 'boolean':
				return zod.boolean();
			case 'object':
				return zod.object({}).passthrough();
			case 'date':
				return zod.string().datetime();
			case 'bigint':
				return zod.string().regex(/^-?\d+$/);
			case 'set':
				return zod.array(zod.string());
			case 'map':
				return zod.array(zod.tuple([zod.string(), zod.any()]));
			case 'array':
				return zod.array(zod.any());
			default:
				return zod.string();
		}
	}
}

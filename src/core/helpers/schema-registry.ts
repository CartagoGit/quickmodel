/**
 * Schema Generator Registry — lazy-loading contract for `QModel.getSchema()`.
 *
 * This module holds a thin Map from schema-type strings to generator functions.
 * It has **zero runtime imports** so it never adds to the consumer bundle on its own.
 *
 * Generators are registered by importing `quickmodel/schema` (all formats) or
 * `quickmodel/schema/zod` (Zod only).  `quickmodel` (the default entry point)
 * imports `quickmodel/schema` automatically, so existing consumers are unaffected.
 *
 * Consumers that want the smallest possible bundle should import from
 * `quickmodel/core` and opt-in to generators explicitly:
 *
 * ```typescript
 * import { QModel } from 'quickmodel/core';
 * import 'quickmodel/schema'; // registers all generators → enables getSchema()
 * import 'quickmodel/mock';   // registers mock services → enables mock()
 * ```
 *
 * @see {@link registerSchemaGenerator} — called by `quickmodel/schema` on import
 * @see {@link getSchemaGenerator}      — called by `QModel.getSchema()` at runtime
 * @module core/helpers/schema-registry
 */

import type { ISchemaGeneratorConfig } from '@/core/services/schema-generators.service';

/** @internal A schema generator callable registered for a given format key. */
export type ISchemaGeneratorFn = (config: ISchemaGeneratorConfig) => unknown;

/**
 * @internal Function that adds example values to a JSON/OpenAPI schema from a model instance.
 * Provided by `JsonSchemaGenerator.addExamples`.
 */
export type IAddExamplesFn = (
	schema: Record<string, any>,
	instance: any
) => Record<string, any>;

/** @internal Map of format → generator function. */
const _generatorRegistry = new Map<string, ISchemaGeneratorFn>();

/** @internal The `addExamples` helper — set when schema module is registered. */
let _addExamplesFn: IAddExamplesFn | undefined;

/**
 * Registers a schema generator callable for a given format key.
 *
 * Called automatically when `quickmodel/schema` is imported.
 * Multiple calls for the same key overwrite the previous registration (idempotent).
 *
 * @param type   - Schema format key (e.g. `'json'`, `'zod'`, `'prisma'`)
 * @param genFn  - Generator function that receives an `ISchemaGeneratorConfig` and returns the schema
 * @see {@link getSchemaGenerator}
 */
export function registerSchemaGenerator(
	type: string,
	genFn: ISchemaGeneratorFn
): void {
	_generatorRegistry.set(type, genFn);
}

/**
 * Registers the `addExamples` helper used by the instance-level `getSchema()` for JSON/OpenAPI.
 * Called automatically when `quickmodel/schema` is imported.
 *
 * @param func - `JsonSchemaGenerator.addExamples` bound function
 */
export function registerAddExamplesFn(func: IAddExamplesFn): void {
	_addExamplesFn = func;
}

/**
 * Returns the registered generator for `type`, or `undefined` if not yet registered.
 *
 * @param type - Schema format key
 * @returns The generator function, or `undefined`
 * @see {@link registerSchemaGenerator}
 */
export function getSchemaGenerator(
	type: string
): ISchemaGeneratorFn | undefined {
	return _generatorRegistry.get(type);
}

/**
 * Returns the `addExamples` helper, or `undefined` if schema module has not been imported.
 *
 * @see {@link registerAddExamplesFn}
 */
export function getAddExamplesFn(): IAddExamplesFn | undefined {
	return _addExamplesFn;
}

/**
 * Returns `true` if at least one schema generator has been registered.
 * Useful for providing actionable error messages.
 */
export function hasSchemaGenerators(): boolean {
	return _generatorRegistry.size > 0;
}

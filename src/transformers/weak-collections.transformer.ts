/**
 * @fileoverview Weak collections transformer for QuickModel.
 *
 * Provides intentionally restricted transformers for `WeakMap` and `WeakSet` —
 * both are non-serializable by design. Attempting to serialize them throws.
 * Use `excludeFields` in `@Quick` options to omit them from serialization.
 *
 * @see {@link QModel.serialize} — will throw when encountering WeakMap/WeakSet fields
 * @see {@link Quick} — use `{ serialization: { excludeFields: ['field'] } }` to exclude
 * @module transformers/weak-collections
 */
import { BaseTransformer } from '@/core/bases/base-transformer';
import type { IQTransformContext } from '@/core/interfaces/transformer.interface';
import { QModelError } from '@/core/errors/quickmodel.error';

/**
 * Transformer for WeakMap collections with serialization restrictions
 *
 * @remarks
 * WeakMap is NOT serializable to JSON because:
 * - Keys are non-enumerable (can't be iterated)
 * - WeakMap has no .entries(), .keys(), or .values() methods
 * - Designed for runtime-only garbage-collected caching
 *
 * **Use case:** Runtime caching where automatic garbage collection is needed
 *
 * **Restriction:** Attempting to serialize will throw an error.
 * Use `excludeFields: ['cache']` option to exclude from serialization.
 *
 * @example
 * ```ts
 * // ✅ Valid: Runtime-only cache (excluded from serialization)
 * ＠Quick(
 *   { cache: WeakMap },
 *   { serialization: { excludeFields: ['cache'] } }
 * )
 * class UserService extends QModel<IUser> {
 *   declare cache: WeakMap<object, User>; // Auto GC
 * }
 *
 * // ❌ Invalid: Attempting to serialize
 * ＠Quick({ cache: WeakMap })
 * class Model extends QModel<IModel> {
 *   declare cache: WeakMap<object, string>;
 * }
 * model.$qToJSON(); // Throws error
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap | MDN WeakMap}
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link WeakSetTransformer} — related transformer for WeakSet
 */
export class WeakMapTransformer extends BaseTransformer<
	[any, any][],
	WeakMap<object, any>
> {
	/**
	 * Deserializes array of tuples into WeakMap.
	 *
	 * @param value - Array of [key, value] tuples from backend
	 * @param propertyKey - Property name (for error messages)
	 * @param className - Class name (for error messages)
	 * @returns WeakMap instance, or null if value is null/undefined
	 * @throws {QModelError} If keys are not objects
	 */
	deserialize(
		value: [any, any][] | null | undefined,
		_propertyKey: string,
		_className: string,
		_context?: IQTransformContext
	): WeakMap<object, any> | null {
		if (value === null || value === undefined) return null;
		if (!Array.isArray(value)) {
			throw new QModelError(
				`WeakMap deserialization expects array of tuples, got ${typeof value}`
			);
		}

		const weakMap = new WeakMap<object, any>();

		for (const [key, val] of value) {
			// WeakMap keys MUST be objects (not primitives)
			if (typeof key !== 'object' || key === null) {
				throw new QModelError(
					`WeakMap keys must be objects. Got ${typeof key}: ${JSON.stringify(key)}`
				);
			}

			// Auto-transform values if they look like special types
			let transformedValue = val;

			// Symbol detection: strings like "Symbol.for(key)"
			if (
				typeof val === 'string' &&
				val.startsWith('Symbol.for(') &&
				val.endsWith(')')
			) {
				const symbolKey = val.slice(11, -1); // Extract "key" from "Symbol.for(key)"
				transformedValue = Symbol.for(symbolKey);
			}

			weakMap.set(key, transformedValue);
		}

		return weakMap;
	}

	/**
	 * Serialization is NOT supported for WeakMap.
	 *
	 * @throws {QModelError} Always throws — WeakMap keys are not iterable/enumerable
	 */
	serialize(_value: WeakMap<object, any>): [any, any][] {
		throw new QModelError(
			'WeakMap cannot be serialized to JSON (keys are not iterable/enumerable). ' +
				'Use `excludeFields: ["fieldName"]` in @Quick() options to exclude from serialization, ' +
				'or use Map instead if serialization is needed.'
		);
	}

	/**
	 * Validates WeakMap instance
	 *
	 * @param value - Value to validate
	 * @returns true if valid WeakMap
	 */
	isValid(value: unknown): boolean {
		return value instanceof WeakMap;
	}
}

/**
 * Transformer for WeakSet collections with serialization restrictions
 *
 * @remarks
 * WeakSet is NOT serializable to JSON because:
 * - Values are non-enumerable (can't be iterated)
 * - WeakSet has no .values() or .entries() methods
 * - Designed for runtime-only garbage-collected tracking
 *
 * **Use case:** Runtime tracking where automatic garbage collection is needed
 *
 * **Restriction:** Attempting to serialize will throw an error.
 * Use `excludeFields: ['tracked']` option to exclude from serialization.
 *
 * @example
 * ```ts
 * // ✅ Valid: Runtime-only tracking (excluded from serialization)
 * ＠Quick(
 *   { tracked: WeakSet },
 *   { serialization: { excludeFields: ['tracked'] } }
 * )
 * class ComponentTracker extends QModel<ITracker> {
 *   declare tracked: WeakSet<HTMLElement>; // Auto GC
 * }
 *
 * // ❌ Invalid: Attempting to serialize
 * ＠Quick({ tracked: WeakSet })
 * class Model extends QModel<IModel> {
 *   declare tracked: WeakSet<object>;
 * }
 * model.$qToJSON(); // Throws error
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet | MDN WeakSet}
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link WeakMapTransformer} — related transformer for WeakMap
 */
export class WeakSetTransformer extends BaseTransformer<
	object[],
	WeakSet<object>
> {
	/**
	 * Deserializes array of objects into WeakSet.
	 *
	 * @param value - Array of objects from backend
	 * @param propertyKey - Property name (for error messages)
	 * @param className - Class name (for error messages)
	 * @returns WeakSet instance, or null if value is null/undefined
	 * @throws {QModelError} If values are not objects
	 */
	deserialize(
		value: object[] | null | undefined,
		_propertyKey: string,
		_className: string,
		_context?: IQTransformContext
	): WeakSet<object> | null {
		if (value === null || value === undefined) return null;
		if (!Array.isArray(value)) {
			throw new QModelError(
				`WeakSet deserialization expects array, got ${typeof value}`
			);
		}

		const weakSet = new WeakSet<object>();

		for (const item of value) {
			// WeakSet values MUST be objects (not primitives)
			if (typeof item !== 'object' || item === null) {
				throw new QModelError(
					`WeakSet values must be objects. Got ${typeof item}: ${JSON.stringify(item)}`
				);
			}

			weakSet.add(item);
		}

		return weakSet;
	}

	/**
	 * Serialization is NOT supported for WeakSet.
	 *
	 * @throws {QModelError} Always throws — WeakSet values are not iterable/enumerable
	 */
	serialize(_value: WeakSet<object>): object[] {
		throw new QModelError(
			'WeakSet cannot be serialized to JSON (values are not iterable/enumerable). ' +
				'Use `excludeFields: ["fieldName"]` in @Quick() options to exclude from serialization, ' +
				'or use Set instead if serialization is needed.'
		);
	}

	/**
	 * Validates WeakSet instance
	 *
	 * @param value - Value to validate
	 * @returns true if valid WeakSet
	 */
	isValid(value: unknown): boolean {
		return value instanceof WeakSet;
	}
}

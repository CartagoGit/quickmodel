/**
 * @fileoverview Map and Set transformers for QuickModel.
 *
 * `MapTransformer` — converts between `[K, V][]` / `Record<string, V>` and `Map<K, V>`.
 * `SetTransformer` — converts between `V[]` and `Set<V>`.
 *
 * @see {@link QModel.serialize} — triggers these transformers for Map/Set fields
 * @see {@link Quick} — use `@Quick({ field: Map })` / `@Quick({ field: Set })` to activate
 * @module transformers/map-set
 */
import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import { safeStringify } from '@/core/helpers/transform-helpers';
import {
	IQIntegrityContext,
	IQIntegrityResult,
	IQIntegrityChecker,
	IQTransformContext,
} from '../core/interfaces/transformer.interface';

/**
 * Transformer for Map type: converts between plain object and Map.
 *
 * **Serialization**: `Map<K, V>` → `Record<string, V>`
 * **Deserialization**: `Record<string, V>` → `Map<K, V>`
 *
 * @template K - The key type (converted to string during serialization)
 * @template V - The value type
 *
 * @remarks
 * Map keys are always converted to strings during JSON serialization.
 * Non-string keys will be stringified.
 *
 * @example
 * ```typescript
 * @Quick({ metadata: Map })
 * class Config extends QuickModel<IConfig> {
 *   declare metadata: Map<string, unknown>;
 * }
 *
 * const config = new Config({
 *   metadata: { key1: "value1", key2: 123 }
 * });
 * console.log(config.metadata instanceof Map); // true
 *
 * const data = config.serialize();
 * console.log(data.metadata); // { key1: "value1", key2: 123 }
 * ```
 */
export class MapTransformer<K = string, V = unknown>
	extends BaseTransformer<
		| Record<string, V>
		| { __type: 'Map'; entries: [K, V][] }
		| [string, V][],
		Map<K, V>
	>
	implements IQIntegrityChecker
{
	/**
	 * Auto-transforms keys and values based on detected types.
	 * Supports: Date (ISO strings), BigInt (string numbers), Symbol (Symbol.for), Error, etc.
	 */
	private autoTransformValue(value: unknown): unknown {
		if (value === null || value === undefined) return value;

		// Handle arrays recursively
		if (Array.isArray(value)) {
			// Check if it's a Map (array of tuples)
			const isMapEntries =
				value.length > 0 &&
				value.every((item) => Array.isArray(item) && item.length === 2);

			if (isMapEntries) {
				// Array of tuples → Map
				const transformedEntries = value.map(([key, val]) => [
					this.autoTransformKey(key),
					this.autoTransformValue(val),
				]);
				return new Map(transformedEntries as [any, any][]);
			}

			// Regular array → transform each element
			return value.map((item) => this.autoTransformValue(item));
		}

		// Date detection (ISO string - both full timestamp and date-only)
		if (typeof value === 'string') {
			// Full ISO: 2024-01-01T00:00:00.000Z
			// Date-only: 2024-01-01
			if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
				const date = new Date(value);
				if (!isNaN(date.getTime())) return date;
			}
		}

		// BigInt detection (numeric string that's too large for Number)
		if (typeof value === 'string' && /^\d{15,}$/.test(value)) {
			try {
				return BigInt(value);
			} catch {
				return value;
			}
		}

		// Error object detection
		if (
			typeof value === 'object' &&
			value !== null &&
			'name' in value &&
			'message' in value &&
			typeof (value as any).name === 'string' &&
			typeof (value as any).message === 'string'
		) {
			const error = new Error((value as any).message);
			error.name = (value as any).name;
			if ('stack' in value) error.stack = (value as any).stack as string;
			return error;
		}

		return value;
	}

	/**
	 * Auto-transforms keys (mainly for Symbol detection).
	 */
	private autoTransformKey(key: unknown): unknown {
		// Symbol detection (string like 'global.something')
		if (typeof key === 'string' && key.includes('.')) {
			return Symbol.for(key);
		}
		return key;
	}

	/**
	 * Converts a plain object, `__type` envelope, or array of tuples to a `Map<K, V>`.
	 *
	 * Accepted input formats:
	 * - Plain object `{ key: value }` (keys become map keys)
	 * - `{ __type: 'Map', entries: [[key, val], ...] }` (round-trip from `serialize()`)
	 * - Array of 2-tuples `[[key, val], ...]`
	 * - Existing `Map` instance (returned as-is)
	 *
	 * @param value   - The raw data to convert.
	 * @param propertyKey - Property name (for error messages).
	 * @param className   - Class name (for error messages).
	 * @returns A `Map<K, V>` instance, or `null` when `value` is `null`/`undefined`.
	 * @throws {QModelError} When a prototype-pollution key is detected or when a
	 *   `{ __type: 'Map' }` envelope exceeds the configured `maxItems` limit.
	 */
	deserialize(
		value:
			| Record<string, V>
			| { __type: 'Map'; entries: [K, V][] }
			| Map<K, V>
			| [K, V][]
			| [string, V][]
			| null
			| undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): Map<K, V> | null {
		if (value === null || value === undefined) return null;

		if (value instanceof Map) {
			return value;
		}

		const isUnsafeKey = (key: unknown): boolean => {
			if (typeof key !== 'string') return false;
			return (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			);
		};

		// Handle new format with __type marker
		if (
			typeof value === 'object' &&
			value !== null &&
			'__type' in value &&
			value.__type === 'Map'
		) {
			const rawEntries = (value as { __type: 'Map'; entries: [K, V][] })
				.entries;
			// SECURITY: Prevent DoS via limit
			const maxItems =
				(
					_context?.metadata?.transformerOptions as {
						maxItems?: number;
					}
				)?.maxItems || 1_000_000;

			if (Array.isArray(rawEntries) && rawEntries.length > maxItems) {
				throw new QModelError(
					`${className}.${propertyKey}: Map input too large (> ${maxItems} items).`,
					{
						className,
						propertyKey,
						value: 'TRUNCATED',
						expectedType: 'Map data',
					}
				);
			}

			// Filter unsafe keys and auto-transform entries
			const entries = Array.isArray(rawEntries)
				? rawEntries
						.filter(([key]) => !isUnsafeKey(key))
						.map(
							([key, val]) =>
								[
									this.autoTransformKey(key),
									this.autoTransformValue(val),
								] as [K, V]
						)
				: rawEntries;

			return new Map(entries);
		}

		// Handle array of [key, value] pairs (from backend)
		if (Array.isArray(value)) {
			// SECURITY: Prevent DoS via limit
			const maxItems =
				(
					_context?.metadata?.transformerOptions as {
						maxItems?: number;
					}
				)?.maxItems || 1_000_000;

			if (value.length > maxItems) {
				throw new QModelError(
					`${className}.${propertyKey}: Map input too large (> ${maxItems} items).`,
					{
						className,
						propertyKey,
						value: 'TRUNCATED',
						expectedType: 'Map data',
					}
				);
			}

			try {
				// Auto-transform keys and values
				const transformedEntries = value.map(
					([key, val]) =>
						[
							this.autoTransformKey(key),
							this.autoTransformValue(val),
						] as [K, V]
				);
				return new Map(transformedEntries);
			} catch (error) {
				throw new QModelError(
					`MapTransformer.deserialize: Invalid Map data format. ` +
						`Expected array of [key, value] pairs, got: ${safeStringify(value)}. ` +
						`Error: ${error instanceof Error ? error.message : String(error)}`,
					{
						className,
						propertyKey,
						value,
						expectedType: 'array of [key, value] pairs',
					}
				);
			}
		}

		// Flexible input: plain object format { key: value, ... }
		// Accepts any JSON object and converts it to a Map, filtering unsafe prototype keys.
		if (typeof value !== 'object' || value === null) {
			throw new QModelError(
				`${className}.${propertyKey}: Expected object or array for Map, got ${typeof value}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'object | array',
				}
			);
		}

		// SECURITY: Prevent DoS via limit
		const maxItems =
			(_context?.metadata?.transformerOptions as { maxItems?: number })
				?.maxItems || 1_000_000;

		// Use Object.keys first to avoid creating potentially massive entries array if already too big
		const keys = Object.keys(value);
		if (keys.length > maxItems) {
			throw new QModelError(
				`${className}.${propertyKey}: Map input too large (> ${maxItems} items).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: 'Map data',
				}
			);
		}

		// Filter unsafe keys and auto-transform for object input
		const safeEntries = Object.entries(value)
			.filter(([key]) => !isUnsafeKey(key))
			.map(
				([key, val]) =>
					[
						this.autoTransformKey(key),
						this.autoTransformValue(val),
					] as [K, V]
			);
		return new Map(safeEntries as Iterable<[K, V]>);
	}

	/**
	 * Converts a Map to a plain object or array of tuples.
	 * If the Map has Symbol keys, returns array of tuples to preserve them.
	 *
	 * @param value - The Map to serialize
	 * @returns Plain object with stringified keys OR array of [key, value] tuples if Symbol keys exist
	 */
	serialize(value: Map<K, V>): Record<string, V> | [string, V][] {
		const isUnsafeKey = (key: unknown): boolean => {
			if (typeof key !== 'string') return false;
			return (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			);
		};

		// Check if map has Symbol keys
		const hasSymbolKeys = Array.from(value.keys()).some(
			(key) => typeof key === 'symbol'
		);

		// If has Symbol keys, serialize as array of tuples to preserve Symbol info
		if (hasSymbolKeys) {
			const entries = Array.from(value.entries())
				.filter(([key]) => !isUnsafeKey(key))
				.map(([key, val]) => {
					// Convert Symbol to string (Symbol.keyFor or description)
					const keyStr =
						typeof key === 'symbol'
							? (Symbol.keyFor(key) ??
								key.description ??
								String(key))
							: String(key);

					// Recursively serialize values
					const serializedValue = this.serializeValue(val);

					return [keyStr, serializedValue] as [string, V];
				});
			return entries;
		}

		// Filter unsafe keys before Object.fromEntries to prevent Prototype Poisoning
		const entries = Array.from(value.entries())
			.filter(([key]) => !isUnsafeKey(key))
			.map(([key, val]) => [String(key), this.serializeValue(val)]);

		return Object.fromEntries(entries) as Record<string, V>;
	}

	/**
	 * Helper to recursively serialize nested values (Date → ISO string, BigInt → string, etc.)
	 */
	private serializeValue(value: unknown): any {
		if (value === null || value === undefined) return value;

		// Date → ISO string
		if (value instanceof Date) {
			return value.toISOString();
		}

		// BigInt → string
		if (typeof value === 'bigint') {
			return value.toString();
		}

		// Error → object
		if (value instanceof Error) {
			return {
				name: value.name,
				message: value.message,
				stack: value.stack,
			};
		}

		// Map → recursively serialize
		if (value instanceof Map) {
			const hasSymbols = Array.from(value.keys()).some(
				(key) => typeof key === 'symbol'
			);
			if (hasSymbols) {
				return Array.from(value.entries()).map(([key, val]) => [
					typeof key === 'symbol'
						? (Symbol.keyFor(key) ?? key.description ?? String(key))
						: String(key),
					this.serializeValue(val),
				]);
			}
			return Object.fromEntries(
				Array.from(value.entries()).map(([key, val]) => [
					String(key),
					this.serializeValue(val),
				])
			);
		}

		// Set → array
		if (value instanceof Set) {
			return Array.from(value).map((item) => this.serializeValue(item));
		}

		// Array → map each element
		if (Array.isArray(value)) {
			return value.map((item) => this.serializeValue(item));
		}

		return value;
	}

	/**
	 * Validates that `value` is a valid Map representation.
	 *
	 * Accepts: a `Map` instance, an array of `[key, value]` pairs,
	 * or a plain object (which will be converted via `Object.entries`).
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `Map`, entry arrays, and plain objects;
	 *          `{ isValid: false, error }` for primitives and other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof Map) {
			return { isValid: true };
		}

		if (Array.isArray(value)) {
			return { isValid: true };
		}

		if (typeof value === 'object' && value !== null) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected Map, array or object, got ${typeof value}`,
		};
	}
}

/**
 * Transformer for Set type: converts between array and Set.
 *
 * **Serialization**: `Set<V>` → `V[]`
 * **Deserialization**: `V[]` → `Set<V>`
 *
 * @template V - The element type
 *
 * @remarks
 * Automatically removes duplicate values when creating Set from array.
 *
 * @example
 * ```typescript
 * @Quick({ tags: Set })
 * class Config extends QuickModel<IConfig> {
 *   declare tags: Set<string>;
 * }
 *
 * const config = new Config({
 *   tags: ["tag1", "tag2", "tag1"] // duplicate will be removed
 * });
 * console.log(config.tags instanceof Set); // true
 * console.log(config.tags.size); // 2
 *
 * const data = config.serialize();
 * console.log(Array.isArray(data.tags)); // true
 * ```
 */
export class SetTransformer<V = unknown>
	extends BaseTransformer<V[] | { __type: 'Set'; values: V[] }, Set<V>>
	implements IQIntegrityChecker
{
	/**
	 * Auto-transforms values based on detected types (same as MapTransformer).
	 */
	private autoTransformValue(value: unknown): unknown {
		if (value === null || value === undefined) return value;

		// Handle arrays recursively
		if (Array.isArray(value)) {
			// Check if it's a Map (array of tuples)
			const isMapEntries =
				value.length > 0 &&
				value.every((item) => Array.isArray(item) && item.length === 2);

			if (isMapEntries) {
				// Array of tuples → Map
				const transformedEntries = value.map(([key, val]) => [
					key, // Keys in Set values are not transformed (no Symbol keys here)
					this.autoTransformValue(val),
				]);
				return new Map(transformedEntries as [any, any][]);
			}

			// Regular array → transform each element
			return value.map((item) => this.autoTransformValue(item));
		}

		// Date detection (ISO string - both full timestamp and date-only)
		if (typeof value === 'string') {
			if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
				const date = new Date(value);
				if (!isNaN(date.getTime())) return date;
			}
		}

		// BigInt detection (numeric string that's too large for Number)
		if (typeof value === 'string' && /^\d{15,}$/.test(value)) {
			try {
				return BigInt(value);
			} catch {
				return value;
			}
		}

		// Error object detection
		if (
			typeof value === 'object' &&
			value !== null &&
			'name' in value &&
			'message' in value &&
			typeof (value as any).name === 'string' &&
			typeof (value as any).message === 'string'
		) {
			const error = new Error((value as any).message);
			error.name = (value as any).name;
			if ('stack' in value) error.stack = (value as any).stack as string;
			return error;
		}

		return value;
	}

	/**
	 * Converts an array or `__type` envelope to a `Set<V>`.
	 *
	 * Accepted input formats:
	 * - Plain array `[v1, v2, ...]` (each element becomes a set entry)
	 * - `{ __type: 'Set', values: [...] }` (round-trip from `serialize()`)
	 * - Existing `Set` instance (returned as-is)
	 *
	 * @param value   - The raw data to convert.
	 * @param propertyKey - Property name (for error messages).
	 * @param className   - Class name (for error messages).
	 * @returns A `Set<V>` instance, or `null` when `value` is `null`/`undefined`.
	 * @throws {QModelError} When the input format is invalid.
	 */
	deserialize(
		value: V[] | { __type: 'Set'; values: V[] } | Set<V> | null | undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): Set<V> | null {
		if (value === null || value === undefined) return null;

		if (value instanceof Set) {
			return value;
		}

		// Handle new format with __type marker
		if (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value) &&
			'__type' in value &&
			value.__type === 'Set'
		) {
			const values = (value as { __type: 'Set'; values: V[] }).values;
			// SECURITY: Prevent DoS via limit
			const maxItems =
				(
					_context?.metadata?.transformerOptions as {
						maxItems?: number;
					}
				)?.maxItems || 1_000_000;

			if (Array.isArray(values) && values.length > maxItems) {
				throw new QModelError(
					`${className}.${propertyKey}: Set input too large (> ${maxItems} items).`,
					{
						className,
						propertyKey,
						value: 'TRUNCATED',
						expectedType: 'Set data',
					}
				);
			}
			// Auto-transform values
			const transformedValues = Array.isArray(values)
				? values.map((val) => this.autoTransformValue(val) as V)
				: values;
			return new Set(transformedValues);
		}

		// Flexible input: plain array format [value1, value2, ...]
		// Accepts any JSON array and converts it to a Set.
		if (!Array.isArray(value)) {
			throw new QModelError(
				`${className}.${propertyKey}: Expected array for Set, got ${typeof value}`,
				{ className, propertyKey, value, expectedType: 'array' }
			);
		}

		// SECURITY: Prevent DoS via limit
		const maxItems =
			(_context?.metadata?.transformerOptions as { maxItems?: number })
				?.maxItems || 1_000_000;

		if (value.length > maxItems) {
			throw new QModelError(
				`${className}.${propertyKey}: Set input too large (> ${maxItems} items).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: 'Set data',
				}
			);
		}

		// Auto-transform values
		const transformedValues = value.map(
			(val) => this.autoTransformValue(val) as V
		);
		return new Set(transformedValues);
	}

	/**
	 * Converts a Set to a plain array.
	 * Recursively serializes nested values (Maps, Dates, BigInts, etc.)
	 *
	 * @param value - The Set to serialize
	 * @returns Array of values
	 */
	serialize(value: Set<V>): V[] {
		return Array.from(value).map((item) => this.serializeSetValue(item));
	}

	/**
	 * Helper to recursively serialize nested values in Set
	 */
	private serializeSetValue(value: unknown): any {
		if (value === null || value === undefined) return value;

		// Date → ISO string
		if (value instanceof Date) {
			return value.toISOString();
		}

		// BigInt → string
		if (typeof value === 'bigint') {
			return value.toString();
		}

		// Error → object
		if (value instanceof Error) {
			return {
				name: value.name,
				message: value.message,
				stack: value.stack,
			};
		}

		// Map → array of tuples or object
		if (value instanceof Map) {
			const hasSymbols = Array.from(value.keys()).some(
				(key) => typeof key === 'symbol'
			);
			if (hasSymbols) {
				return Array.from(value.entries()).map(([key, val]) => [
					typeof key === 'symbol'
						? (Symbol.keyFor(key) ?? key.description ?? String(key))
						: String(key),
					this.serializeSetValue(val),
				]);
			}
			return Object.fromEntries(
				Array.from(value.entries()).map(([key, val]) => [
					String(key),
					this.serializeSetValue(val),
				])
			);
		}

		// Set → array
		if (value instanceof Set) {
			return Array.from(value).map((item) =>
				this.serializeSetValue(item)
			);
		}

		// Array → map each element
		if (Array.isArray(value)) {
			return value.map((item) => this.serializeSetValue(item));
		}

		return value;
	}

	/**
	 * Validates that `value` is a valid `Set` representation.
	 *
	 * Accepts: a `Set` instance, a plain array (will be converted via `new Set(arr)`),
	 * or the structured token `{ __type: 'Set', values: … }`.
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `Set`, arrays, and `{ __type: 'Set' }` objects;
	 *          `{ isValid: false, error }` for all other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof Set || Array.isArray(value)) {
			return { isValid: true };
		}

		if (
			typeof value === 'object' &&
			value !== null &&
			'__type' in value &&
			(value as { __type: string }).__type === 'Set'
		) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected Set or array, got ${typeof value}`,
		};
	}
}

/** Pre-registered singleton instance of {@link MapTransformer}. */
export const mapTransformer = new MapTransformer();
/** Pre-registered singleton instance of {@link SetTransformer}. */
export const setTransformer = new SetTransformer();

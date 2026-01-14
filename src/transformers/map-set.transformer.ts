import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import { safeStringify } from '@/core/helpers/transform-helpers';
import {
	IQValidationContext,
	IQValidationResult,
	IQValidator,
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
		Record<string, V> | { __type: 'Map'; entries: [K, V][] },
		Map<K, V>
	>
	implements IQValidator
{
	/**
	 * Converts a plain object or __type format to Map.
	 *
	 * @param value - The value to convert (object, {__type, entries}, or Map)
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns A Map instance
	 * @throws {Error} If the value is not an object or Map
	 */
	deserialize(
		value:
			| Record<string, V>
			| { __type: 'Map'; entries: [K, V][] }
			| Map<K, V>
			| [K, V][]
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

			// Filter unsafe keys
			const entries = Array.isArray(rawEntries)
				? rawEntries.filter(([k]) => !isUnsafeKey(k))
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
				// Map keys are safe, no need to filter for map construction
				return new Map(value);
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

		// Handle legacy plain object format
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

		// Filter unsafe keys for object input
		const safeEntries = Object.entries(value).filter(
			([k]) => !isUnsafeKey(k)
		);
		return new Map(safeEntries as Iterable<[K, V]>);
	}

	/**
	 * Converts a Map to a plain object.
	 *
	 * @param value - The Map to serialize
	 * @returns Plain object with stringified keys
	 */
	serialize(value: Map<K, V>): Record<string, V> {
		const isUnsafeKey = (key: unknown): boolean => {
			if (typeof key !== 'string') return false;
			return (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			);
		};

		// Filter unsafe keys before Object.fromEntries to prevent Prototype Poisoning
		const entries = Array.from(value.entries()).filter(
			([k]) => !isUnsafeKey(k)
		);
		return Object.fromEntries(entries) as Record<string, V>;
	}

	/**
	 * Validates if a value is a Map or plain object.
	 *
	 * @param value - The value to validate
	 * @param context - Validation context with property and class information
	 * @returns Validation result
	 */
	validate(value: unknown, context: IQValidationContext): IQValidationResult {
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
	implements IQValidator
{
	/**
	 * Converts an array or __type format to Set.
	 *
	 * @param value - The value to convert (array, {__type, values}, or Set)
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns A Set instance
	 * @throws {Error} If the value is not an array or Set
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
			return new Set(values);
		}

		// Handle legacy plain array format
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

		return new Set(value);
	}

	/**
	 * Converts a Set to a plain array.
	 *
	 * @param value - The Set to serialize
	 * @returns Array of values
	 */
	serialize(value: Set<V>): V[] {
		return Array.from(value);
	}

	/**
	 * Validates if a value is a Set or array.
	 *
	 * @param value - The value to validate
	 * @param context - Validation context with property and class information
	 * @returns Validation result
	 */
	validate(value: unknown, context: IQValidationContext): IQValidationResult {
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

export const mapTransformer = new MapTransformer();
export const setTransformer = new SetTransformer();

/**
 * Service for serializing model instances to JSON-compatible format.
 *
 * **IMPORTANT:** This service ONLY handles JSON serialization. For preserving original
 * input formats, see `ToInterfaceService`.
 *
 * **Key differences:**
 * - `serializer.serialize()` → Converts to JSON-compatible (Date → ISO string, BigInt → string, etc.)
 * - `toInterfaceService.toInterface()` → Preserves ORIGINAL input format from constructor
 *
 * Converts QuickModel instances and their fields into plain objects suitable
 * for JSON serialization, using registered transformers for type conversions.
 *
 * @template TModel - The model type (extends Record)
 * @template TInterface - The IQSerialized interface type
 *
 * @remarks
 * **SOLID principles:**
 * - **Single Responsibility**: Only handles JSON serialization (no format preservation)
 * - **Open/Closed**: Extensible via transformer registry
 * - **Dependency Inversion**: Depends on IQTransformer abstraction
 *
 * **Serialization process:**
 * 1. Iterates through all model properties
 * 2. Looks up transformers for special types (Date → ISO string, URL → string, Map → object, etc.)
 * 3. Falls back to default serialization if no transformer found
 * 4. Handles nested models recursively via `serialize()` method
 *
 * **Output format (JSON-compatible):**
 * - `Date` → ISO 8601 string `"2024-01-01T00:00:00.000Z"`
 * - `BigInt` → string `"999999999999999"`
 * - `RegExp` → object `{ source: "^test$", flags: "gi" }`
 * - `Symbol` → string (via Symbol.keyFor)
 * - `URL` → string href
 * - `Map` → object `{ key1: value1, key2: value2 }`
 * - `Set` → array `[value1, value2, value3]`
 * - `Error` → object `{ message, stack, name }`
 * - TypedArrays → number/string arrays
 * - Nested models → recursively IQSerialized
 *
 * @example
 * **Basic serialization**
 * ```typescript
 * const serializer = new Serializer();
 *
 * @Quick({
 *   name: 'string',
 *   birthDate: Date,
 *   tags: Set
 * })
 * class User extends QuickModel<IUser> {
 *   declare name: string;
 *   declare birthDate: Date;
 *   declare tags: Set<string>;
 * }
 *
 * const user = new User({
 *   name: "John",
 *   birthDate: new Date("2000-01-01"),
 *   tags: new Set(["admin", "user"])
 * });
 *
 * const json = serializer.serialize(user);
 * // { name: "John", birthDate: "2000-01-01T00:00:00.000Z", tags: ["admin", "user"] }
 *
 * const jsonString = serializer.serializeToJson(user);
 * // '{"name":"John","birthDate":"2000-01-01T00:00:00.000Z","tags":["admin","user"]}'
 * ```
 *
 * @example
 * **Complex types serialization**
 * ```typescript
 * const account = new Account({
 *   balance: 999999999999999n,    // BigInt
 *   pattern: /^test$/gi,           // RegExp
 *   metadata: new Map([['key', 'value']])  // Map
 * });
 *
 * account.serialize();
 * // {
 * //   balance: "999999999999999",
 * //   pattern: { source: "^test$", flags: "gi" },
 * //   metadata: { key: "value" }
 * // }
 * ```
 */

import { CaseHelper } from '@/core/helpers/case.helper';
import {
	IQSerializer,
	IQSerializationOptions,
} from '../interfaces/serializer.interface';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { DateTransformer } from '@/transformers/date.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
import { SymbolTransformer } from '@/transformers/symbol.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';
import {
	URLTransformer,
	URLSearchParamsTransformer,
} from '@/transformers/web-apis.transformer';
import {
	MapTransformer,
	SetTransformer,
} from '@/transformers/map-set.transformer';
import { IQTransformer } from '../interfaces/transformer.interface';
import { QTransformerRegistry } from '../registry/transformer.registry';
import 'reflect-metadata';
import {
	QUICK_TYPE_MAP_KEY,
	QUICK_OPTIONS_KEY,
	QUICK_DECORATOR_KEY,
} from '../constants/metadata-keys';
import { QConfig } from '../config/quick.config';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';

export class Serializer<
	TModel extends Record<string, unknown> = Record<string, unknown>,
	TInterface extends Record<string, unknown> = Record<string, unknown>,
> implements IQSerializer<TModel, TInterface> {
	private readonly transformers: Map<
		string | Function,
		IQTransformer<unknown, unknown>
	>;

	/**
	 * Creates a model serializer.
	 */
	constructor() {
		// Initialize transformers
		this.transformers = new Map();

		const dateTransformer = new DateTransformer();
		const bigintTransformer = new BigIntTransformer();
		const symbolTransformer = new SymbolTransformer();
		const regexpTransformer = new RegExpTransformer();
		const errorTransformer = new ErrorTransformer();
		const urlTransformer = new URLTransformer();
		const urlSearchParamsTransformer = new URLSearchParamsTransformer();
		const mapTransformer = new MapTransformer();
		const setTransformer = new SetTransformer();

		// Register by name and constructor
		this.transformers.set('date', dateTransformer);
		this.transformers.set(Date, dateTransformer);
		this.transformers.set('bigint', bigintTransformer);
		this.transformers.set('symbol', symbolTransformer);
		this.transformers.set('regexp', regexpTransformer);
		this.transformers.set(RegExp, regexpTransformer);
		this.transformers.set('error', errorTransformer);
		this.transformers.set(Error, errorTransformer);
		this.transformers.set(URL, urlTransformer);
		this.transformers.set(URLSearchParams, urlSearchParamsTransformer);
		this.transformers.set('map', mapTransformer);
		this.transformers.set(Map, mapTransformer);
		this.transformers.set('set', setTransformer);
		this.transformers.set(Set, setTransformer);

		// Register typed arrays
		this.transformers.set(
			Int8Array,
			new TypedArrayTransformer<Int8Array>(Int8Array)
		);
		this.transformers.set(
			Uint8Array,
			new TypedArrayTransformer<Uint8Array>(Uint8Array)
		);
		this.transformers.set(
			Int16Array,
			new TypedArrayTransformer<Int16Array>(Int16Array)
		);
		this.transformers.set(
			Uint16Array,
			new TypedArrayTransformer<Uint16Array>(Uint16Array)
		);
		this.transformers.set(
			Int32Array,
			new TypedArrayTransformer<Int32Array>(Int32Array)
		);
		this.transformers.set(
			Uint32Array,
			new TypedArrayTransformer<Uint32Array>(Uint32Array)
		);
		this.transformers.set(
			Float32Array,
			new TypedArrayTransformer<Float32Array>(Float32Array)
		);
		this.transformers.set(
			Float64Array,
			new TypedArrayTransformer<Float64Array>(Float64Array)
		);
		this.transformers.set(
			BigInt64Array,
			new TypedArrayTransformer<BigInt64Array>(BigInt64Array, true)
		);
		this.transformers.set(
			BigUint64Array,
			new TypedArrayTransformer<BigUint64Array>(BigUint64Array, true)
		);
	}

	/**
	 * Serializes a model instance to plain object using transformers.
	 *
	 * @param model - The model instance to serialize
	 * @param seen - Optional WeakSet to track circular references
	 * @param options - Optional serialization options
	 * @returns Plain object suitable for JSON serialization with transformers applied
	 *
	 * @remarks
	 * Uses transformers to convert special types (BigInt, Date, RegExp, etc.) to JSON-compatible format.
	 */
	serialize(
		model: TModel,
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): TInterface {
		// Resolve Configuration (DateStrategy, Case, etc.)
		let activeOptions = options;
		// Combine incoming options with model defaults if options are missing properties
		// This handles the first call (no options) and recursive calls (inheriting options)
		// But recursive calls should preferably respect Child Model config for some things?
		// DateStrategy was fixed. transformCase should probably follow similar logic.

		if (!options?.dateStrategy || !options?.transformCase) {
			const modelOptions = Reflect.getMetadata(
				QUICK_OPTIONS_KEY,
				model.constructor
			) as IQAdvancedOptions;

			const globalDefaults = QConfig.get().defaults;

			const dateStrategy =
				modelOptions?.dateStrategy ??
				globalDefaults?.dateStrategy ??
				'iso';

			const transformCase =
				modelOptions?.transformCase ?? globalDefaults?.transformCase;

			const exposeUnsetFields =
				modelOptions?.exposeUnsetFields ??
				globalDefaults?.exposeUnsetFields;

			const newOptions: IQSerializationOptions = { ...(options || {}) };

			if (!options?.dateStrategy && dateStrategy !== 'iso') {
				newOptions.dateStrategy = dateStrategy;
			}
			if (!options?.transformCase && transformCase) {
				newOptions.transformCase = transformCase;
			}
			if (
				!options?.exposeUnsetFields &&
				exposeUnsetFields !== undefined
			) {
				newOptions.exposeUnsetFields = exposeUnsetFields;
			}
			// Only update if something changed (to avoid object creation spam if optimization needed)
			// But here simplistic approach is safer
			activeOptions = newOptions;
		}

		const depth = activeOptions?._depth || 0;
		// SECURITY: Prevent Stack Overflow
		const MAX_DEPTH = 512;
		if (depth > MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${MAX_DEPTH}) exceeded during serialization.`
			);
		}

		const result: Record<string, unknown> = {};

		// Cycle detection
		const visited = seen || new WeakSet<object>();
		if (visited.has(model)) {
			// Circular reference detected
			// We return a special marker that is JSON compatible but informative
			return { __circular: true } as unknown as TInterface;
			// Or we could throw, but returning a safe value is often better for logging
		}
		visited.add(model);

		// Get all property keys
		const keys = new Set<string>();
		for (const key of Object.keys(model as object)) {
			keys.add(key);
		}

		let proto = Object.getPrototypeOf(model);
		while (proto && proto !== Object.prototype) {
			for (const key of Object.getOwnPropertyNames(proto)) {
				const descriptor = Object.getOwnPropertyDescriptor(proto, key);
				if (
					descriptor &&
					(descriptor.get || descriptor.set) &&
					key !== 'constructor'
				) {
					keys.add(key);
				}
			}
			proto = Object.getPrototypeOf(proto);
		}

		// Get TypeMap from model constructor
		const typeMap = Reflect.getMetadata(
			QUICK_TYPE_MAP_KEY,
			model.constructor
		);

		// Serialize with transformers
		for (const key of keys) {
			// SECURITY: Prevent Prototype Pollution
			if (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			) {
				continue;
			}

			if (key.startsWith('__')) {
				if (!activeOptions?.includeDoubleUnderscore) continue;
			} else if (key.startsWith('_')) {
				if (!activeOptions?.includeUnderscore) continue;
			}

			const value = (model as unknown as Record<string, unknown>)[key];

			// Exclude undefined values unless explicitly exposed
			if (value === undefined && !activeOptions?.exposeUnsetFields) {
				continue;
			}

			// Calculate Output Key (Case Transformation)
			let outputKey = key;
			if (activeOptions?.transformCase?.out) {
				outputKey = CaseHelper.toCase(
					activeOptions.transformCase.out,
					key
				);
			}

			// Custom Transformer Object check (Bidirectional transformers in TypeMap)
			if (typeMap && typeMap[key]) {
				const mapValue = typeMap[key];

				if (
					typeof mapValue === 'object' &&
					mapValue !== null &&
					!Array.isArray(mapValue) &&
					'serialize' in mapValue
				) {
					// Use custom transformer serializer
					// Pass context so transformers can access global config (like dateStrategy)
					const context = {
						propertyKey: key,
						className: model.constructor.name,
						metadata: activeOptions as any,
					};
					result[outputKey] = (mapValue as IQTransformer).serialize(
						value,
						context
					);
					continue;
				}
			}

			result[outputKey] = this.serializeValue(value, visited, {
				...activeOptions,
				_depth: depth + 1,
			});
		}

		return result as TInterface;
	}

	/**
	 * Serializes a model instance to JSON string.
	 *
	 * @param model - The model instance to serialize
	 * @returns JSON string representation
	 */
	serializeToJson(model: TModel, options?: IQSerializationOptions): string {
		return JSON.stringify(this.serialize(model, undefined, options));
	}

	/**
	 * Serializes a single value based on its type.
	 *
	 * @param value - The value to serialize
	 * @param seen - WeakSet to track circular references
	 * @param options - Serialization options for nested structures
	 * @returns IQSerialized value suitable for JSON
	 *
	 * @remarks
	 * Handles special types in priority order:
	 * 1. Date → ISO string
	 * 2. URL → href string
	 * 3. URLSearchParams → query string
	 * 4. BigInt → string
	 * 5. Symbol → string (via Symbol.keyFor)
	 * 6. RegExp → object with source/flags
	 * 7. Error → object with message/stack/name
	 * 8. TypedArrays → number/string arrays
	 * 9. ArrayBuffer/DataView → byte arrays
	 * 10. Nested models → recursive serialization
	 * 11. Arrays → element-wise serialization
	 * 12. Map → object
	 * 13. Set → array
	 * 14. Primitives → as-is
	 */
	private serializeValue(
		value: unknown,
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): unknown {
		const depth = options?._depth || 0;
		// SECURITY: Prevent Stack Overflow
		const MAX_DEPTH = 512;
		if (depth > MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${MAX_DEPTH}) exceeded during value serialization.`
			);
		}

		// Containers (Set, Map, Array) - Handle FIRST to support recursion & cycles
		if (value instanceof Map) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			const result: Record<string, unknown> = {};
			for (const [k, v] of value) {
				const keyStr = String(k);
				// SECURITY: Prevent Prototype Poisoning
				if (
					keyStr === '__proto__' ||
					keyStr === 'constructor' ||
					keyStr === 'prototype'
				) {
					continue;
				}

				// Recursive call ensures values (like BigInt) are IQSerialized
				result[keyStr] = this.serializeValue(v, visited, {
					...options,
					_depth: depth + 1,
				});
			}
			return result;
		}

		if (value instanceof Set) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			// Recursive call ensures values (like Date) are IQSerialized
			return Array.from(value).map((item) =>
				this.serializeValue(item, visited, {
					...options,
					_depth: depth + 1,
				})
			);
		}

		if (Array.isArray(value)) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			return value.map((item) =>
				this.serializeValue(item, visited, {
					...options,
					_depth: depth + 1,
				})
			);
		}

		// Custom Transformers (Registry)
		if (
			value !== null &&
			value !== undefined &&
			typeof value === 'object'
		) {
			// Try to find transformer by constructor
			const ctor = (value as Record<string, unknown>).constructor;
			if (ctor && QTransformerRegistry.has(ctor)) {
				const transformer = QTransformerRegistry.get(ctor);
				if (transformer) {
					return transformer.serialize(value);
				}
			}
		}

		// Date
		if (value instanceof Date) {
			const transformer =
				this.transformers.get('date') || this.transformers.get(Date);

			const context = {
				propertyKey: '',
				className: '',
				metadata: {
					dateStrategy: options?.dateStrategy,
				},
			};

			return transformer
				? transformer.serialize(value, context)
				: value.toISOString();
		}

		// URL
		if (value instanceof URL) {
			const transformer =
				this.transformers.get(URL) ||
				this.transformers.get(Symbol('URL').toString());
			return transformer ? transformer.serialize(value) : value.href;
		}

		// URLSearchParams
		if (value instanceof URLSearchParams) {
			const transformer =
				this.transformers.get(URLSearchParams) ||
				this.transformers.get(Symbol('URLSearchParams').toString());
			return transformer
				? transformer.serialize(value)
				: value.toString();
		}

		// BigInt
		if (typeof value === 'bigint') {
			const transformer = this.transformers.get('bigint');
			if (transformer) {
				return transformer.serialize(value);
			}
			return value.toString();
		}

		// Symbol
		if (typeof value === 'symbol') {
			const transformer = this.transformers.get('symbol');
			return transformer
				? transformer.serialize(value)
				: Symbol.keyFor(value) || value.toString();
		}

		// RegExp
		if (value instanceof RegExp) {
			const transformer =
				this.transformers.get(RegExp) ||
				this.transformers.get(Symbol('RegExp').toString());
			return transformer
				? transformer.serialize(value)
				: { source: value.source, flags: value.flags };
		}

		// Error
		if (value instanceof Error) {
			const transformer =
				this.transformers.get(Error) ||
				this.transformers.get(Symbol('Error').toString());
			return transformer
				? transformer.serialize(value)
				: {
						message: value.message,
						stack: value.stack,
						name: value.name,
					};
		}

		// TypedArrays
		if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
			// Determine which constructor to use to look up the transformer
			let transformer;
			if (value instanceof Int8Array)
				transformer = this.transformers.get(Int8Array);
			else if (value instanceof Uint8Array)
				transformer = this.transformers.get(Uint8Array);
			else if (value instanceof Int16Array)
				transformer = this.transformers.get(Int16Array);
			else if (value instanceof Uint16Array)
				transformer = this.transformers.get(Uint16Array);
			else if (value instanceof Int32Array)
				transformer = this.transformers.get(Int32Array);
			else if (value instanceof Uint32Array)
				transformer = this.transformers.get(Uint32Array);
			else if (value instanceof Float32Array)
				transformer = this.transformers.get(Float32Array);
			else if (value instanceof Float64Array)
				transformer = this.transformers.get(Float64Array);
			else if (value instanceof BigInt64Array)
				transformer = this.transformers.get(BigInt64Array);
			else if (value instanceof BigUint64Array)
				transformer = this.transformers.get(BigUint64Array);

			if (transformer) {
				return transformer.serialize(value);
			}

			// Fallback: convertir a array
			// Para BigInt64Array y BigUint64Array, convertir bigints a strings
			if (
				value instanceof BigInt64Array ||
				value instanceof BigUint64Array
			) {
				return Array.from(value, (v: bigint) => v.toString());
			}
			// TypedArrays tienen iterator pero TypeScript necesita type assertion
			if (value instanceof Int8Array) return Array.from(value);
			if (value instanceof Uint8Array) return Array.from(value);
			if (value instanceof Int16Array) return Array.from(value);
			if (value instanceof Uint16Array) return Array.from(value);
			if (value instanceof Int32Array) return Array.from(value);
			if (value instanceof Uint32Array) return Array.from(value);
			if (value instanceof Float32Array) return Array.from(value);
			if (value instanceof Float64Array) return Array.from(value);
			if (value instanceof Uint8ClampedArray) return Array.from(value);
			// Should never reach here
			return [];
		}

		// ArrayBuffer
		if (value instanceof ArrayBuffer) {
			const transformer =
				this.transformers.get(ArrayBuffer) ||
				this.transformers.get(Symbol('ArrayBuffer').toString());
			return transformer
				? transformer.serialize(value)
				: Array.from(new Uint8Array(value));
		}

		// DataView
		if (value instanceof DataView) {
			const transformer =
				this.transformers.get(DataView) ||
				this.transformers.get(Symbol('DataView').toString());
			return transformer
				? transformer.serialize(value)
				: Array.from(new Uint8Array(value.buffer));
		}

		// Nested model
		if (
			typeof value === 'object' &&
			value !== null &&
			'serialize' in value &&
			typeof value.serialize === 'function'
		) {
			const visited = seen || new WeakSet<object>();
			// No need to check visited here because value.serialize(seen) will check it

			// prepare child options
			const childOptions: IQSerializationOptions = {
				...options,
				_depth: depth + 1,
			};

			// If it is a QModel (has metadata), we should strip the dateStrategy
			// to allow it to use its own configuration
			if (
				Reflect.hasMetadata(QUICK_DECORATOR_KEY, value.constructor) ||
				Reflect.hasMetadata(QUICK_TYPE_MAP_KEY, value.constructor)
			) {
				delete childOptions.dateStrategy;
				delete childOptions.transformCase; // Strip case config too
				// Force explicit removal via type assertion if needed
				(childOptions as any).dateStrategy = undefined;
				(childOptions as any).transformCase = undefined;
			}

			return (
				value as {
					serialize: (
						s?: WeakSet<object>,
						o?: IQSerializationOptions
					) => unknown;
				}
			).serialize(visited, childOptions);
		}

		// Nested QuickModel (Deep Serialization)
		// Detects models by presence of metadata if they don't have explicit serialize method
		if (
			typeof value === 'object' &&
			value !== null &&
			value.constructor &&
			(Reflect.hasMetadata(QUICK_DECORATOR_KEY, value.constructor) ||
				Reflect.hasMetadata(QUICK_TYPE_MAP_KEY, value.constructor))
		) {
			const visited = seen || new WeakSet<object>();
			// Recursively serialize the nested model
			// Note: We strip 'dateStrategy' from options to allow the nested model
			// to fully resolve its own strategy defaults, unless explictly handled otherwise.
			// Ideally we should differentiate between "Force Global Strategy" and "Inherited Default".
			// For now, we favor Model Autonomy.
			const childOptions: IQSerializationOptions = {
				_depth: depth + 1,
				includeUnderscore: options?.includeUnderscore,
				includeDoubleUnderscore: options?.includeDoubleUnderscore,
			};

			return this.serialize(value as any, visited, childOptions);
		}

		// Plain Object (recursive serialization)
		// This enables proper serialization of nested plain objects that might contain
		// complex types (e.g. from dot notation transforms like 'stats.points': BigInt)
		if (
			typeof value === 'object' &&
			value !== null &&
			(Object.getPrototypeOf(value) === Object.prototype ||
				Object.getPrototypeOf(value) === null)
		) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			const result: Record<string, unknown> = {};
			for (const key of Object.keys(value)) {
				result[key] = this.serializeValue(
					(value as Record<string, unknown>)[key],
					visited,
					{ ...options, _depth: depth + 1 }
				);
			}
			return result;
		}

		// Primitive
		return value;
	}
}

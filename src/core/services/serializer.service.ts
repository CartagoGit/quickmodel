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
 * @template TInterface - The serialized interface type
 *
 * @remarks
 * **SOLID principles:**
 * - **Single Responsibility**: Only handles JSON serialization (no format preservation)
 * - **Open/Closed**: Extensible via transformer registry
 * - **Dependency Inversion**: Depends on ITransformer abstraction
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
 * - Nested models → recursively serialized
 *
 * @example
 * **Basic serialization**
 * ```typescript
 * const serializer = new Serializer();
 *
 * class User extends QuickModel<IUser> {
 *   @QType() name!: string;
 *   @QType() birthDate!: Date;
 *   @QType() tags!: Set<string>;
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

import { IQSerializer } from '../interfaces/serializer.interface';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { DateTransformer } from '@/transformers/date.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
import { SymbolTransformer } from '@/transformers/symbol.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';
import { URLTransformer } from '@/transformers/url.transformer';
import { URLSearchParamsTransformer } from '@/transformers/url-search-params.transformer';
import { MapTransformer, SetTransformer } from '@/transformers/map-set.transformer';

export class Serializer<
	TModel extends Record<string, unknown> = Record<string, unknown>,
	TInterface extends Record<string, unknown> = any,
> implements IQSerializer<TModel, TInterface> {
	private readonly transformers: Map<string | Function, any>;

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
		this.transformers.set(Int8Array, new TypedArrayTransformer<Int8Array>(Int8Array));
		this.transformers.set(Uint8Array, new TypedArrayTransformer<Uint8Array>(Uint8Array));
		this.transformers.set(Int16Array, new TypedArrayTransformer<Int16Array>(Int16Array));
		this.transformers.set(Uint16Array, new TypedArrayTransformer<Uint16Array>(Uint16Array));
		this.transformers.set(Int32Array, new TypedArrayTransformer<Int32Array>(Int32Array));
		this.transformers.set(Uint32Array, new TypedArrayTransformer<Uint32Array>(Uint32Array));
		this.transformers.set(Float32Array, new TypedArrayTransformer<Float32Array>(Float32Array));
		this.transformers.set(Float64Array, new TypedArrayTransformer<Float64Array>(Float64Array));
		this.transformers.set(BigInt64Array, new TypedArrayTransformer<BigInt64Array>(BigInt64Array, true));
		this.transformers.set(
			BigUint64Array,
			new TypedArrayTransformer<BigUint64Array>(BigUint64Array, true)
		);
	}

	/**
	 * Serializes a model instance to plain object using transformers.
	 *
	 * @param model - The model instance to serialize
	 * @returns Plain object suitable for JSON serialization with transformers applied
	 *
	 * @remarks
	 * Uses transformers to convert special types (BigInt, Date, RegExp, etc.) to JSON-compatible format.
	 */
	serialize(model: TModel): TInterface {
		const result: Record<string, unknown> = {};

		// Get all property keys
		const keys = new Set<string>();
		for (const key of Object.keys(model as object)) {
			keys.add(key);
		}

		let proto = Object.getPrototypeOf(model);
		while (proto && proto !== Object.prototype) {
			for (const key of Object.getOwnPropertyNames(proto)) {
				const descriptor = Object.getOwnPropertyDescriptor(proto, key);
				if (descriptor && (descriptor.get || descriptor.set) && key !== 'constructor') {
					keys.add(key);
				}
			}
			proto = Object.getPrototypeOf(proto);
		}

		// Serialize with transformers
		for (const key of keys) {
			if (key.startsWith('__') || key.startsWith('_')) {
				continue;
			}

			const value = (model as any)[key];
			result[key] = this.serializeValue(value);
		}

		return result as TInterface;
	}

	/**
	 * Serializes a model instance to JSON string.
	 *
	 * @param model - The model instance to serialize
	 * @returns JSON string representation
	 */
	serializeToJson(model: TModel): string {
		return JSON.stringify(this.serialize(model));
	}

	/**
	 * Serializes a single value based on its type.
	 *
	 * @param value - The value to serialize
	 * @returns Serialized value suitable for JSON
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
	private serializeValue(value: unknown): unknown {
		// Date
		if (value instanceof Date) {
			const transformer = this.transformers.get('date') || this.transformers.get(Date);
			return transformer ? transformer.serialize(value) : value.toISOString();
		}

		// URL
		if (value instanceof URL) {
			const transformer =
				this.transformers.get(URL) || this.transformers.get(Symbol('URL').toString());
			return transformer ? transformer.serialize(value) : value.href;
		}

		// URLSearchParams
		if (value instanceof URLSearchParams) {
			const transformer =
				this.transformers.get(URLSearchParams) ||
				this.transformers.get(Symbol('URLSearchParams').toString());
			return transformer ? transformer.serialize(value) : value.toString();
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
			return transformer ? transformer.serialize(value) : Symbol.keyFor(value) || value.toString();
		}

		// RegExp
		if (value instanceof RegExp) {
			const transformer =
				this.transformers.get(RegExp) || this.transformers.get(Symbol('RegExp').toString());
			return transformer
				? transformer.serialize(value)
				: { source: value.source, flags: value.flags };
		}

		// Error
		if (value instanceof Error) {
			const transformer =
				this.transformers.get(Error) || this.transformers.get(Symbol('Error').toString());
			return transformer
				? transformer.serialize(value)
				: { message: value.message, stack: value.stack, name: value.name };
		}

		// TypedArrays
		if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
			// Determinar qué constructor usar para buscar el transformer
			let transformer;
			if (value instanceof Int8Array) transformer = this.transformers.get(Int8Array);
			else if (value instanceof Uint8Array) transformer = this.transformers.get(Uint8Array);
			else if (value instanceof Int16Array) transformer = this.transformers.get(Int16Array);
			else if (value instanceof Uint16Array) transformer = this.transformers.get(Uint16Array);
			else if (value instanceof Int32Array) transformer = this.transformers.get(Int32Array);
			else if (value instanceof Uint32Array) transformer = this.transformers.get(Uint32Array);
			else if (value instanceof Float32Array) transformer = this.transformers.get(Float32Array);
			else if (value instanceof Float64Array) transformer = this.transformers.get(Float64Array);
			else if (value instanceof BigInt64Array) transformer = this.transformers.get(BigInt64Array);
			else if (value instanceof BigUint64Array) transformer = this.transformers.get(BigUint64Array);

			if (transformer) {
				return transformer.serialize(value);
			}

			// Fallback: convertir a array
			// Para BigInt64Array y BigUint64Array, convertir bigints a strings
			if (value instanceof BigInt64Array || value instanceof BigUint64Array) {
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
			return transformer ? transformer.serialize(value) : Array.from(new Uint8Array(value));
		}

		// DataView
		if (value instanceof DataView) {
			const transformer =
				this.transformers.get(DataView) || this.transformers.get(Symbol('DataView').toString());
			return transformer ? transformer.serialize(value) : Array.from(new Uint8Array(value.buffer));
		}

		// Nested model
		if (
			typeof value === 'object' &&
			value !== null &&
			'serialize' in value &&
			typeof value.serialize === 'function'
		) {
			return value.serialize();
		}

		// Array
		if (Array.isArray(value)) {
			if (value.length > 0 && value[0]?.serialize) {
				return value.map((item) => item.serialize());
			}
			return value;
		}

		// Map
		if (value instanceof Map) {
			const transformer = this.transformers.get('map') || this.transformers.get(Map);
			if (transformer) {
				return transformer.serialize(value);
			}
			return Object.fromEntries(value);
		}

		// Set
		if (value instanceof Set) {
			const transformer = this.transformers.get('set') || this.transformers.get(Set);
			if (transformer) {
				return transformer.serialize(value);
			}
			return Array.from(value);
		}

		// Primitive
		return value;
	}
}

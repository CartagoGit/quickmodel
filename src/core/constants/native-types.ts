/**
 * @fileoverview Native type definitions and lookup tables for QuickModel.
 *
 * Single source of truth for every JavaScript built-in that QuickModel
 * recognises out-of-the-box, together with the string tokens used by
 * `TransformerLookupService` to route each value to the correct transformer.
 *
 * Adding support for a **new** native type requires:
 * 1. Adding its constructor to {@link IQNativeConstructor}
 * 2. Adding a `[Constructor, 'token']` entry to {@link NATIVE_TYPE_MAP}
 * 3. Adding the constructor to {@link TRANSFORMABLE_TYPES}
 * 4. Implementing (or extending) the corresponding transformer class
 */

/**
 * Union of all native constructor types that QuickModel recognises and can
 * route to a built-in transformer.
 *
 * Used as a discriminant in {@link IQTypeSpec} to distinguish
 * class constructors (which are recursively hydrated) from native built-ins
 * (which are delegated to a registered transformer).
 *
 * @see {@link NATIVE_TYPE_MAP} for the constructor → token mapping
 * @see {@link IQTypeSpec} for the broader type-spec union
 */
export type IQNativeConstructor =
	| typeof String
	| typeof Number
	| typeof Boolean
	| typeof Array
	| typeof Date
	| typeof BigInt
	| typeof Symbol
	| typeof RegExp
	| typeof Error
	| typeof URL
	| typeof URLSearchParams
	| typeof Int8Array
	| typeof Uint8Array
	| typeof Uint8ClampedArray
	| typeof Int16Array
	| typeof Uint16Array
	| typeof Int32Array
	| typeof Uint32Array
	| typeof Float32Array
	| typeof Float64Array
	| typeof BigInt64Array
	| typeof BigUint64Array
	| typeof ArrayBuffer
	| typeof DataView
	| typeof Set
	| typeof Map
	| typeof Blob
	| typeof File;

/**
 * Lookup table from native constructor to the string transformer-token used throughout
 * `TransformerLookupService` and related services.
 *
 * Covers all 28 natively-supported types including typed arrays, binary buffers,
 * and Web API types. Adding an entry here is **not** sufficient to support a new
 * type — a matching transformer must also be registered.
 *
 * @see {@link IQNativeConstructor} for the union type definition
 * @internal
 */
export const NATIVE_TYPE_MAP = new Map<Function, string>([
	[Date, 'date'],
	[BigInt, 'bigint'],
	[Symbol, 'symbol'],
	[RegExp, 'regexp'],
	[Error, 'error'],
	[URL, 'url'],
	[URLSearchParams, 'urlsearchparams'],
	[Int8Array, 'int8array'],
	[Uint8Array, 'uint8array'],
	[Uint8ClampedArray, 'uint8clampedarray'],
	[Int16Array, 'int16array'],
	[Uint16Array, 'uint16array'],
	[Int32Array, 'int32array'],
	[Uint32Array, 'uint32array'],
	[Float32Array, 'float32array'],
	[Float64Array, 'float64array'],
	[BigInt64Array, 'bigint64array'],
	[BigUint64Array, 'biguint64array'],
	[ArrayBuffer, 'arraybuffer'],
	[DataView, 'dataview'],
	[Set, 'set'],
	[Map, 'map'],
	[Blob, 'blob'],
	[File, 'file'],
]);

/**
 * Full list of constructors that QuickModel can process recursively inside
 * typed arrays (e.g. `[Date]`, `[Uint8Array]`).
 *
 * Used by `TransformerLookupService` to decide whether to recurse into array
 * elements. Includes all primitive wrappers, Web API types, typed arrays, and
 * binary buffer types.
 *
 * @see {@link NATIVE_TYPE_MAP} for the constructor → token string mapping
 * @internal
 */
export const TRANSFORMABLE_TYPES = [
	Date,
	BigInt,
	Number,
	String,
	Boolean,
	RegExp,
	Symbol,
	Error,
	URL,
	URLSearchParams,
	Int8Array,
	Uint8Array,
	Uint8ClampedArray,
	Int16Array,
	Uint16Array,
	Int32Array,
	Uint32Array,
	Float32Array,
	Float64Array,
	BigInt64Array,
	BigUint64Array,
	ArrayBuffer,
	DataView,
	Blob,
	File,
];

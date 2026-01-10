/**
 * Native type definitions and mappings for QuickModel.
 * Single source of truth for supported native types and their string identifiers.
 */

// Native constructor types
export type INativeConstructor =
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
  | typeof Map;

/**
 * Mapping of native constructors to their string identifiers.
 * Used for type detection and transformer lookup.
 */
export const NATIVE_TYPE_MAP = new Map<any, string>([
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
]);

/**
 * List of transformable types that can be handled recursively in arrays.
 */
export const TRANSFORMABLE_TYPES = [
  Date, BigInt, Number, String, Boolean,
  RegExp, Symbol, Error,
  URL, URLSearchParams,
  Int8Array, Uint8Array, Uint8ClampedArray,
  Int16Array, Uint16Array,
  Int32Array, Uint32Array,
  Float32Array, Float64Array,
  BigInt64Array, BigUint64Array,
  ArrayBuffer, DataView
];

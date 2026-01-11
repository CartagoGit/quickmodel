/**
 * Type aliases for QuickModel @Quick() decorator
 *
 * @example
 * ```typescript
 * @Quick({
 *   // String literals
 *   value: 'bigint',
 *   date: 'date',
 *   pattern: 'regexp',
 *
 *   // Constructors
 *   tags: Set,
 *   metadata: Map,
 *   error: Error,
 *
 *   // Functions
 *   price: (v) => Math.round(v * 100) / 100,
 *   name: (s) => s.trim().toUpperCase()
 * })
 * ```
 */

/**
 * String literal type aliases for basic type conversions in \@Quick() decorator.
 * These aliases provide autocomplete support and type checking.
 *
 * Used in the `typeMap` parameter of `@Quick(typeMap)`.
 *
 * ## Usage Guide
 *
 * ### Primitives
 * - **'bigint'**: Converts string/number ↔ BigInt (e.g., "9007199254740991" ↔ 9007199254740991n)
 * - **'symbol'**: Converts string ↔ Symbol (using Symbol.for)
 * - **'string'**: Ensures value is a string (String(val))
 * - **'number'**: Ensures value is a number (Number(val))
 * - **'boolean'**: Ensures value is a boolean (Boolean(val))
 *
 * ### Native Objects
 * - **'date'**: Converts ISO string/timestamp ↔ Date object
 * - **'regexp'**: Converts string/object ↔ RegExp
 * - **'error'**: Converts plain object ↔ Error instance (preserving name, message, stack)
 * - **'url'**: Converts string ↔ URL object
 * - **'urlsearchparams'**: Converts string/object ↔ URLSearchParams
 *
 * ### Collections
 * - **'map'**: Converts array of tuples `[[k,v], ...]` ↔ Map
 * - **'set'**: Converts array `[v1, v2]` ↔ Set
 * - **'array'**: Ensures value is an array (Array.from)
 *
 * ### Binary Data & Buffers
 * - **'arraybuffer'**: Base64 string ↔ ArrayBuffer
 * - **'dataview'**: Base64 string ↔ DataView
 * - **'int8array'**, **'uint8array'**, etc.: Base64 string/array ↔ TypedArray
 *
 * @example
 * ```typescript
 * @Quick({
 *   balance: 'bigint',   // Transform string to BigInt
 *   createdAt: 'date',   // Transform ISO string to Date
 *   pattern: 'regexp',   // Transform string to RegExp
 *   tags: 'set',         // Transform array to Set
 *   meta: 'map'          // Transform tuples to Map
 * })
 * ```
 */
export type IQTypeAlias =
	// Primitives
	| 'bigint'
	| 'symbol'
	| 'number'
	| 'string'
	| 'boolean'
	| 'null'
	| 'undefined'

	// Native Objects
	| 'date'
	| 'regexp'
	| 'error'
	| 'map'
	| 'set'
	| 'weakmap'
	| 'weakset'
	| 'promise'
	| 'array'
	| 'object'

	// Typed Arrays (Binary)
	| 'int8array'
	| 'uint8array'
	| 'uint8clampedarray'
	| 'int16array'
	| 'uint16array'
	| 'int32array'
	| 'uint32array'
	| 'float32array'
	| 'float64array'
	| 'bigint64array'
	| 'biguint64array'

	// Buffers & Views
	| 'arraybuffer'
	| 'sharedarraybuffer'
	| 'dataview'

	// Web APIs
	| 'url'
	| 'urlsearchparams'
	| 'blob'
	| 'file'
	| 'formdata'
	| 'headers'
	| 'textencoder'
	| 'textdecoder';

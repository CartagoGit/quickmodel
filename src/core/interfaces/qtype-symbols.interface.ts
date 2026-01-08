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
 * String literal type aliases for basic type conversions.
 * Use these with @Quick() for autocomplete support in your IDE.
 */
export type IQTypeAlias =
  // Primitivos
  | 'bigint'
  | 'symbol'
  | 'number'
  | 'string'
  | 'boolean'
  | 'null'
  | 'undefined'
  
  // Objetos nativos
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
  
  // Typed Arrays
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
  
  // Buffers
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

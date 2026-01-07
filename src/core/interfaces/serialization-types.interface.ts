/**
 * Tipos utilitarios para serialización/deserialización type-safe
 * 
 * Estos tipos mapean correctamente los tipos TypeScript a sus representaciones serializadas
 */

/**
 * Mapea un tipo TypeScript a su versión serializada
 */
export type Serialized<T> = T extends RegExp
  ? string
  : T extends Error
  ? string
  : T extends Date
  ? string
  : T extends URL
  ? string
  : T extends URLSearchParams
  ? string
  : T extends bigint
  ? string
  : T extends symbol
  ? string
  : T extends Int8Array
  ? number[]
  : T extends Uint8Array
  ? number[]
  : T extends Uint8ClampedArray
  ? number[]
  : T extends Int16Array
  ? number[]
  : T extends Uint16Array
  ? number[]
  : T extends Int32Array
  ? number[]
  : T extends Uint32Array
  ? number[]
  : T extends Float32Array
  ? number[]
  : T extends Float64Array
  ? number[]
  : T extends BigInt64Array
  ? string[]
  : T extends BigUint64Array
  ? string[]
  : T extends ArrayBuffer
  ? number[]
  : T extends DataView
  ? number[]
  : T extends Map<infer K, infer V>
  ? [Serialized<K>, Serialized<V>][]
  : T extends Set<infer U>
  ? Serialized<U>[]
  : T extends Array<infer U>
  ? Serialized<U>[]
  : T extends object
  ? { [K in keyof T]: Serialized<T[K]> }
  : T; // primitivos (string, number, boolean, null, undefined)

/**
 * Mapea una interfaz completa a su versión serializada
 */
export type SerializedInterface<T> = {
  [K in keyof T]: Serialized<T[K]>;
};

/**
 * Mapea un tipo serializado de vuelta a su tipo original
 */
export type Deserialized<T> = T; // La deserialización se maneja en runtime con transformers

/**
 * Tipo para datos de entrada en el constructor
 * Acepta datos completos, ya sean originales o serializados
 */
export type ModelData<T> = T | SerializedInterface<T>;

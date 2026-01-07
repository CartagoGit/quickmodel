/**
 * Símbolos para tipos especiales que requieren transformación
 * 
 * Estos símbolos se usan con el decorador @Field() para indicar
 * que un campo necesita un transformer específico.
 */

/** BigInt: string | number → bigint */
export const BigIntField = Symbol('BigInt');

/** RegExp: objeto → RegExp */
export const RegExpField = Symbol('RegExp');

/** Symbol: string → symbol (usando Symbol.for) */
export const SymbolField = Symbol('Symbol');

/** Error: objeto → Error */
export const ErrorField = Symbol('Error');

/** Int8Array: number[] → Int8Array */
export const Int8ArrayField = Symbol('Int8Array');

/** Uint8Array: number[] → Uint8Array */
export const Uint8ArrayField = Symbol('Uint8Array');

/** Int16Array: number[] → Int16Array */
export const Int16ArrayField = Symbol('Int16Array');

/** Uint16Array: number[] → Uint16Array */
export const Uint16ArrayField = Symbol('Uint16Array');

/** Int32Array: number[] → Int32Array */
export const Int32ArrayField = Symbol('Int32Array');

/** Uint32Array: number[] → Uint32Array */
export const Uint32ArrayField = Symbol('Uint32Array');

/** Float32Array: number[] → Float32Array */
export const Float32ArrayField = Symbol('Float32Array');

/** Float64Array: number[] → Float64Array */
export const Float64ArrayField = Symbol('Float64Array');

/** BigInt64Array: string[] → BigInt64Array */
export const BigInt64ArrayField = Symbol('BigInt64Array');

/** BigUint64Array: string[] → BigUint64Array */
export const BigUint64ArrayField = Symbol('BigUint64Array');

/** ArrayBuffer: number[] → ArrayBuffer */
export const ArrayBufferField = Symbol('ArrayBuffer');

/** DataView: number[] → DataView */
export const DataViewField = Symbol('DataView');

/**
 * Tipo unión de todos los símbolos de campo disponibles
 */
export type FieldTypeSymbol =
  | typeof BigIntField
  | typeof RegExpField
  | typeof SymbolField
  | typeof ErrorField
  | typeof Int8ArrayField
  | typeof Uint8ArrayField
  | typeof Int16ArrayField
  | typeof Uint16ArrayField
  | typeof Int32ArrayField
  | typeof Uint32ArrayField
  | typeof Float32ArrayField
  | typeof Float64ArrayField
  | typeof BigInt64ArrayField
  | typeof BigUint64ArrayField
  | typeof ArrayBufferField
  | typeof DataViewField;

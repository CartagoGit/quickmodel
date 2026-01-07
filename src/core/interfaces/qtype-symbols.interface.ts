/**
 * Symbols for special types requiring transformation.
 * 
 * These symbols are used with the @QType() decorator to indicate
 * that a field needs a specific transformer.
 * 
 * @example
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType(QBigInt) balance!: bigint;
 *   @QType(QRegExp) pattern!: RegExp;
 *   @QType(QSymbol) id!: symbol;
 * }
 * ```
 */

/** BigInt transformation: string | number → bigint */
export const QBigInt = Symbol('BigInt');

/** RegExp transformation: object → RegExp */
export const QRegExp = Symbol('RegExp');

/** Symbol transformation: string → symbol (using Symbol.for) */
export const QSymbol = Symbol('Symbol');

/** Error transformation: object → Error */
export const QError = Symbol('Error');

/** Int8Array transformation: number[] → Int8Array */
export const QInt8Array = Symbol('Int8Array');

/** Uint8Array transformation: number[] → Uint8Array */
export const QUint8Array = Symbol('Uint8Array');

/** Int16Array transformation: number[] → Int16Array */
export const QInt16Array = Symbol('Int16Array');

/** Uint16Array transformation: number[] → Uint16Array */
export const QUint16Array = Symbol('Uint16Array');

/** Int32Array transformation: number[] → Int32Array */
export const QInt32Array = Symbol('Int32Array');

/** Uint32Array transformation: number[] → Uint32Array */
export const QUint32Array = Symbol('Uint32Array');

/** Float32Array transformation: number[] → Float32Array */
export const QFloat32Array = Symbol('Float32Array');

/** Float64Array transformation: number[] → Float64Array */
export const QFloat64Array = Symbol('Float64Array');

/** BigInt64Array transformation: string[] → BigInt64Array */
export const QBigInt64Array = Symbol('BigInt64Array');

/** BigUint64Array transformation: string[] → BigUint64Array */
export const QBigUint64Array = Symbol('BigUint64Array');

/** ArrayBuffer transformation: number[] → ArrayBuffer */
export const QArrayBuffer = Symbol('ArrayBuffer');

/** DataView transformation: number[] → DataView */
export const QDataView = Symbol('DataView');

/** URL transformation: string → URL */
export const QURL = Symbol('URL');

/** URLSearchParams transformation: string | object → URLSearchParams */
export const QURLSearchParams = Symbol('URLSearchParams');

/**
 * Union type of all available field type symbols.
 * Used for type-safe decorator parameters.
 */
export type QFieldSymbol =
  | typeof QBigInt
  | typeof QRegExp
  | typeof QSymbol
  | typeof QError
  | typeof QInt8Array
  | typeof QUint8Array
  | typeof QInt16Array
  | typeof QUint16Array
  | typeof QInt32Array
  | typeof QUint32Array
  | typeof QFloat32Array
  | typeof QFloat64Array
  | typeof QBigInt64Array
  | typeof QBigUint64Array
  | typeof QArrayBuffer
  | typeof QDataView
  | typeof QURL
  | typeof QURLSearchParams;

import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor;

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

/**
 * Generic transformer for TypedArray types: converts between number/string array and TypedArray.
 * 
 * **Serialization**: `TypedArray` → `number[]` (or `string[]` for BigInt variants)
 * **Deserialization**: `number[]` | `string[]` → `TypedArray`
 * 
 * @template T - The specific TypedArray type (Int8Array, Float32Array, etc.)
 * 
 * @remarks
 * Supports all standard TypedArray types:
 * - Integer: Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array
 * - Float: Float32Array, Float64Array
 * - BigInt: BigInt64Array, BigUint64Array (serialized as string arrays)
 * 
 * BigInt variants serialize to string arrays because JSON doesn't support BigInt.
 * Invalid BigInt values default to 0n.
 * 
 * @example
 * ```typescript
 * class AudioData extends QuickModel<IAudioData> {
 *   @Field() samples!: Float32Array;
 *   @Field() largeNumbers!: BigInt64Array;
 * }
 * 
 * const audio = new AudioData({
 *   samples: [0.5, -0.3, 0.8],
 *   largeNumbers: ["9007199254740991", "123456789012345"]
 * });
 * console.log(audio.samples instanceof Float32Array); // true
 * console.log(audio.largeNumbers instanceof BigInt64Array); // true
 * 
 * const json = audio.toInterface();
 * console.log(json.samples); // [0.5, -0.3, 0.8]
 * console.log(json.largeNumbers); // ["9007199254740991", "123456789012345"]
 * ```
 */
export class TypedArrayTransformer<T extends TypedArray>
  extends BaseTransformer<number[] | string[], T>
  implements IValidator
{
  /**
   * Creates a transformer for a specific TypedArray type.
   * 
   * @param ArrayConstructor - The TypedArray constructor (Int8Array, Float32Array, etc.)
   * @param isBigInt - Whether this is a BigInt variant (BigInt64Array/BigUint64Array)
   */
  constructor(
    private ArrayConstructor: TypedArrayConstructor,
    private isBigInt: boolean = false,
  ) {
    super();
  }

  /**
   * Converts a number/string array to TypedArray.
   * 
   * @param value - The value to convert (array, object, or TypedArray)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns A TypedArray instance
   * 
   * @remarks
   * Accepts arrays or array-like objects (e.g., `{0: 1, 1: 2, 2: 3}`).
   * For BigInt variants, strings are converted to BigInt. Invalid values default to 0n.
   */
  fromInterface(
    value: number[] | string[] | T | Record<number, number>,
    propertyKey: string,
    className: string,
  ): T {
    if (value instanceof this.ArrayConstructor) {
      return value as T;
    }

    const arrayData = Array.isArray(value) ? value : Object.values(value);

    if (this.isBigInt) {
      const bigIntArray = arrayData.map((v: unknown) => {
        if (typeof v === 'bigint') return v;
        if (v === null || v === undefined || v === '') return BigInt(0);
        if (typeof v === 'string' || typeof v === 'number') {
          try {
            return BigInt(v);
          } catch {
            return BigInt(0);
          }
        }
        return BigInt(0);
      });
      return new (this.ArrayConstructor as BigInt64ArrayConstructor | BigUint64ArrayConstructor)(
        bigIntArray,
      ) as T;
    }

    return new (this.ArrayConstructor as Exclude<
      TypedArrayConstructor,
      BigInt64ArrayConstructor | BigUint64ArrayConstructor
    >)(arrayData) as T;
  }

  /**
   * Converts a TypedArray to number or string array.
   * 
   * @param value - The TypedArray to serialize
   * @returns Number array for standard types, string array for BigInt variants
   * 
   * @remarks
   * BigInt variants are serialized as string arrays because JSON doesn't support BigInt.
   */
  toInterface(value: T): number[] | string[] {
    if (this.isBigInt) {
      return Array.from(value as Iterable<bigint>, (v) => v.toString());
    }
    return Array.from(value as Iterable<number>);
  }

  /**
   * Validates if a value can be converted to a TypedArray.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof this.ArrayConstructor) {
      return { isValid: true };
    }

    if (Array.isArray(value)) {
      return { isValid: true };
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected ${this.ArrayConstructor.name}, array or object, got ${typeof value}`,
    };
  }
}

/**
 * Transformer for Int8Array (-128 to 127).
 */
export const int8ArrayTransformer = new TypedArrayTransformer<Int8Array>(Int8Array);

/**
 * Transformer for Uint8Array (0 to 255).
 */
export const uint8ArrayTransformer = new TypedArrayTransformer<Uint8Array>(Uint8Array);

/**
 * Transformer for Int16Array (-32768 to 32767).
 */
export const int16ArrayTransformer = new TypedArrayTransformer<Int16Array>(Int16Array);

/**
 * Transformer for Uint16Array (0 to 65535).
 */
export const uint16ArrayTransformer = new TypedArrayTransformer<Uint16Array>(Uint16Array);

/**
 * Transformer for Int32Array (-2147483648 to 2147483647).
 */
export const int32ArrayTransformer = new TypedArrayTransformer<Int32Array>(Int32Array);

/**
 * Transformer for Uint32Array (0 to 4294967295).
 */
export const uint32ArrayTransformer = new TypedArrayTransformer<Uint32Array>(Uint32Array);

/**
 * Transformer for Float32Array (32-bit floating point).
 */
export const float32ArrayTransformer = new TypedArrayTransformer<Float32Array>(Float32Array);

/**
 * Transformer for Float64Array (64-bit floating point).
 */
export const float64ArrayTransformer = new TypedArrayTransformer<Float64Array>(Float64Array);

/**
 * Transformer for BigInt64Array (signed 64-bit integers).
 * Serializes to string array.
 */
export const bigInt64ArrayTransformer = new TypedArrayTransformer<BigInt64Array>(
  BigInt64Array,
  true,
);

/**
 * Transformer for BigUint64Array (unsigned 64-bit integers).
 * Serializes to string array.
 */
export const bigUint64ArrayTransformer = new TypedArrayTransformer<BigUint64Array>(
  BigUint64Array,
  true,
);

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
 * Transformer genérico para TypedArrays: number[] <-> TypedArray
 */
export class TypedArrayTransformer<T extends TypedArray>
  extends BaseTransformer<number[] | string[], T>
  implements IValidator
{
  constructor(
    private ArrayConstructor: TypedArrayConstructor,
    private isBigInt: boolean = false,
  ) {
    super();
  }

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
      const bigIntArray = arrayData.map((v: unknown) =>
        typeof v === 'bigint' ? v : BigInt(v as string | number),
      );
      return new (this.ArrayConstructor as BigInt64ArrayConstructor | BigUint64ArrayConstructor)(
        bigIntArray,
      ) as T;
    }

    return new (this.ArrayConstructor as Exclude<
      TypedArrayConstructor,
      BigInt64ArrayConstructor | BigUint64ArrayConstructor
    >)(arrayData) as T;
  }

  toInterface(value: T): number[] | string[] {
    // Para BigInt64Array y BigUint64Array, convertir bigints a strings para JSON
    if (this.isBigInt) {
      return Array.from(value as Iterable<bigint>, (v) => v.toString());
    }
    return Array.from(value as Iterable<number>);
  }

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

// Exportar transformers específicos
export const int8ArrayTransformer = new TypedArrayTransformer<Int8Array>(Int8Array);
export const uint8ArrayTransformer = new TypedArrayTransformer<Uint8Array>(Uint8Array);
export const int16ArrayTransformer = new TypedArrayTransformer<Int16Array>(Int16Array);
export const uint16ArrayTransformer = new TypedArrayTransformer<Uint16Array>(Uint16Array);
export const int32ArrayTransformer = new TypedArrayTransformer<Int32Array>(Int32Array);
export const uint32ArrayTransformer = new TypedArrayTransformer<Uint32Array>(Uint32Array);
export const float32ArrayTransformer = new TypedArrayTransformer<Float32Array>(Float32Array);
export const float64ArrayTransformer = new TypedArrayTransformer<Float64Array>(Float64Array);
export const bigInt64ArrayTransformer = new TypedArrayTransformer<BigInt64Array>(
  BigInt64Array,
  true,
);
export const bigUint64ArrayTransformer = new TypedArrayTransformer<BigUint64Array>(
  BigUint64Array,
  true,
);

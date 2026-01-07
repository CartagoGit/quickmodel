import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer para ArrayBuffer: number[] <-> ArrayBuffer
 */
export class ArrayBufferTransformer
  extends BaseTransformer<number[], ArrayBuffer>
  implements IValidator
{
  fromInterface(
    value: number[] | ArrayBuffer,
    propertyKey: string,
    className: string,
  ): ArrayBuffer {
    if (value instanceof ArrayBuffer) {
      return value;
    }

    if (!Array.isArray(value)) {
      throw new Error(
        `${className}.${propertyKey}: Expected array for ArrayBuffer, got ${typeof value}`,
      );
    }

    const buffer = new ArrayBuffer(value.length);
    const view = new Uint8Array(buffer);
    view.set(value);
    return buffer;
  }

  toInterface(value: ArrayBuffer): number[] {
    return Array.from(new Uint8Array(value));
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof ArrayBuffer || Array.isArray(value)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected ArrayBuffer or number[], got ${typeof value}`,
    };
  }
}

/**
 * Transformer para DataView: number[] <-> DataView
 */
export class DataViewTransformer extends BaseTransformer<number[], DataView> implements IValidator {
  fromInterface(
    value: number[] | DataView | ArrayBuffer,
    propertyKey: string,
    className: string,
  ): DataView {
    if (value instanceof DataView) {
      return value;
    }

    if (value instanceof ArrayBuffer) {
      return new DataView(value);
    }

    if (!Array.isArray(value)) {
      throw new Error(
        `${className}.${propertyKey}: Expected array for DataView, got ${typeof value}`,
      );
    }

    const buffer = new ArrayBuffer(value.length);
    const view = new Uint8Array(buffer);
    view.set(value);
    return new DataView(buffer);
  }

  toInterface(value: DataView): number[] {
    return Array.from(new Uint8Array(value.buffer));
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof DataView || value instanceof ArrayBuffer || Array.isArray(value)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected DataView, ArrayBuffer or number[], got ${typeof value}`,
    };
  }
}

export const arrayBufferTransformer = new ArrayBufferTransformer();
export const dataViewTransformer = new DataViewTransformer();

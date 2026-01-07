import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer for ArrayBuffer: converts between byte array and ArrayBuffer.
 * 
 * **Serialization**: `ArrayBuffer` → `number[]` (byte array)
 * **Deserialization**: `number[]` → `ArrayBuffer`
 * 
 * @remarks
 * Each number in the array represents a single byte (0-255).
 * Values outside this range will be clamped.
 * 
 * @example
 * ```typescript
 * class FileModel extends QuickModel<IFileModel> {
 *   @Field() data!: ArrayBuffer;
 * }
 * 
 * const file = new FileModel({
 *   data: [72, 101, 108, 108, 111] // "Hello" in bytes
 * });
 * console.log(file.data instanceof ArrayBuffer); // true
 * console.log(file.data.byteLength); // 5
 * 
 * const json = file.toInterface();
 * console.log(json.data); // [72, 101, 108, 108, 111]
 * ```
 */
export class ArrayBufferTransformer
  extends BaseTransformer<number[], ArrayBuffer>
  implements IValidator
{
  /**
   * Converts a byte array to ArrayBuffer.
   * 
   * @param value - The value to convert (number array or ArrayBuffer)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns An ArrayBuffer instance
   * @throws {Error} If the value is not an array or ArrayBuffer
   */
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

  /**
   * Converts an ArrayBuffer to byte array.
   * 
   * @param value - The ArrayBuffer to serialize
   * @returns Array of bytes (0-255)
   */
  toInterface(value: ArrayBuffer): number[] {
    return Array.from(new Uint8Array(value));
  }

  /**
   * Validates if a value is an ArrayBuffer or number array.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
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
 * Transformer for DataView: converts between byte array and DataView.
 * 
 * **Serialization**: `DataView` → `number[]` (byte array)
 * **Deserialization**: `number[]` | `ArrayBuffer` → `DataView`
 * 
 * @remarks
 * DataView provides a low-level interface for reading/writing multiple number types.
 * The underlying buffer is serialized as a byte array.
 * 
 * @example
 * ```typescript
 * class BinaryData extends QuickModel<IBinaryData> {
 *   @Field() view!: DataView;
 * }
 * 
 * const data = new BinaryData({
 *   view: [0, 255, 128] // byte array
 * });
 * console.log(data.view instanceof DataView); // true
 * console.log(data.view.byteLength); // 3
 * 
 * const json = data.toInterface();
 * console.log(json.view); // [0, 255, 128]
 * ```
 */
export class DataViewTransformer extends BaseTransformer<number[], DataView> implements IValidator {
  /**
   * Converts a byte array or ArrayBuffer to DataView.
   * 
   * @param value - The value to convert (number array, DataView, or ArrayBuffer)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns A DataView instance
   * @throws {Error} If the value is not an array, DataView, or ArrayBuffer
   */
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

  /**
   * Converts a DataView to byte array.
   * 
   * @param value - The DataView to serialize
   * @returns Array of bytes from the underlying buffer
   */
  toInterface(value: DataView): number[] {
    return Array.from(new Uint8Array(value.buffer));
  }

  /**
   * Validates if a value is a DataView, ArrayBuffer, or number array.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
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

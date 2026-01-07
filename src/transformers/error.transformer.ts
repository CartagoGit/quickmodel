import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Serialized representation of an Error object.
 */
interface IErrorData {
  message: string;
  stack?: string;
  name: string;
}

/**
 * Transformer for Error type: converts between string/object and Error object.
 * 
 * **Serialization**: `Error` → `string` (format: `ErrorName: message`)
 * **Deserialization**: `string | {message, stack, name}` → `Error`
 * 
 * @remarks
 * Supports multiple input formats:
 * - String: `"ErrorName: message"` or just `"message"`
 * - Object: `{message: string, stack?: string, name: string}`
 * 
 * Preserves error name and stack trace when available.
 * 
 * @example
 * ```typescript
 * class Request extends QuickModel<IRequest> {
 *   @QType(QError) lastError!: Error;
 * }
 * 
 * // From string
 * const req1 = new Request({ lastError: "TypeError: Invalid input" });
 * console.log(req1.lastError instanceof Error); // true
 * console.log(req1.lastError.name); // "TypeError"
 * 
 * // From object
 * const req2 = new Request({
 *   lastError: { message: "Failed", name: "NetworkError", stack: "..." }
 * });
 * 
 * // Serialization
 * const data = req1.toInterface();
 * console.log(data.lastError); // "TypeError: Invalid input"
 * ```
 */
export class ErrorTransformer extends BaseTransformer<string | IErrorData, Error> implements IValidator {
  /**
   * Converts a string or object to Error.
   * 
   * @param value - The value to convert (string, object, or Error)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns An Error object
   * @throws {Error} If the value cannot be converted to Error
   */
  fromInterface(value: string | IErrorData | Error, propertyKey: string, className: string): Error {
    if (value instanceof Error) {
      return value;
    }

    // String format: "ErrorName: message"
    if (typeof value === 'string') {
      const match = value.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const error = new Error(match[2]);
        error.name = match[1];
        return error;
      }
      return new Error(value);
    }

    if (typeof value !== 'object' || value === null || !('message' in value)) {
      throw new Error(`${className}.${propertyKey}: Invalid Error value`);
    }

    const error = new Error(value.message);
    if (value.stack) error.stack = value.stack;
    if (value.name) error.name = value.name;
    return error;
  }

  /**
   * Converts an Error to string representation.
   * 
   * @param value - The Error object to serialize
   * @returns String in format `ErrorName: message`
   */
  toInterface(value: Error): string {
    return `${value.name}: ${value.message}`;
  }

  /**
   * Validates if a value can be converted to Error.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof Error) {
      return { isValid: true };
    }

    if (typeof value === 'object' && value !== null && 'message' in value) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected Error or {message} object, got ${typeof value}`,
    };
  }
}

export const errorTransformer = new ErrorTransformer();

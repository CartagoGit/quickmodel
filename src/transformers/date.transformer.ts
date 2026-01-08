import { BaseTransformer } from '../core/bases/base-transformer';
import { IQValidationContext, IQValidationResult, IQValidator } from '../core/interfaces';

/**
 * Transformer for Date type: converts between ISO string and Date object.
 * 
 * **Serialization**: `Date` → `string` (ISO 8601 format)
 * **Deserialization**: `string` → `Date`
 * 
 * @remarks
 * Uses ISO 8601 format for serialization (toISOString()).
 * Accepts any valid date string format during deserialization.
 * 
 * SOLID - Single Responsibility: Only transforms Date objects.
 * 
 * @example
 * ```typescript
 * class Event extends QuickModel<IEvent> {
 *   @QType() createdAt!: Date;
 * }
 * 
 * const event = new Event({ createdAt: "2024-01-01T00:00:00.000Z" });
 * console.log(event.createdAt instanceof Date); // true
 * 
 * const data = event.serialize();
 * console.log(data.createdAt); // "2024-01-01T00:00:00.000Z"
 * ```
 */
export class DateTransformer extends BaseTransformer<string, Date> implements IQValidator {
  /**
   * Converts a string, number (Unix timestamp), or Date to Date object.
   * 
   * @param value - The value to convert (string, number, or Date)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns The Date object
   * @throws {Error} If the value is not a valid date
   */
  deserialize(value: string | number | Date, propertyKey: string, className: string): Date {
    // Already a Date instance - return as-is
    if (value instanceof Date) {
      return value;
    }

    // Must be string or number, nothing else
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(
        `${className}.${propertyKey}: Date transformer ONLY accepts:\n` +
        `  - string (ISO 8601 format, e.g., "2024-01-08T10:30:00Z")\n` +
        `  - number (Unix timestamp in milliseconds, e.g., 1704710400000)\n` +
        `  - Date instance\n` +
        `Received: ${typeof value} = ${JSON.stringify(value)}`
      );
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(
        `${className}.${propertyKey}: Invalid date value. Cannot convert "${value}" to Date.\n` +
        `Expected:\n` +
        `  - ISO 8601 string: "2024-01-08T10:30:00.000Z"\n` +
        `  - Unix timestamp (ms): 1704710400000\n` +
        `Received: ${typeof value} = ${JSON.stringify(value)}`
      );
    }

    return date;
  }

  /**
   * Converts a Date object to ISO 8601 string.
   * 
   * @param value - The Date object to serialize
   * @returns ISO 8601 formatted string
   */
  serialize(value: Date): string {
    return value.toISOString();
  }

  /**
   * Validates if a value is a valid Date or date string.
   * 
   * @param value - The value to validate
   * @param _context - Validation context (unused)
   * @returns Validation result
   */
  validate(value: any, _context: IQValidationContext): IQValidationResult {
    if (value instanceof Date) {
      return { isValid: true };
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return { isValid: true };
      }
    }
    return {
      isValid: false,
      error: `Expected Date or valid date string, got ${typeof value}`,
    };
  }
}

export const dateTransformer = new DateTransformer();

import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

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
 *   @Field() createdAt!: Date;
 * }
 * 
 * const event = new Event({ createdAt: "2024-01-01T00:00:00.000Z" });
 * console.log(event.createdAt instanceof Date); // true
 * 
 * const data = event.toInterface();
 * console.log(data.createdAt); // "2024-01-01T00:00:00.000Z"
 * ```
 */
export class DateTransformer extends BaseTransformer<string, Date> implements IValidator {
  /**
   * Converts a string or Date to Date object.
   * 
   * @param value - The value to convert (string or Date)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns The Date object
   * @throws {Error} If the value is not a valid date
   */
  fromInterface(value: string | Date, propertyKey: string, className: string): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value !== 'string') {
      throw new Error(`${className}.${propertyKey}: Expected string or Date, got ${typeof value}`);
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`${className}.${propertyKey}: Invalid date value "${value}"`);
    }

    return date;
  }

  /**
   * Converts a Date object to ISO 8601 string.
   * 
   * @param value - The Date object to serialize
   * @returns ISO 8601 formatted string
   */
  toInterface(value: Date): string {
    return value.toISOString();
  }

  /**
   * Validates if a value is a valid Date or date string.
   * 
   * @param value - The value to validate
   * @param _context - Validation context (unused)
   * @returns Validation result
   */
  validate(value: any, _context: IValidationContext): IValidationResult {
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

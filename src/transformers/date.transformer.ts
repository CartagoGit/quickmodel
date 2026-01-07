import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * SOLID - Single Responsibility: Solo transforma Date
 */
export class DateTransformer extends BaseTransformer<string, Date> implements IValidator {
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

  toInterface(value: Date): string {
    return value.toISOString();
  }

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

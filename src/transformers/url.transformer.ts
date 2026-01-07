import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer para URL: string <-> URL
 */
export class URLTransformer extends BaseTransformer<string, URL> implements IValidator {
  fromInterface(value: string | URL, propertyKey: string, className: string): URL {
    if (value instanceof URL) {
      return value;
    }

    if (typeof value !== 'string') {
      throw new Error(`${className}.${propertyKey}: Expected string for URL, got ${typeof value}`);
    }

    try {
      return new URL(value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${className}.${propertyKey}: Invalid URL value "${value}": ${errorMessage}`,
      );
    }
  }

  toInterface(value: URL): string {
    return value.href;
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof URL) {
      return { isValid: true };
    }

    if (typeof value === 'string') {
      try {
        new URL(value);
        return { isValid: true };
      } catch {
        return {
          isValid: false,
          error: `${context.className}.${context.propertyKey}: Invalid URL value "${value}"`,
        };
      }
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected string/URL, got ${typeof value}`,
    };
  }
}

export const urlTransformer = new URLTransformer();

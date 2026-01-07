import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer para URLSearchParams: string <-> URLSearchParams
 */
export class URLSearchParamsTransformer
  extends BaseTransformer<string, URLSearchParams>
  implements IValidator
{
  fromInterface(
    value: string | URLSearchParams | Record<string, string>,
    propertyKey: string,
    className: string,
  ): URLSearchParams {
    if (value instanceof URLSearchParams) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return new URLSearchParams(value);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${className}.${propertyKey}: Invalid URLSearchParams string "${value}": ${errorMessage}`,
        );
      }
    }

    if (typeof value === 'object' && value !== null) {
      try {
        // TypeScript infiere que es Record<string, string> por el guard
        return new URLSearchParams(value);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${className}.${propertyKey}: Invalid URLSearchParams object: ${errorMessage}`,
        );
      }
    }

    throw new Error(
      `${className}.${propertyKey}: Expected string/object for URLSearchParams, got ${typeof value}`,
    );
  }

  toInterface(value: URLSearchParams): string {
    return value.toString();
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof URLSearchParams) {
      return { isValid: true };
    }

    if (typeof value === 'string') {
      try {
        new URLSearchParams(value);
        return { isValid: true };
      } catch {
        return {
          isValid: false,
          error: `${context.className}.${context.propertyKey}: Invalid URLSearchParams string "${value}"`,
        };
      }
    }

    if (typeof value === 'object' && value !== null) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected string/object/URLSearchParams, got ${typeof value}`,
    };
  }
}

export const urlSearchParamsTransformer = new URLSearchParamsTransformer();

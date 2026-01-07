import { BaseTransformer } from '../core/bases/base-transformer';
import { IQValidationContext, IQValidationResult, IQValidator } from '../core/interfaces';

/**
 * Transformer for URLSearchParams: converts between query string and URLSearchParams object.
 * 
 * **Serialization**: `URLSearchParams` → `string` (query string)
 * **Deserialization**: `string` | `Record<string, string>` → `URLSearchParams`
 * 
 * @remarks
 * Accepts multiple input formats:
 * - Query string: `"key1=value1&key2=value2"`
 * - Object: `{ key1: "value1", key2: "value2" }`
 * - URLSearchParams instance
 * 
 * Serializes to a query string format (without leading `?`).
 * 
 * @example
 * ```typescript
 * class SearchFilter extends QuickModel<ISearchFilter> {
 *   @QType() params!: URLSearchParams;
 * }
 * 
 * // From query string
 * const filter1 = new SearchFilter({
 *   params: "q=typescript&sort=date"
 * });
 * console.log(filter1.params.get("q")); // "typescript"
 * 
 * // From object
 * const filter2 = new SearchFilter({
 *   params: { q: "typescript", sort: "date" }
 * });
 * console.log(filter2.params instanceof URLSearchParams); // true
 * 
 * const json = filter1.toInterface();
 * console.log(json.params); // "q=typescript&sort=date"
 * ```
 */
export class URLSearchParamsTransformer
  extends BaseTransformer<string, URLSearchParams>
  implements IQValidator
{
  /**
   * Converts a query string or object to URLSearchParams.
   * 
   * @param value - The value to convert (string, object, or URLSearchParams)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns A URLSearchParams instance
   * @throws {Error} If the value cannot be converted to URLSearchParams
   */
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

  /**
   * Converts URLSearchParams to query string.
   * 
   * @param value - The URLSearchParams to serialize
   * @returns Query string (without leading `?`)
   */
  toInterface(value: URLSearchParams): string {
    return value.toString();
  }

  /**
   * Validates if a value can be converted to URLSearchParams.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
  validate(value: unknown, context: IQValidationContext): IQValidationResult {
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

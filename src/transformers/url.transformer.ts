import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer for URL: converts between string and URL object.
 * 
 * **Serialization**: `URL` → `string` (href)
 * **Deserialization**: `string` → `URL`
 * 
 * @remarks
 * Validates URL format during deserialization using the URL constructor.
 * Serializes to the full URL string (including protocol, host, path, etc.).
 * 
 * @example
 * ```typescript
 * class WebPage extends QuickModel<IWebPage> {
 *   @Field() url!: URL;
 * }
 * 
 * const page = new WebPage({
 *   url: "https://example.com/path?query=value"
 * });
 * console.log(page.url instanceof URL); // true
 * console.log(page.url.hostname); // "example.com"
 * 
 * const json = page.toInterface();
 * console.log(json.url); // "https://example.com/path?query=value"
 * 
 * // Invalid URL throws error
 * new WebPage({ url: "not-a-valid-url" }); // Error: Invalid URL
 * ```
 */
export class URLTransformer extends BaseTransformer<string, URL> implements IValidator {
  /**
   * Converts a string to URL object.
   * 
   * @param value - The value to convert (string or URL)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns A URL instance
   * @throws {Error} If the value is not a string or URL, or if the URL format is invalid
   */
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

  /**
   * Converts a URL object to string.
   * 
   * @param value - The URL to serialize
   * @returns Full URL string (href)
   */
  toInterface(value: URL): string {
    return value.href;
  }

  /**
   * Validates if a value is a URL or valid URL string.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
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

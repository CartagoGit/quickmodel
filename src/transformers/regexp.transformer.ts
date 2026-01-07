import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Serialized representation of a RegExp.
 */
interface IRegExpData {
  source: string;
  flags: string;
}

/**
 * Transformer for RegExp type: converts between string representation and RegExp object.
 * 
 * **Serialization**: `RegExp` → `string` (format: `/pattern/flags`)
 * **Deserialization**: `string | {source, flags}` → `RegExp`
 * 
 * @remarks
 * Supports multiple input formats:
 * - String with slashes: `/pattern/flags`
 * - Plain string: `pattern` (no flags)
 * - Object: `{source: 'pattern', flags: 'gi'}`
 * 
 * @example
 * ```typescript
 * class Config extends QuickModel<IConfig> {
 *   @Field(RegExpField) emailPattern!: RegExp;
 * }
 * 
 * // From string with slashes
 * const config1 = new Config({ emailPattern: "/^[a-z]+@[a-z]+\\.com$/i" });
 * 
 * // From object
 * const config2 = new Config({ emailPattern: { source: "^test$", flags: "g" } });
 * 
 * // Serialization
 * const data = config1.toInterface();
 * console.log(data.emailPattern); // "/^[a-z]+@[a-z]+\\.com$/i"
 * ```
 */
export class RegExpTransformer
  extends BaseTransformer<string | IRegExpData, RegExp>
  implements IValidator
{
  /**
   * Converts a string or object to RegExp.
   * 
   * @param value - The value to convert (string, object, or RegExp)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns The RegExp object
   * @throws {Error} If the value cannot be converted to RegExp
   */
  fromInterface(
    value: IRegExpData | string | RegExp,
    propertyKey: string,
    className: string,
  ): RegExp {
    if (value instanceof RegExp) {
      return value;
    }

    // Format: {source, flags}
    if (typeof value === 'object' && value !== null && 'source' in value) {
      return new RegExp(value.source, value.flags || '');
    }

    // Format: "/pattern/flags"
    if (typeof value === 'string') {
      const match = value.match(/^\/(.+)\/([gimsuy]*)$/);
      if (match && match[1]) {
        return new RegExp(match[1], match[2] || '');
      }
      return new RegExp(value);
    }

    throw new Error(`${className}.${propertyKey}: Invalid RegExp value`);
  }

  /**
   * Converts a RegExp to string representation with slashes.
   * 
   * @param value - The RegExp object to serialize
   * @returns String in format `/pattern/flags`
   */
  toInterface(value: RegExp): string {
    return `/${value.source}/${value.flags}`;
  }

  /**
   * Validates if a value can be converted to RegExp.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof RegExp) {
      return { isValid: true };
    }

    if (typeof value === 'object' && value !== null && 'source' in value) {
      return { isValid: true };
    }

    if (typeof value === 'string') {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected RegExp, {source, flags} object, or string, got ${typeof value}`,
    };
  }
}

export const regExpTransformer = new RegExpTransformer();

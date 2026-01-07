import { BaseTransformer } from '../core/bases/base-transformer';
import { IQValidationContext, IQValidationResult, IQValidator } from '../core/interfaces';

/**
 * Transformer for BigInt type: converts between string/number and bigint.
 * 
 * **Serialization**: `bigint` → `string`
 * **Deserialization**: `string | number` → `bigint`
 * 
 * @remarks
 * BigInt values cannot be directly serialized to JSON, so they are converted to strings.
 * Both string and number inputs are accepted during deserialization for flexibility.
 * 
 * @example
 * ```typescript
 * class Account extends QuickModel<IAccount> {
 *   @QType(QBigInt) balance!: bigint;
 * }
 * 
 * const account = new Account({ balance: "9007199254740991" });
 * console.log(typeof account.balance); // 'bigint'
 * 
 * const data = account.toInterface();
 * console.log(typeof data.balance); // 'string'
 * ```
 */
export class BigIntTransformer
  extends BaseTransformer<string | number, bigint>
  implements IQValidator
{
  /**
   * Converts a string, number, or object with __type to bigint.
   * 
   * @param value - The value to convert (string, number, bigint, or {__type, value})
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns The bigint value
   * @throws {Error} If the value cannot be converted to bigint
   */
  fromInterface(value: string | number | bigint | { __type: 'bigint'; value: string }, propertyKey: string, className: string): bigint {
    if (typeof value === 'bigint') {
      return value;
    }

    // Handle new format with __type marker
    if (typeof value === 'object' && value !== null && '__type' in value && value.__type === 'bigint') {
      return BigInt(value.value);
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(
        `${className}.${propertyKey}: Expected string/number for BigInt, got ${typeof value}`,
      );
    }

    try {
      return BigInt(value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${className}.${propertyKey}: Invalid BigInt value "${value}": ${errorMessage}`,
      );
    }
  }

  /**
   * Converts a bigint to an object with __type marker for reliable detection.
   * 
   * @param value - The bigint value to serialize
   * @returns Object with __type marker and string value
   */
  toInterface(value: bigint): { __type: 'bigint'; value: string } {
    return { __type: 'bigint', value: value.toString() };
  }

  /**
   * Validates if a value can be converted to bigint.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result indicating success or failure
   */
  validate(value: unknown, context: IQValidationContext): IQValidationResult {
    if (typeof value === 'bigint') {
      return { isValid: true };
    }

    if (typeof value === 'string' || typeof value === 'number') {
      try {
        BigInt(value);
        return { isValid: true };
      } catch {
        return {
          isValid: false,
          error: `${context.className}.${context.propertyKey}: Invalid BigInt value "${value}"`,
        };
      }
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected string/number/bigint, got ${typeof value}`,
    };
  }
}

export const bigIntTransformer = new BigIntTransformer();

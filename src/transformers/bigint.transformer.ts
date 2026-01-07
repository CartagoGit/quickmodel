import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer para BigInt: string <-> bigint
 */
export class BigIntTransformer
  extends BaseTransformer<string | number, bigint>
  implements IValidator
{
  fromInterface(value: string | number | bigint, propertyKey: string, className: string): bigint {
    if (typeof value === 'bigint') {
      return value;
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

  toInterface(value: bigint): string {
    return value.toString();
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
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

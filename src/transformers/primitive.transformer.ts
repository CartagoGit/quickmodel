import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

type PrimitiveType = 'string' | 'number' | 'boolean';

type PrimitiveTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};

/**
 * SOLID - Single Responsibility: Solo transforma primitivos
 * SOLID - Liskov Substitution: Puede sustituir a cualquier transformer
 */
export class PrimitiveTransformer<T extends PrimitiveType>
  extends BaseTransformer<PrimitiveTypeMap[T], PrimitiveTypeMap[T]>
  implements IValidator
{
  constructor(private expectedType: T) {
    super();
  }

  fromInterface(value: unknown, propertyKey: string, className: string): PrimitiveTypeMap[T] {
    const validationResult = this.validate(value, {
      propertyKey,
      className,
      value,
    });

    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }

    return value as PrimitiveTypeMap[T];
  }

  toInterface(value: PrimitiveTypeMap[T]): PrimitiveTypeMap[T] {
    return value;
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (typeof value === this.expectedType) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected ${this.expectedType}, got ${typeof value}`,
    };
  }
}

export const StringTransformer = new PrimitiveTransformer('string');
export const NumberTransformer = new PrimitiveTransformer('number');
export const BooleanTransformer = new PrimitiveTransformer('boolean');

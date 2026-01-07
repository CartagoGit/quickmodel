import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer para Symbol: string <-> Symbol
 * Usa Symbol.for() para permitir serialización
 */
export class SymbolTransformer extends BaseTransformer<string, symbol> implements IValidator {
  fromInterface(value: string | symbol, propertyKey: string, className: string): symbol {
    if (typeof value === 'symbol') {
      return value;
    }

    if (typeof value !== 'string') {
      throw new Error(
        `${className}.${propertyKey}: Expected string for Symbol, got ${typeof value}`,
      );
    }

    return Symbol.for(value);
  }

  toInterface(value: symbol): string {
    const key = Symbol.keyFor(value);
    if (key === undefined) {
      return value.toString();
    }
    return key;
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (typeof value === 'symbol' || typeof value === 'string') {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected string or symbol, got ${typeof value}`,
    };
  }
}

export const symbolTransformer = new SymbolTransformer();

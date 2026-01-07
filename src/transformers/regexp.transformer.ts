import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

interface IRegExpData {
  source: string;
  flags: string;
}

/**
 * Transformer para RegExp: {source, flags} <-> RegExp
 */
export class RegExpTransformer
  extends BaseTransformer<IRegExpData | string, RegExp>
  implements IValidator
{
  fromInterface(
    value: IRegExpData | string | RegExp,
    propertyKey: string,
    className: string,
  ): RegExp {
    if (value instanceof RegExp) {
      return value;
    }

    // Formato: {source, flags}
    if (typeof value === 'object' && value !== null && 'source' in value) {
      return new RegExp(value.source, value.flags || '');
    }

    // Formato: "/pattern/flags"
    if (typeof value === 'string') {
      const match = value.match(/^\/(.+)\/([gimsuy]*)$/);
      if (match && match[1]) {
        return new RegExp(match[1], match[2] || '');
      }
      return new RegExp(value);
    }

    throw new Error(`${className}.${propertyKey}: Invalid RegExp value`);
  }

  toInterface(value: RegExp): IRegExpData {
    return {
      source: value.source,
      flags: value.flags,
    };
  }

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

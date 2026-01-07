import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

interface IErrorData {
  message: string;
  stack?: string;
  name: string;
}

/**
 * Transformer para Error: string | {message, stack, name} <-> Error
 */
export class ErrorTransformer extends BaseTransformer<string | IErrorData, Error> implements IValidator {
  fromInterface(value: string | IErrorData | Error, propertyKey: string, className: string): Error {
    if (value instanceof Error) {
      return value;
    }

    // Formato string: "ErrorName: message"
    if (typeof value === 'string') {
      const match = value.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const error = new Error(match[2]);
        error.name = match[1];
        return error;
      }
      return new Error(value);
    }

    if (typeof value !== 'object' || value === null || !('message' in value)) {
      throw new Error(`${className}.${propertyKey}: Invalid Error value`);
    }

    const error = new Error(value.message);
    if (value.stack) error.stack = value.stack;
    if (value.name) error.name = value.name;
    return error;
  }

  toInterface(value: Error): string {
    return `${value.name}: ${value.message}`;
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
    if (value instanceof Error) {
      return { isValid: true };
    }

    if (typeof value === 'object' && value !== null && 'message' in value) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected Error or {message} object, got ${typeof value}`,
    };
  }
}

export const errorTransformer = new ErrorTransformer();

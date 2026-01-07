import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

interface IErrorData {
  message: string;
  stack?: string;
  name: string;
}

/**
 * Transformer para Error: {message, stack, name} <-> Error
 */
export class ErrorTransformer extends BaseTransformer<IErrorData, Error> implements IValidator {
  fromInterface(value: IErrorData | Error, propertyKey: string, className: string): Error {
    if (value instanceof Error) {
      return value;
    }

    if (typeof value !== 'object' || value === null || !('message' in value)) {
      throw new Error(`${className}.${propertyKey}: Invalid Error value`);
    }

    const error = new Error(value.message);
    if (value.stack) error.stack = value.stack;
    if (value.name) error.name = value.name;
    return error;
  }

  toInterface(value: Error): IErrorData {
    return {
      message: value.message,
      stack: value.stack,
      name: value.name,
    };
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

/**
 * Custom error for QuickModel.
 * Provides additional contextual information about transformation errors.
 */
export class QuickModelError extends Error {
  constructor(
    message: string,
    public readonly context?: {
      className?: string;
      propertyKey?: string;
      value?: unknown;
      expectedType?: string;
    },
  ) {
    super(message);
    this.name = 'QuickModelError';

    // Maintain correct stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QuickModelError);
    }
  }

  /**
   * Helper to create invalid type errors.
   */
  static invalidType(
    className: string,
    propertyKey: string,
    expectedType: string,
    actualValue: unknown,
  ): QuickModelError {
    const actualType = actualValue === null ? 'null' : typeof actualValue;
    return new QuickModelError(
      `${className}.${propertyKey}: Expected ${expectedType}, got ${actualType}`,
      {
        className,
        propertyKey,
        value: actualValue,
        expectedType,
      },
    );
  }

  /**
   * Helper to create invalid value errors.
   */
  static invalidValue(
    className: string,
    propertyKey: string,
    value: unknown,
    reason: string,
  ): QuickModelError {
    return new QuickModelError(`${className}.${propertyKey}: Invalid value "${value}": ${reason}`, {
      className,
      propertyKey,
      value,
    });
  }
}

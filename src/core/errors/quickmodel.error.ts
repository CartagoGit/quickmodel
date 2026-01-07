/**
 * Error personalizado para QuickModel
 * Proporciona información contextual adicional sobre errores de transformación
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

    // Mantener stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QuickModelError);
    }
  }

  /**
   * Helper para crear errores de tipo inválido
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
   * Helper para crear errores de valor inválido
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

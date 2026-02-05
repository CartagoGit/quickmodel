/**
 * Custom error for QuickModel.
 * Provides additional contextual information about transformation errors.
 */
export class QModelError extends Error {
	constructor(
		message: string,
		public readonly context?: {
			className?: string;
			propertyKey?: string;
			value?: unknown;
			expectedType?: string;
		}
	) {
		super(message);
		this.name = 'QModelError';

		// Maintain correct stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, QModelError);
		}
	}

	/**
	 * Helper to create invalid type errors.
	 */
	static invalidType(
		className: string,
		propertyKey: string,
		expectedType: string,
		actualValue: unknown
	): QModelError {
		const actualType = actualValue === null ? 'null' : typeof actualValue;
		return new QModelError(
			`${className}.${propertyKey}: Expected ${expectedType}, got ${actualType}`,
			{
				className,
				propertyKey,
				value: actualValue,
				expectedType,
			}
		);
	}

	/**
	 * Helper to create invalid value errors.
	 */
	static invalidValue(
		className: string,
		propertyKey: string,
		value: unknown,
		reason: string
	): QModelError {
		return new QModelError(
			`${className}.${propertyKey}: Invalid value "${value}": ${reason}`,
			{
				className,
				propertyKey,
				value,
			}
		);
	}
}

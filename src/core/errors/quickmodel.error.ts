/**
 * Domain error thrown by QuickModel when a value fails transformation
 * or validation.
 *
 * @remarks
 * Extends the built-in `Error` with an optional `context` object so that
 * catch-handlers can programmatically inspect which class / property / value
 * caused the failure, without parsing the message string.
 *
 * Use the static factory helpers (`invalidType`, `invalidValue`) to produce
 * consistently formatted messages.
 * * @see {@link QModel.checkIntegrity} — throws this error for type mismatches
 * @see {@link IntegrityService} — service that generates these errors internally
 * * @example
 * ```typescript
 * try {
 *   const user = new User({ age: 'not-a-number' });
 * } catch (err) {
 *   if (err instanceof QModelError) {
 *     console.log(err.context?.propertyKey); // 'age'
 *     console.log(err.context?.expectedType); // 'number'
 *   }
 * }
 * ```
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
	 * Creates a `QModelError` describing a type mismatch.
	 *
	 * @param options.className - The model class name (e.g. `'User'`).
	 * @param options.propertyKey - The property that received the wrong type.
	 * @param options.expectedType - Human-readable description of the expected type.
	 * @param options.actualValue - The value that was actually received (used to
	 * determine `typeof`).
	 * @returns A `QModelError` with a formatted message and populated `context`.
	 * @see {@link QModelError.invalidValue} — use when the type is correct but value is logically wrong
	 * @see {@link IntegrityService} — calls this factory for type-mismatch checks
	 *
	 * @example
	 * ```typescript
	 * throw QModelError.invalidType({
	 *   className: 'User',
	 *   propertyKey: 'age',
	 *   expectedType: 'number',
	 *   actualValue: 'twenty',
	 * });
	 * // "User.age: Expected number, got string"
	 * ```
	 */
	static invalidType(options: {
		className: string;
		propertyKey: string;
		expectedType: string;
		actualValue: unknown;
	}): QModelError {
		const { className, propertyKey, expectedType, actualValue } = options;
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
	 * Creates a `QModelError` describing a logically invalid value.
	 *
	 * @param options.className - The model class name.
	 * @param options.propertyKey - The property that holds the invalid value.
	 * @param options.value - The offending value (serialised into the message).
	 * @param options.reason - A human-readable explanation of why the value is
	 * invalid (e.g. `'must be a positive integer'`).
	 * @returns A `QModelError` with a formatted message and populated `context`.
	 * @see {@link QModelError.invalidType} — use when the type itself is wrong
	 * @see {@link QModel.checkIntegrity} — triggers this error for invalid field values
	 *
	 * @example
	 * ```typescript
	 * throw QModelError.invalidValue({
	 *   className: 'Account',
	 *   propertyKey: 'balance',
	 *   value: -5,
	 *   reason: 'must be non-negative',
	 * });
	 * // "Account.balance: Invalid value "-5": must be non-negative"
	 * ```
	 */
	static invalidValue(options: {
		className: string;
		propertyKey: string;
		value: unknown;
		reason: string;
	}): QModelError {
		const { className, propertyKey, value, reason } = options;
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

// @quickmodel-rule-ignore: no-console — console.log appears only in @example JSDoc blocks
// to demonstrate usage; no actual console.log calls in production code.
/**
 * @fileoverview Error transformer for QuickModel.
 *
 * Handles round-trip serialization/deserialization of `Error` instances:
 * `{ name, message, stack }` POJO ↔ native `Error` (or subclass).
 *
 * @see {@link QModel.$qSerialize} — triggers this transformer when an `Error` field is encountered
 * @see {@link Quick} — use `@Quick({ field: Error })` to activate this transformer
 * @module transformers/error
 */
import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import { safeStringify } from '@/core/helpers/transform-helpers';
import {
	IQTransformContext,
	IQIntegrityContext,
	IQIntegrityResult,
	IQIntegrityChecker,
} from '../core/interfaces/transformer.interface';

/**
 * IQSerialized representation of an Error object.
 */
interface IErrorData {
	message: string;
	stack?: string;
	name: string;
}

/**
 * Transformer for Error type: converts between string/object and Error object.
 *
 * **Serialization**: `Error` → `string` (format: `ErrorName: message`)
 * **Deserialization**: `string | {message, stack, name}` → `Error`
 *
 * @remarks
 * Supports multiple input formats:
 * - String: `"ErrorName: message"` or just `"message"`
 * - Object: `{message: string, stack?: string, name: string}`
 *
 * Preserves error name and stack trace when available.
 *
 * @example
 * ```typescript
 * @Quick({ lastError: Error })
 * class Request extends QuickModel<IRequest> {
 *   declare lastError: Error;
 * }
 *
 * // From string
 * const req1 = new Request({ lastError: "TypeError: Invalid input" });
 * req1.lastError instanceof Error; // → true
 * req1.lastError.name; // → "TypeError"
 *
 * // From object
 * const req2 = new Request({
 *   lastError: { message: "Failed", name: "NetworkError", stack: "..." }
 * });
 *
 * // Serialization
 * const data = req1.$qSerialize();
 * data.lastError; // → "TypeError: Invalid input"
 * ```
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class ErrorTransformer
	extends BaseTransformer<string | IErrorData, Error>
	implements IQIntegrityChecker
{
	/**
	 * Converts a string or object to Error.
	 *
	 * @param value - The value to convert (string, object, or Error)
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns An Error object
	 * @throws {Error} If the value cannot be converted to Error
	 */
	deserialize(
		value: string | IErrorData | Error | null | undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): Error | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		if (value instanceof Error) {
			return value;
		}

		// String format: "ErrorName: message"
		if (typeof value === 'string') {
			// SECURITY: DoS Prevention
			const MAX_LEN = 2048;
			if (value.length > MAX_LEN) {
				throw new QModelError(
					`${className}.${propertyKey}: Error message too long (> ${MAX_LEN} chars).`,
					{
						className,
						propertyKey,
						value: 'TRUNCATED',
						expectedType: 'Short String',
					}
				);
			}

			const match = value.match(/^([^:]+):\s*(.+)$/);
			if (match && match[1] && match[2]) {
				const error = new Error(match[2]);
				error.name = match[1];
				return error;
			}
			return new Error(value);
		}

		// Object format: must have 'message' property
		if (
			typeof value !== 'object' ||
			value === null ||
			!('message' in value)
		) {
			throw new QModelError(
				`${className}.${propertyKey}: Error transformer ONLY accepts:\\n` +
					`  - string (e.g., "TypeError: Invalid input" or "Error message")\\n` +
					`  - object ({ message: string, name?: string, stack?: string })\\n` +
					`  - Error instance\\n` +
					`Received: ${typeof value} = ${safeStringify(value)}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'Error compatible value',
				}
			);
		}

		if (typeof value.message !== 'string') {
			throw new QModelError(
				`${className}.${propertyKey}: Error object must have 'message' as string.\\n` +
					`Received: message type = ${typeof value.message}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'object { message: string }',
				}
			);
		}

		// SECURITY: DoS Prevention
		const MAX_LEN = 2048;
		if (value.message.length > MAX_LEN) {
			throw new QModelError(
				`${className}.${propertyKey}: Error message too long (> ${MAX_LEN} chars).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: 'Short String',
				}
			);
		}

		const error = new Error(value.message);
		// SECURITY: Do not allow stack injection from external data
		// if (value.stack !== undefined) error.stack = value.stack;
		if (value.name !== undefined) error.name = value.name;
		return error;
	}

	/**
	 * Converts an Error to string representation.
	 *
	 * @param value - The Error object to serialize
	 * @returns String in format `ErrorName: message`
	 */
	serialize(value: Error): string {
		return `${value.name}: ${value.message}`;
	}

	/**
	 * Validates that `value` is a valid `Error` representation:
	 * an `Error` instance, a `string` message, or an object with a `message` property.
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `Error`, `string`, or `{ message: …}` objects;
	 *          `{ isValid: false, error }` for all other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof Error) {
			return { isValid: true };
		}

		if (typeof value === 'string') {
			return { isValid: true };
		}

		if (typeof value === 'object' && value !== null && 'message' in value) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected Error, string or {message} object, got ${typeof value}`,
		};
	}
}

/** Pre-registered singleton instance of {@link ErrorTransformer}. */
export const errorTransformer = new ErrorTransformer();

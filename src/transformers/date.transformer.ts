// @quickmodel-rule-ignore: no-console — console.log appears only in @example JSDoc blocks
// to demonstrate usage; no actual console.log calls in production code.
/**
 * @fileoverview Date transformer for QuickModel.
 *
 * Handles round-trip serialization/deserialization of `Date` objects:
 * `string | number | Date` ↔ `Date` (ISO 8601).
 *
 * @see {@link QModel.$qSerialize} — triggers this transformer when a `Date` field is encountered
 * @see {@link Quick} — use `@Quick({ field: Date })` to activate this transformer
 * @module transformers/date
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
 * Transformer for Date type: converts between ISO string and Date object.
 *
 * **Serialization**: `Date` → `string` (ISO 8601 format)
 * **Deserialization**: `string` → `Date`
 *
 * @remarks
 * Uses ISO 8601 format for serialization (toISOString()).
 * Accepts any valid date string format during deserialization.
 *
 * SOLID - Single Responsibility: Only transforms Date objects.
 *
 * @example
 * ```typescript
 * @Quick({ createdAt: Date })
 * class Event extends QuickModel<IEvent> {
 *   declare createdAt: Date;
 * }
 *
 * const event = new Event({ createdAt: "2024-01-01T00:00:00.000Z" });
 * event.createdAt instanceof Date; // → true
 *
 * const data = event.$qSerialize();
 * data.createdAt; // → "2024-01-01T00:00:00.000Z"
 * ```
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class DateTransformer
	extends BaseTransformer<string | number | Date, Date>
	implements IQIntegrityChecker
{
	/**
	 * Converts a string, number (Unix timestamp), or Date to Date object.
	 *
	 * @param value - The value to convert (string, number, or Date)
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns The Date object
	 * @throws {Error} If the value is not a valid date
	 */
	deserialize(
		value: string | number | Date | null | undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): Date | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		// Already a Date instance - return as-is
		if (value instanceof Date) {
			return value;
		}

		// Must be string or number, nothing else
		if (typeof value !== 'string' && typeof value !== 'number') {
			throw new QModelError(
				`${className}.${propertyKey}: Date transformer ONLY accepts:\n` +
					`  - string (ISO 8601 format, e.g., "2024-01-08T10:30:00Z")\n` +
					`  - number (Unix timestamp in milliseconds, e.g., 1704710400000)\n` +
					`  - Date instance\n` +
					`Received: ${typeof value} = ${safeStringify(value)}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'string | number | Date',
				}
			);
		}

		// Protection against DoS with massive date strings
		if (typeof value === 'string' && value.length > 128) {
			throw new QModelError(
				`${className}.${propertyKey}: Date input string too long > 128 chars`,
				{ className, propertyKey, value }
			);
		}

		const date = new Date(value);
		if (isNaN(date.getTime())) {
			throw new QModelError(
				`${className}.${propertyKey}: Invalid date value. Cannot convert "${value}" to Date.\n` +
					`Expected:\n` +
					`  - ISO 8601 string: "2024-01-08T10:30:00.000Z"\n` +
					`  - Unix timestamp (ms): 1704710400000\n` +
					`Received: ${typeof value} = ${safeStringify(value)}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'Valid Date string/timestamp',
				}
			);
		}

		return date;
	}

	/**
	 * Converts a Date object to ISO 8601 string.
	 *
	 * @param value - The Date object to serialize
	 * @param context - The transformation context
	 * @returns ISO 8601 formatted string
	 */
	serialize(
		value: Date,
		context?: IQTransformContext
	): string | number | Date {
		const strategy = context?.metadata?.dateStrategy ?? 'iso';

		if (strategy === 'timestamp') {
			return value.getTime();
		}

		if (strategy === 'native') {
			return value;
		}

		return value.toISOString();
	}

	/**
	 * Validates that `value` is a `Date` instance, a valid date string, or
	 * a numeric Unix timestamp (ms).
	 *
	 * Invalid strings that produce `NaN` from `new Date(v)` are rejected.
	 *
	 * @param value    - Runtime value to validate.
	 * @param _context - Integrity context (unused; error message uses generic text).
	 * @returns `{ isValid: true }` for `Date`, valid string, or valid number;
	 *          `{ isValid: false, error }` otherwise.
	 */
	checkIntegrity(
		value: unknown,
		_context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof Date) {
			return { isValid: true };
		}
		if (typeof value === 'string' || typeof value === 'number') {
			const date = new Date(value);
			if (!isNaN(date.getTime())) {
				return { isValid: true };
			}
		}
		return {
			isValid: false,
			error: `Expected Date, valid date string or timestamp number, got ${typeof value}`,
		};
	}
}

/** Pre-registered singleton instance of {@link DateTransformer}. */
export const dateTransformer = new DateTransformer();

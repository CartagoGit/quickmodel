import { QModelError } from '../errors/quickmodel.error';

/**
 * ObjectSizeValidator - Validates size limits for objects and arrays
 *
 * Responsibilities:
 * - Array length validation
 * - Object property count validation
 * - Nested object size checks
 * - DoS prevention via size limits
 *
 * @see {@link PopulationService} — calls this validator for every array and object property
 * @see {@link QConfig} — configure `maxArrayLength` and related limits globally
 * @see {@link QModelError} — the error thrown when a limit is exceeded
 */
export class ObjectSizeValidator {
	/**
	 * Validates that an array does not exceed the configured maximum length.
	 *
	 * @param options - Validation context.
	 * @param options.key - Property name (used in the error message).
	 * @param options.value - The array to check.
	 * @param options.maxLength - Maximum allowed number of elements.
	 * @param options.className - Model class name (used in the error message).
	 * @throws {QModelError} When `value.length > maxLength`.
	 */
	public validateArraySize(options: {
		key: string;
		value: unknown[];
		maxLength: number;
		className: string;
	}): void {
		const { key, value, maxLength, className } = options;
		if (Array.isArray(value) && value.length > maxLength) {
			throw new QModelError(
				`Security: Array '${key}' length (${value.length}) exceeds maximum allowed limit (${maxLength}).`,
				{
					className,
					propertyKey: key,
					value: 'TRUNCATED',
				}
			);
		}
	}

	/**
	 * Validates that a plain object does not have too many own properties.
	 *
	 * Guards against DoS attacks that pass extremely wide objects to trigger
	 * excessive property iteration at construction time.
	 *
	 * @param options - Validation context.
	 * @param options.keys - Pre-computed `Object.keys()` of the input object.
	 * @param options.limit - Maximum allowed property count.
	 * @param options.className - Model class name (used in the error message).
	 * @param options.propertyKey - Property key label for the error message (defaults to `"<root>"`).
	 * @throws {QModelError} When `keys.length > limit`.
	 */
	public validateObjectSize(options: {
		keys: string[];
		limit: number;
		className: string;
		propertyKey?: string;
	}): void {
		const { keys, limit, className, propertyKey = '<root>' } = options;
		if (keys.length > limit) {
			throw new QModelError(
				`QuickModel Security: Input object has too many properties (${keys.length}). Limit is ${limit}.`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
				}
			);
		}
	}

	/**
	 * Validates that a nested plain object does not exceed the hard-coded
	 * per-property limit of 50 000 own keys.
	 *
	 * Non-plain values (arrays, Dates, RegExps, Maps, Sets, `null`) are skipped.
	 * This prevents a single nested property from causing excessive iteration
	 * inside the population pipeline.
	 *
	 * @param key - Name of the nested property (used in the error message).
	 * @param value - The value to inspect.
	 * @param className - Model class name (used in the error message).
	 * @throws {QModelError} When the nested object has more than 50 000 own properties.
	 */
	public validateNestedObjectSize(
		key: string,
		value: unknown,
		className: string
	): void {
		if (
			value &&
			typeof value === 'object' &&
			!Array.isArray(value) &&
			!(value instanceof Date) &&
			!(value instanceof RegExp) &&
			!(value instanceof Map) &&
			!(value instanceof Set)
		) {
			const nestedKeys = Object.keys(value);
			const PROPS_LIMIT = 50000;
			if (nestedKeys.length > PROPS_LIMIT) {
				throw new QModelError(
					`Security: Nested object '${key}' has too many properties (${nestedKeys.length}). Limit is ${PROPS_LIMIT}.`,
					{
						className,
						propertyKey: key,
						value: 'TRUNCATED',
					}
				);
			}
		}
	}
}

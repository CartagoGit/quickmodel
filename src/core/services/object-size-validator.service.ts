import { QModelError } from '../errors/quickmodel.error';

/**
 * ObjectSizeValidator - Validates size limits for objects and arrays
 *
 * Responsibilities:
 * - Array length validation
 * - Object property count validation
 * - Nested object size checks
 * - DoS prevention via size limits
 */
export class ObjectSizeValidator {
	/**
	 * Validates that an array doesn't exceed the maximum allowed length
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
	 * Validates that an object doesn't have too many properties
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
	 * Validates that a nested object doesn't exceed size limits
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

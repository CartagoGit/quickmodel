// @quickmodel-rule-ignore: no-console — console.log appears only in @example JSDoc blocks
// to demonstrate usage; no actual console.log calls in production code.
/**
 * @fileoverview BigInt transformer for QuickModel.
 *
 * Handles round-trip serialization/deserialization of JavaScript `BigInt` values:
 * `string | number | { __type: 'bigint'; value: string }` ↔ `bigint`.
 *
 * @see {@link QModel.serialize} — triggers this transformer when a `BigInt` field is encountered
 * @see {@link Quick} — use `@Quick({ field: BigInt })` to activate this transformer
 * @module transformers/bigint
 */
import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import {
	IQIntegrityContext,
	IQIntegrityResult,
	IQIntegrityChecker,
	IQTransformContext,
} from '../core/interfaces/transformer.interface';

/**
 * Transformer for BigInt type: converts between string/number and bigint.
 *
 * **Serialization**: `bigint` → `string`
 * **Deserialization**: `string | number` → `bigint`
 *
 * @remarks
 * BigInt values are IQSerialized as plain strings to ensure maximum compatibility with JSON APIs.
 *
 * **⚠️ IMPORTANT - TYPE SAFETY**:
 * Since BigInts are IQSerialized as strings, you **MUST** explicitly declare the field with
 * `@Quick({ field: BigInt })` to ensure it deserializes back to a BigInt.
 *
 * If you put a BigInt into an `any` field or an untyped array, it will serialize to a string
 * but deserialize back as a string (losing the BigInt type) because the schema doesn't know
 * it should be converted back.
 *
 * @example
 * ```typescript
 * @Quick({ balance: BigInt })
 * class Account extends QuickModel<IAccount> {
 *   declare balance: bigint;
 * }
 *
 * const account = new Account({ balance: "9007199254740991" });
 * console.log(typeof account.balance); // 'bigint'
 *
 * const data = account.serialize();
 * console.log(typeof data.balance); // 'string'
 * ```
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class BigIntTransformer
	extends BaseTransformer<
		string | number | { __type: 'bigint'; value: string },
		bigint
	>
	implements IQIntegrityChecker
{
	/**
	 * Converts a string, number, or object with __type to bigint.
	 *
	 * @param value - The value to convert (string, number, bigint, or {__type, value})
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns The bigint value
	 * @throws {Error} If the value cannot be converted to bigint
	 */
	deserialize(
		value:
			| string
			| number
			| bigint
			| { __type: 'bigint'; value: string }
			| null
			| undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): bigint | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		if (typeof value === 'bigint') {
			return value;
		}

		// Handle new format with __type marker
		if (
			typeof value === 'object' &&
			value !== null &&
			'__type' in value &&
			value.__type === 'bigint'
		) {
			// Limit string length to prevent DoS with massive BigInt parsing
			if (typeof value.value === 'string' && value.value.length > 2048) {
				throw new QModelError(
					'BigInt input string too long > 2048 chars',
					{
						className,
						propertyKey,
						value: 'TRUNCATED',
						expectedType: 'Short BigInt string',
					}
				);
			}
			return BigInt(value.value);
		}

		if (typeof value !== 'string' && typeof value !== 'number') {
			throw new QModelError(
				`${className}.${propertyKey}: Expected string/number for BigInt, got ${typeof value}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'string | number | bigint',
				}
			);
		}

		try {
			// Limit string length to prevent DoS with massive BigInt parsing
			if (typeof value === 'string' && value.length > 2048) {
				throw new Error('BigInt input string too long > 2048 chars');
			}
			return BigInt(value);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new QModelError(
				`${className}.${propertyKey}: Invalid BigInt value "${value}": ${errorMessage}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'BigInt parsable value',
				}
			);
		}
	}

	/**
	 * Converts a bigint to a string for JSON serialization.
	 *
	 * @param value - The bigint value to serialize
	 * @returns String representation of the bigint
	 */
	serialize(value: bigint): string {
		return value.toString();
	}

	/**
	 * Validates that a value can be safely converted to `bigint`.
	 *
	 * Accepts: `bigint` (already converted), `string` (decimal notation), and
	 * `number` (integer). Rejects all other types and strings/numbers that
	 * `BigInt()` would throw on.
	 *
	 * @param value   - The runtime value to validate.
	 * @param context - Context object with `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` when the value is a valid bigint or coercible,
	 *          or `{ isValid: false, error: string }` with a human-readable message.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (typeof value === 'bigint') {
			return { isValid: true };
		}

		if (typeof value === 'string' || typeof value === 'number') {
			try {
				BigInt(value);
				return { isValid: true };
			} catch {
				return {
					isValid: false,
					error: `${context.className}.${context.propertyKey}: Invalid BigInt value "${value}"`,
				};
			}
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected string/number/bigint, got ${typeof value}`,
		};
	}
}

/** Pre-registered singleton instance of {@link BigIntTransformer}. */
export const bigIntTransformer = new BigIntTransformer();

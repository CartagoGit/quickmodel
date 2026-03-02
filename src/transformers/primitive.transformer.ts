// @quickmodel-rule-ignore: no-console — console.log appears only in @example JSDoc blocks
// to demonstrate usage; no actual console.log calls in production code.
/**
 * @fileoverview Primitive transformer for QuickModel.
 *
 * Handles coercion and validation of JavaScript primitive types:
 * `string`, `number`, and `boolean`.
 *
 * The `PrimitiveTransformer<T>` is generic and reused for all three,
 * applying native coercion (`String()`, `Number()`, `Boolean()`) during
 * deserialization and returning the value as-is during serialization.
 *
 * @see {@link QModel.$qSerialize} — triggers this transformer for primitive fields
 * @see {@link Quick} — use `@Quick({ field: String | Number | Boolean })` to activate
 * @module transformers/primitive
 */
import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import {
	IQTransformContext,
	IQIntegrityContext,
	IQIntegrityResult,
	IQIntegrityChecker,
} from '../core/interfaces/transformer.interface';

type IPrimitiveType = 'string' | 'number' | 'boolean';

type IPrimitiveTypeMap = {
	string: string;
	number: number;
	boolean: boolean;
};

/**
 * Transformer for primitive types: validates and passes through string, number, or boolean values.
 *
 * **Serialization**: value → value (no transformation)
 * **Deserialization**: value → value (with type validation)
 *
 * @template T - The primitive type ('string', 'number', or 'boolean')
 *
 * @remarks
 * This transformer performs identity transformation (no conversion) but validates
 * that the value matches the expected primitive type. Useful for enforcing type
 * safety on plain JavaScript values.
 *
 * @example
 * ```typescript
 * @Quick({
 *   name: 'string',
 *   port: 'number',
 *   enabled: 'boolean'
 * })
 * class Config extends QuickModel<IConfig> {
 *   declare name: string;
 *   declare port: number;
 *   declare enabled: boolean;
 * }
 *
 * const config = new Config({
 *   name: "server",
 *   port: 3000,
 *   enabled: true
 * });
 *
 * // Values are validated but not transformed
 * const json = config.$qm.serialize();
 * json; // → { name: "server", port: 3000, enabled: true }
 *
 * // Type mismatch throws error
 * new Config({ name: 123 }); // Error: Expected string, got number
 * ```
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class PrimitiveTransformer<T extends IPrimitiveType>
	extends BaseTransformer<IPrimitiveTypeMap[T], IPrimitiveTypeMap[T]>
	implements IQIntegrityChecker
{
	/**
	 * Creates a transformer for a specific primitive type.
	 *
	 * @param expectedType - The primitive type to validate ('string', 'number', or 'boolean')
	 */
	constructor(private expectedType: T) {
		super();
	}

	/**
	 * Validates and returns the value without transformation.
	 *
	 * @param value - The value to validate
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns The same value if validation passes
	 * @throws {Error} If the value type doesn't match the expected primitive type
	 */
	deserialize(
		value: unknown,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): IPrimitiveTypeMap[T] | null {
		// Coercion Logic
		const coercionStrategy = context?.metadata?.coercionStrategy as string;
		const normalization = context?.metadata?.normalization as {
			trimStrings?: boolean;
			emptyStringAsNull?: boolean;
		};

		if (
			coercionStrategy === 'loose' &&
			coercionStrategy === 'loose' &&
			value !== null &&
			value !== undefined
		) {
			if (this.expectedType === 'number') {
				// Avoid coercing empty string to 0
				if (value !== '') {
					const coerced = Number(value);
					if (!isNaN(coerced)) value = coerced;
				}
			} else if (this.expectedType === 'string') {
				if (
					typeof value === 'number' ||
					typeof value === 'boolean' ||
					typeof value === 'bigint'
				) {
					value = String(value);
				}
			} else if (this.expectedType === 'boolean') {
				if (value === 'true' || value === 1) value = true;
				if (value === 'false' || value === 0) value = false;
			}
		}

		// Normalization Logic
		if (this.expectedType === 'string' && typeof value === 'string') {
			if (normalization?.trimStrings) {
				value = value.trim();
			}
			if (normalization?.emptyStringAsNull && value === '') {
				return null;
			}
		}

		const validationResult = this.checkIntegrity(value, {
			propertyKey,
			className,
			value,
		});

		if (!validationResult.isValid) {
			throw new QModelError(
				validationResult.error || 'Validation failed',
				{
					className,
					propertyKey,
					value,
					expectedType: this.expectedType,
				}
			);
		}

		if (value === null || value === undefined) {
			return null;
		}

		return value as IPrimitiveTypeMap[T];
	}

	/**
	 * Returns the value without transformation.
	 *
	 * @param value - The value to serialize
	 * @returns The same value
	 */
	serialize(value: IPrimitiveTypeMap[T]): IPrimitiveTypeMap[T] {
		return value;
	}

	/**
	 * Validates that `value` matches the expected primitive type (`'string'`, `'number'`, or `'boolean'`).
	 *
	 * For strings, also enforces a **5 MB maximum length** to prevent denial-of-service
	 * attacks via oversized payloads.
	 *
	 * `null` and `undefined` pass without error (treated as absent values).
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` when the type matches and (for strings) length ≤ 5 MB;
	 *          `{ isValid: false, error }` otherwise.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return { isValid: true };
		}

		if (typeof value === 'string' && value.length > 5 * 1024 * 1024) {
			return {
				isValid: false,
				error: `${context.className}.${context.propertyKey}: String too long (> 5MB)`,
			};
		}

		if (typeof value === this.expectedType) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected ${this.expectedType}, got ${typeof value}`,
		};
	}
}

/**
 * Transformer for string values.
 * @see {@link PrimitiveTransformer} — generic class implementing this transformer
 * @see {@link NumberTransformer} — numeric primitive variant
 */
export const StringTransformer = new PrimitiveTransformer('string');

/**
 * Transformer for number values.
 * @see {@link PrimitiveTransformer} — generic class implementing this transformer
 * @see {@link StringTransformer} — string primitive variant
 */
export const NumberTransformer = new PrimitiveTransformer('number');

/**
 * Transformer for boolean values.
 * @see {@link PrimitiveTransformer} — generic class implementing this transformer
 * @see {@link NumberTransformer} — numeric primitive variant
 */
export const BooleanTransformer = new PrimitiveTransformer('boolean');

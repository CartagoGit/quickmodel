import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import {
	IQTransformContext,
	IQValidationContext,
	IQValidationResult,
	IQValidator,
} from '../core/interfaces/transformer.interface';

type PrimitiveType = 'string' | 'number' | 'boolean';

type PrimitiveTypeMap = {
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
 * const json = config.serialize();
 * console.log(json); // { name: "server", port: 3000, enabled: true }
 *
 * // Type mismatch throws error
 * new Config({ name: 123 }); // Error: Expected string, got number
 * ```
 */
export class PrimitiveTransformer<T extends PrimitiveType>
	extends BaseTransformer<PrimitiveTypeMap[T], PrimitiveTypeMap[T]>
	implements IQValidator
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
	): PrimitiveTypeMap[T] | null {
		// Coercion Logic
		const coercionStrategy = context?.metadata?.coercionStrategy as string;

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

		const validationResult = this.validate(value, {
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

		return value as PrimitiveTypeMap[T];
	}

	/**
	 * Returns the value without transformation.
	 *
	 * @param value - The value to serialize
	 * @returns The same value
	 */
	serialize(value: PrimitiveTypeMap[T]): PrimitiveTypeMap[T] {
		return value;
	}

	/**
	 * Validates if a value matches the expected primitive type.
	 *
	 * @param value - The value to validate
	 * @param context - Validation context with property and class information
	 * @returns Validation result
	 */
	validate(value: unknown, context: IQValidationContext): IQValidationResult {
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
 */
export const StringTransformer = new PrimitiveTransformer('string');

/**
 * Transformer for number values.
 */
export const NumberTransformer = new PrimitiveTransformer('number');

/**
 * Transformer for boolean values.
 */
export const BooleanTransformer = new PrimitiveTransformer('boolean');

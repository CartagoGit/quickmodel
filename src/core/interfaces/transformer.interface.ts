/**
 * SOLID - Single Responsibility: Each transformer only handles ONE type of transformation
 * SOLID - Interface Segregation: Specific interfaces, not generic
 */

export interface IQTransformer<TInput = unknown, TOutput = unknown> {
	/**
	 * Transforms from interface (JSON) to model type
	 * @param value - Value from JSON/Interface
	 * @param propertyKey - Property name
	 * @param className - Class name
	 */
	deserialize(
		value: TInput | null | undefined,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): TOutput | null;

	/**
	 * Serializes from model type to interface (JSON)
	 * @param value - Model value
	 * @param context - Optional context
	 */
	serialize(value: TOutput, context?: IQTransformContext): TInput;
}

export type IQTransformerKey = string | Function | object;

export interface IQValidator {
	/**
	 * Validates that the value is of the correct type
	 */
	validate(value: unknown, context: IQValidationContext): IQValidationResult;
}

export interface IQTransformContext {
	propertyKey: string;
	className: string;
	metadata?: Record<string, unknown>;
}

export interface IQValidationContext {
	propertyKey: string;
	className?: string;
	value?: unknown;
	target?: unknown;
}

export interface IQValidationResult {
	isValid: boolean;
	error?: string;
}

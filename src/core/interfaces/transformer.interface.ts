/**
 * SOLID - Single Responsibility: Each transformer only handles ONE type of transformation
 * SOLID - Interface Segregation: Specific interfaces, not generic
 */

export interface IQTransformer<TInput = unknown, TOutput = unknown> {
	/**
	 * Transforma desde la interfaz (JSON) hacia el tipo del modelo
	 * @param value - Valor desde JSON/Interface
	 * @param propertyKey - Nombre de la propiedad
	 * @param className - Nombre de la clase
	 */
	deserialize(value: TInput, propertyKey: string, className: string): TOutput;

	/**
	 * Serializa desde el tipo del modelo hacia la interfaz (JSON)
	 * @param value - Valor del modelo
	 */
	serialize(value: TOutput): TInput;
}

export interface IQValidator {
	/**
	 * Valida que el valor sea del tipo correcto
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
	className: string;
	value: unknown;
}

export interface IQValidationResult {
	isValid: boolean;
	error?: string;
}

/**
 * SOLID - Single Responsibility: Each transformer only handles ONE type of transformation
 * SOLID - Interface Segregation: Specific interfaces, not generic
 */

export interface ITransformer<TInput = any, TOutput = any> {
  /**
   * Transforma desde la interfaz (JSON) hacia el tipo del modelo
   * @param value - Valor desde JSON/Interface
   * @param propertyKey - Nombre de la propiedad
   * @param className - Nombre de la clase
   */
  fromInterface(value: TInput, propertyKey: string, className: string): TOutput;

  /**
   * Serializa desde el tipo del modelo hacia la interfaz (JSON)
   * @param value - Valor del modelo
   */
  toInterface(value: TOutput): TInput;
}

export interface IValidator {
  /**
   * Valida que el valor sea del tipo correcto
   */
  validate(value: any, context: IValidationContext): IValidationResult;
}

export interface ITransformContext {
  propertyKey: string;
  className: string;
  metadata?: Record<string, any>;
}

export interface IValidationContext {
  propertyKey: string;
  className: string;
  value: any;
}

export interface IValidationResult {
  isValid: boolean;
  error?: string;
}

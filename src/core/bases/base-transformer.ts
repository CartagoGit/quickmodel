/**
 * Clase base abstracta para transformers
 *
 * Proporciona una implementación base común para todos los transformers,
 * permitiendo que solo implementen los métodos específicos de transformación.
 */

import { ITransformer } from '../interfaces/transformer.interface';

export abstract class BaseTransformer<TInput = any, TOutput = any> implements ITransformer<
  TInput,
  TOutput
> {
  /**
   * Transforma desde la interfaz (JSON) hacia el tipo del modelo
   * Debe ser implementado por cada transformer específico
   */
  abstract fromInterface(value: TInput, propertyKey: string, className: string): TOutput;

  /**
   * Serializa desde el tipo del modelo hacia la interfaz (JSON)
   * Debe ser implementado por cada transformer específico
   */
  abstract toInterface(value: TOutput): TInput;
}

/**
 * SOLID - Open/Closed: Open for extension, closed for modification
 * SOLID - Dependency Inversion: Register transformers without coupling implementations
 */

import { ITransformer, IValidator } from './transformer.interface';

export type TypeKey = string | symbol | Function;

export interface ITransformerRegistry {
  /**
   * Registra un transformer para un tipo específico
   */
  register(typeKey: TypeKey, transformer: ITransformer): void;

  /**
   * Obtiene un transformer para un tipo específico
   */
  get(typeKey: TypeKey): ITransformer | undefined;

  /**
   * Verifica si existe un transformer para un tipo
   */
  has(typeKey: TypeKey): boolean;

  /**
   * Elimina un transformer del registro
   */
  unregister(typeKey: TypeKey): void;
}

export interface IValidatorRegistry {
  /**
   * Registra un validador para un tipo específico
   */
  register(typeKey: TypeKey, validator: IValidator): void;

  /**
   * Obtiene un validador para un tipo específico
   */
  get(typeKey: TypeKey): IValidator | undefined;

  /**
   * Verifica si existe un validador para un tipo
   */
  has(typeKey: TypeKey): boolean;
}

/**
 * SOLID - Open/Closed: Open for extension, closed for modification
 * SOLID - Dependency Inversion: Register transformers without coupling implementations
 */

import { IQTransformer, IQValidator } from './transformer.interface';

export type TypeKey = string | symbol | Function;

export interface IQTransformerRegistry {
  /**
   * Registra un transformer para un tipo específico
   */
  register(typeKey: TypeKey, transformer: IQTransformer): void;

  /**
   * Obtiene un transformer para un tipo específico
   */
  get(typeKey: TypeKey): IQTransformer | undefined;

  /**
   * Verifica si existe un transformer para un tipo
   */
  has(typeKey: TypeKey): boolean;

  /**
   * Elimina un transformer del registro
   */
  unregister(typeKey: TypeKey): void;
}

export interface IQValidatorRegistry {
  /**
   * Registra un validador para un tipo específico
   */
  register(typeKey: TypeKey, validator: IQValidator): void;

  /**
   * Obtiene un validador para un tipo específico
   */
  get(typeKey: TypeKey): IQValidator | undefined;

  /**
   * Verifica si existe un validador para un tipo
   */
  has(typeKey: TypeKey): boolean;
}

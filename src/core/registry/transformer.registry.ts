/**
 * Registry for managing type transformers.
 * 
 * Centralized storage for all transformers that handle type conversions
 * between JSON-compatible formats and runtime types.
 * 
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only manages transformer registration
 * - **Open/Closed**: New transformers can be added without modifying this code
 * - **Dependency Inversion**: Components depend on ITransformerRegistry interface
 * 
 * Transformers can be registered using various key types:
 * - Constructor functions (e.g., `Date`, `URL`)
 * - Strings (e.g., `'date'`, `'bigint'`)
 * - Symbols (e.g., `Symbol.for('custom')`)
 * 
 * @example
 * ```typescript
 * const registry = new TransformerRegistry();
 * 
 * // Register by constructor
 * registry.register(Date, dateTransformer);
 * 
 * // Register by string
 * registry.register('bigint', bigintTransformer);
 * 
 * // Use registered transformer
 * const transformer = registry.get(Date);
 * if (transformer) {
 *   const date = transformer.fromInterface('2024-01-01', 'prop', 'Class');
 * }
 * ```
 */

import { IQTransformer, IQTransformerRegistry } from '../interfaces';

type TypeKey = string | symbol | Function;

export class TransformerRegistry implements IQTransformerRegistry {
  private readonly transformers = new Map<TypeKey, ITransformer>();

  /**
   * Registers a transformer for a specific type.
   * 
   * @param typeKey - The type identifier (constructor, string, or symbol)
   * @param transformer - The transformer instance to register
   */
  register(typeKey: TypeKey, transformer: IQTransformer): void {
    this.transformers.set(typeKey, transformer);
  }

  /**
   * Retrieves a registered transformer.
   * 
   * @param typeKey - The type identifier to look up
   * @returns The transformer if found, undefined otherwise
   */
  get(typeKey: TypeKey): IQTransformer | undefined {
    return this.transformers.get(typeKey);
  }

  /**
   * Checks if a transformer is registered for a type.
   * 
   * @param typeKey - The type identifier to check
   * @returns True if a transformer exists for this type
   */
  has(typeKey: TypeKey): boolean {
    return this.transformers.has(typeKey);
  }

  /**
   * Removes a transformer from the registry.
   * 
   * @param typeKey - The type identifier to unregister
   */
  unregister(typeKey: TypeKey): void {
    this.transformers.delete(typeKey);
  }

  /**
   * Removes all transformers from the registry.
   */
  clear(): void {
    this.transformers.clear();
  }

  /**
   * Gets a copy of all registered transformers.
   * 
   * @returns A new Map containing all transformer entries
   */
  getAll(): Map<TypeKey, ITransformer> {
    return new Map(this.transformers);
  }
}

/**
 * Global singleton transformer registry instance.
 * 
 * @remarks
 * This singleton is used throughout the library for consistent transformer access.
 * All built-in transformers are automatically registered to this instance.
 */
export const qTransformerRegistry = new TransformerRegistry();

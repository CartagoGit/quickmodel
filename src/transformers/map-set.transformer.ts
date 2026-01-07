import { BaseTransformer } from '../core/bases/base-transformer';
import { IQValidationContext, IQValidationResult, IQValidator } from '../core/interfaces';

/**
 * Transformer for Map type: converts between plain object and Map.
 * 
 * **Serialization**: `Map<K, V>` → `Record<string, V>`
 * **Deserialization**: `Record<string, V>` → `Map<K, V>`
 * 
 * @template K - The key type (converted to string during serialization)
 * @template V - The value type
 * 
 * @remarks
 * Map keys are always converted to strings during JSON serialization.
 * Non-string keys will be stringified.
 * 
 * @example
 * ```typescript
 * class Config extends QuickModel<IConfig> {
 *   @QType() metadata!: Map<string, any>;
 * }
 * 
 * const config = new Config({
 *   metadata: { key1: "value1", key2: 123 }
 * });
 * console.log(config.metadata instanceof Map); // true
 * 
 * const data = config.toInterface();
 * console.log(data.metadata); // { key1: "value1", key2: 123 }
 * ```
 */
export class MapTransformer<K = string, V = unknown>
  extends BaseTransformer<Record<string, V>, Map<K, V>>
  implements IQValidator
{
  /**
   * Converts a plain object or __type format to Map.
   * 
   * @param value - The value to convert (object, {__type, entries}, or Map)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns A Map instance
   * @throws {Error} If the value is not an object or Map
   */
  fromInterface(
    value: Record<string, V> | { __type: 'Map'; entries: [K, V][] } | Map<K, V>,
    propertyKey: string,
    className: string,
  ): Map<K, V> {
    if (value instanceof Map) {
      return value;
    }

    // Handle new format with __type marker
    if (typeof value === 'object' && value !== null && '__type' in value && value.__type === 'Map') {
      return new Map(value.entries);
    }

    // Handle legacy plain object format
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${className}.${propertyKey}: Expected object for Map, got ${typeof value}`);
    }

    return new Map(Object.entries(value) as Iterable<[K, V]>);
  }

  /**
   * Converts a Map to an object with __type marker for reliable detection.
   * 
   * @param value - The Map to serialize
   * @returns Object with __type marker and entries array
   */
  toInterface(value: Map<K, V>): { __type: 'Map'; entries: [K, V][] } {
    return { __type: 'Map', entries: Array.from(value.entries()) };
  }

  /**
   * Validates if a value is a Map or plain object.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
  validate(value: unknown, context: IQValidationContext): IQValidationResult {
    if (value instanceof Map) {
      return { isValid: true };
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected Map or object, got ${typeof value}`,
    };
  }
}

/**
 * Transformer for Set type: converts between array and Set.
 * 
 * **Serialization**: `Set<V>` → `V[]`
 * **Deserialization**: `V[]` → `Set<V>`
 * 
 * @template V - The element type
 * 
 * @remarks
 * Automatically removes duplicate values when creating Set from array.
 * 
 * @example
 * ```typescript
 * class Config extends QuickModel<IConfig> {
 *   @QType() tags!: Set<string>;
 * }
 * 
 * const config = new Config({
 *   tags: ["tag1", "tag2", "tag1"] // duplicate will be removed
 * });
 * console.log(config.tags instanceof Set); // true
 * console.log(config.tags.size); // 2
 * 
 * const data = config.toInterface();
 * console.log(Array.isArray(data.tags)); // true
 * ```
 */
export class SetTransformer<V = unknown>
  extends BaseTransformer<V[], Set<V>>
  implements IQValidator
{
  /**
   * Converts an array or __type format to Set.
   * 
   * @param value - The value to convert (array, {__type, values}, or Set)
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns A Set instance
   * @throws {Error} If the value is not an array or Set
   */
  fromInterface(value: V[] | { __type: 'Set'; values: V[] } | Set<V>, propertyKey: string, className: string): Set<V> {
    if (value instanceof Set) {
      return value;
    }

    // Handle new format with __type marker
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && '__type' in value && value.__type === 'Set') {
      return new Set(value.values);
    }

    // Handle legacy plain array format
    if (!Array.isArray(value)) {
      throw new Error(`${className}.${propertyKey}: Expected array for Set, got ${typeof value}`);
    }

    return new Set(value);
  }

  /**
   * Converts a Set to an object with __type marker for reliable detection.
   * 
   * @param value - The Set to serialize
   * @returns Object with __type marker and values array
   */
  toInterface(value: Set<V>): { __type: 'Set'; values: V[] } {
    return { __type: 'Set', values: Array.from(value) };
  }

  /**
   * Validates if a value is a Set or array.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
  validate(value: unknown, context: IQValidationContext): IQValidationResult {
    if (value instanceof Set || Array.isArray(value)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected Set or array, got ${typeof value}`,
    };
  }
}

export const mapTransformer = new MapTransformer();
export const setTransformer = new SetTransformer();

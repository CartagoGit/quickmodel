import { BaseTransformer } from '../core/bases/base-transformer';
import { IValidationContext, IValidationResult, IValidator } from '../core/interfaces';

/**
 * Transformer para Map: Record<K, V> <-> Map<K, V>
 */
export class MapTransformer<K = string, V = unknown>
  extends BaseTransformer<Record<string, V>, Map<K, V>>
  implements IValidator
{
  fromInterface(
    value: Record<string, V> | Map<K, V>,
    propertyKey: string,
    className: string,
  ): Map<K, V> {
    if (value instanceof Map) {
      return value;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${className}.${propertyKey}: Expected object for Map, got ${typeof value}`);
    }

    return new Map(Object.entries(value) as Iterable<[K, V]>);
  }

  toInterface(value: Map<K, V>): Record<string, V> {
    return Object.fromEntries(value);
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
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
 * Transformer para Set: V[] <-> Set<V>
 */
export class SetTransformer<V = unknown>
  extends BaseTransformer<V[], Set<V>>
  implements IValidator
{
  fromInterface(value: V[] | Set<V>, propertyKey: string, className: string): Set<V> {
    if (value instanceof Set) {
      return value;
    }

    if (!Array.isArray(value)) {
      throw new Error(`${className}.${propertyKey}: Expected array for Set, got ${typeof value}`);
    }

    return new Set(value);
  }

  toInterface(value: Set<V>): V[] {
    return Array.from(value);
  }

  validate(value: unknown, context: IValidationContext): IValidationResult {
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

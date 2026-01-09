/**
 * Service for serializing model instances to JSON-compatible format.
 * 
 * Converts QuickModel instances and their fields into plain objects suitable
 * for JSON serialization, using registered transformers for type conversions.
 * 
 * @template TModel - The model type (extends Record)
 * @template TInterface - The serialized interface type
 * 
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only handles model serialization
 * 
 * Serialization process:
 * 1. Iterates through all model properties
 * 2. Looks up transformers for special types (Date, URL, Map, etc.)
 * 3. Falls back to default serialization if no transformer found
 * 4. Handles nested models recursively via `serialize()` method
 * 
 * @example
 * ```typescript
 * const serializer = new ModelSerializer();
 * 
 * class User extends QuickModel<IUser> {
 *   @QType() name!: string;
 *   @QType('date') birthDate!: Date;
 *   @QType() tags!: Set<string>;
 * }
 * 
 * const user = new User({
 *   name: "John",
 *   birthDate: new Date("2000-01-01"),
 *   tags: new Set(["admin", "user"])
 * });
 * 
 * const json = serializer.serialize(user);
 * // { name: "John", birthDate: "2000-01-01T00:00:00.000Z", tags: ["admin", "user"] }
 * 
 * const jsonString = serializer.serializeToJson(user);
 * // JSON string representation
 * ```
 */

import { IQSerializer } from '../interfaces/serializer.interface';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { DateTransformer } from '@/transformers/date.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
import { SymbolTransformer } from '@/transformers/symbol.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';
import { URLTransformer } from '@/transformers/url.transformer';
import { URLSearchParamsTransformer } from '@/transformers/url-search-params.transformer';

export class ModelSerializer<
  TModel extends Record<string, unknown> = Record<string, unknown>,
  TInterface = any
> implements IQSerializer<TModel, TInterface> {
  private readonly transformers: Map<string | Function, any>;

  /**
   * Creates a model serializer.
   */
  constructor() {
    // Initialize transformers
    this.transformers = new Map();
    
    const dateTransformer = new DateTransformer();
    const bigintTransformer = new BigIntTransformer();
    const symbolTransformer = new SymbolTransformer();
    const regexpTransformer = new RegExpTransformer();
    const errorTransformer = new ErrorTransformer();
    const urlTransformer = new URLTransformer();
    const urlSearchParamsTransformer = new URLSearchParamsTransformer();
    
    // Register by name and constructor
    this.transformers.set('date', dateTransformer);
    this.transformers.set(Date, dateTransformer);
    this.transformers.set('bigint', bigintTransformer);
    this.transformers.set('symbol', symbolTransformer);
    this.transformers.set('regexp', regexpTransformer);
    this.transformers.set(RegExp, regexpTransformer);
    this.transformers.set('error', errorTransformer);
    this.transformers.set(Error, errorTransformer);
    this.transformers.set(URL, urlTransformer);
    this.transformers.set(URLSearchParams, urlSearchParamsTransformer);
    
    // Register typed arrays
    this.transformers.set(Int8Array, new TypedArrayTransformer<Int8Array>(Int8Array));
    this.transformers.set(Uint8Array, new TypedArrayTransformer<Uint8Array>(Uint8Array));
    this.transformers.set(Int16Array, new TypedArrayTransformer<Int16Array>(Int16Array));
    this.transformers.set(Uint16Array, new TypedArrayTransformer<Uint16Array>(Uint16Array));
    this.transformers.set(Int32Array, new TypedArrayTransformer<Int32Array>(Int32Array));
    this.transformers.set(Uint32Array, new TypedArrayTransformer<Uint32Array>(Uint32Array));
    this.transformers.set(Float32Array, new TypedArrayTransformer<Float32Array>(Float32Array));
    this.transformers.set(Float64Array, new TypedArrayTransformer<Float64Array>(Float64Array));
    this.transformers.set(BigInt64Array, new TypedArrayTransformer<BigInt64Array>(BigInt64Array));
    this.transformers.set(BigUint64Array, new TypedArrayTransformer<BigUint64Array>(BigUint64Array));
  }

  /**
   * Serializes a model instance to plain object using transformers.
   * 
   * @param model - The model instance to serialize
   * @returns Plain object suitable for JSON serialization with transformers applied
   * 
   * @remarks
   * Uses transformers to convert special types (BigInt, Date, RegExp, etc.) to JSON-compatible format.
   */
  serialize(model: TModel): TInterface {
    const result: Record<string, unknown> = {};
    const seen = new WeakSet();
    
    // Get all property keys
    const keys = new Set<string>();
    for (const key of Object.keys(model as object)) {
      keys.add(key);
    }
    
    let proto = Object.getPrototypeOf(model);
    while (proto && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        if (descriptor && (descriptor.get || descriptor.set) && key !== 'constructor') {
          keys.add(key);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
    
    // Serialize with transformers
    for (const key of keys) {
      if (key.startsWith('__') || key.startsWith('_')) {
        continue;
      }
      
      const value = (model as any)[key];
      result[key] = this.serializeValue(value);
    }

    return result as TInterface;
  }

  /**
   * Converts model to interface format, preserving original input types.
   * 
   * @param model - The model instance to convert
   * @returns Plain object with values in their original input format
   * 
   * @remarks
   * Preserves the exact format that was provided in the constructor.
   * If a Date was provided as ISO string, returns ISO string.
   * If a BigInt was provided as string, returns string.
   */
  toInterface(model: TModel): TInterface {
    const result: Record<string, unknown> = {};
    const seen = new WeakSet(); // Track circular references
    const initData = (model as any).__initData || {};
    const isProduction = process.env.NODE_ENV === 'production';

    // Get all property keys, including those with getters/setters
    const keys = new Set<string>();
    
    // Add own enumerable properties
    for (const key of Object.keys(model as object)) {
      keys.add(key);
    }
    
    // Add properties with getters/setters from prototype chain
    let proto = Object.getPrototypeOf(model);
    while (proto && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        if (descriptor && (descriptor.get || descriptor.set) && key !== 'constructor') {
          keys.add(key);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
    
    // Serialize all discovered properties
    for (const key of keys) {
      // Skip internal properties
      if (key.startsWith('__') || key.startsWith('_')) {
        continue;
      }
      
      const currentValue = (model as any)[key];
      const originalValue = initData[key];
      
      // Convert to interface format, preserving original type
      result[key] = this.convertToInterfaceFormat(currentValue, originalValue, seen, isProduction, key);
    }

    return result as TInterface;
  }

  /**
   * Converts a value to interface format, preserving the original type from __initData
   */
  private convertToInterfaceFormat(
    currentValue: any,
    originalValue: any,
    seen: WeakSet<object>,
    isProduction: boolean,
    propertyKey: string = ''
  ): any {
    // Handle null and undefined first
    if (currentValue === null) return null;
    if (currentValue === undefined) return undefined;
    
    // Check for circular references (only for objects)
    if (typeof currentValue === 'object' && currentValue !== null) {
      if (seen.has(currentValue)) {
        const returnValue = { __circular: true };
        const errorMsg = `QuickModel Error => [Circular reference] at property '${propertyKey}'`;
        
        if (!isProduction) {
          throw new Error(errorMsg);
        } else {
          console.error(errorMsg, returnValue);
          return returnValue;
        }
      }
      seen.add(currentValue);
    }

    // If no original value to compare, return currentValue as-is for primitives
    if (originalValue === undefined) {
      // For primitives (including symbols), return as-is
      if (typeof currentValue !== 'object' || currentValue === null) {
        return currentValue;
      }
      // For objects, use default serialization
      return this.serializeValue(currentValue);
    }

    // DATE: Check BEFORE generic string handling
    // originalValue can be Date instance OR ISO string
    if (originalValue instanceof Date || 
        (typeof originalValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(originalValue))) {
      // If currentValue is a Date, convert to ISO string
      if (typeof currentValue?.toISOString === 'function') {
        return currentValue.toISOString();
      }
      // If currentValue is already a string (no transformation occurred), return as-is
      if (typeof currentValue === 'string') {
        return currentValue;
      }
      // Fallback: convert to string
      return String(currentValue);
    }

    // PRIMITIVES: Preserve primitive type
    if (typeof originalValue === 'number') {
      // Includes NaN, Infinity, -Infinity as numbers
      return Number(currentValue);
    }
    
    if (typeof originalValue === 'string') {
      return String(currentValue);
    }
    
    if (typeof originalValue === 'boolean') {
      return Boolean(currentValue);
    }
    
    if (typeof originalValue === 'bigint') {
      return BigInt(currentValue);
    }
    
    if (typeof originalValue === 'symbol') {
      return typeof currentValue === 'symbol' ? currentValue : Symbol(currentValue);
    }

    // WRAPPER OBJECTS: Number, String, Boolean objects
    if (originalValue instanceof Number) {
      // Extract primitive value if currentValue is also a wrapper
      const primitiveValue = typeof currentValue === 'object' && currentValue !== null && 'valueOf' in currentValue
        ? currentValue.valueOf()
        : currentValue;
      return new Number(primitiveValue);
    }
    
    if (originalValue instanceof String) {
      const primitiveValue = typeof currentValue === 'object' && currentValue !== null && 'valueOf' in currentValue
        ? currentValue.valueOf()
        : currentValue;
      return new String(primitiveValue);
    }
    
    if (originalValue instanceof Boolean) {
      const primitiveValue = typeof currentValue === 'object' && currentValue !== null && 'valueOf' in currentValue
        ? currentValue.valueOf()
        : currentValue;
      return new Boolean(primitiveValue);
    }

    // ARRAYS: Recursively convert elements
    if (Array.isArray(originalValue)) {
      if (!Array.isArray(currentValue)) {
        return [];
      }
      return currentValue.map((item: any, index: number) => 
        this.convertToInterfaceFormat(item, originalValue[index], seen, isProduction, `${propertyKey}[${index}]`)
      );
    }

    // REGEXP: Preserve original format
    if (originalValue instanceof RegExp) {
      if (!(currentValue instanceof RegExp)) {
        return originalValue.toString();
      }
      return currentValue.toString();
    }
    
    // RegExp as string pattern
    if (typeof originalValue === 'string' && currentValue instanceof RegExp) {
      if (originalValue.startsWith('/')) {
        return currentValue.toString(); // "/pattern/flags"
      } else {
        return currentValue.source; // "pattern"
      }
    }
    
    // RegExp as object
    if (originalValue && typeof originalValue === 'object' && 
        'source' in originalValue && 'flags' in originalValue &&
        currentValue instanceof RegExp) {
      return { source: currentValue.source, flags: currentValue.flags };
    }

    // BIGINT: Preserve original format
    if (originalValue && typeof originalValue === 'object' && originalValue.__type === 'bigint') {
      const bigintValue = typeof currentValue === 'bigint' ? currentValue : BigInt(currentValue);
      return { __type: 'bigint', value: bigintValue.toString() };
    }
    
    if (typeof originalValue === 'string' && typeof currentValue === 'bigint') {
      return currentValue.toString();
    }

    // PLAIN OBJECTS: Recursively convert properties
    if (originalValue && typeof originalValue === 'object') {
      const result: any = {};
      
      // Handle objects without constructor (Object.create(null))
      if (!originalValue.constructor) {
        const resultNoProto = Object.create(null);
        for (const key in currentValue) {
          resultNoProto[key] = this.convertToInterfaceFormat(
            currentValue[key],
            originalValue[key],
            seen,
            isProduction,
            `${propertyKey}.${key}`
          );
        }
        return resultNoProto;
      }
      
      // Plain Object literal
      if (originalValue.constructor === Object) {
        // Ensure currentValue is also an object
        if (typeof currentValue !== 'object' || currentValue === null) {
          if (!isProduction) {
            throw new Error(
              `Cannot convert property "${propertyKey}": original was object but current is ${typeof currentValue}`
            );
          }
          console.error(`Cannot convert property "${propertyKey}": type mismatch`);
          return currentValue;
        }
        
        for (const key in originalValue) {
          if (key in currentValue) {
            result[key] = this.convertToInterfaceFormat(
              currentValue[key],
              originalValue[key],
              seen,
              isProduction,
              `${propertyKey}.${key}`
            );
          }
        }
        return result;
      }
      
      // Objects with custom constructor: try to serialize back
      // For QModel instances, serialize them
      if (typeof currentValue?.serialize === 'function') {
        return currentValue.serialize();
      }
      
      // For other objects, create plain object
      for (const key in currentValue) {
        if (typeof currentValue[key] !== 'function') {
          result[key] = this.convertToInterfaceFormat(
            currentValue[key],
            originalValue[key],
            seen,
            isProduction,
            `${propertyKey}.${key}`
          );
        }
      }
      return result;
    }

    // Fallback: use default serialization
    return this.serializeValue(currentValue);
  }

  /**
   * Serializes a model instance to JSON string.
   * 
   * @param model - The model instance to serialize
   * @returns JSON string representation
   */
  serializeToJson(model: TModel): string {
    return JSON.stringify(this.serialize(model));
  }

  /**
   * Serializes a single value based on its type.
   * 
   * @param value - The value to serialize
   * @returns Serialized value suitable for JSON
   * 
   * @remarks
   * Handles special types in priority order:
   * 1. Date → ISO string
   * 2. URL → href string
   * 3. URLSearchParams → query string
   * 4. BigInt → string
   * 5. Symbol → string (via Symbol.keyFor)
   * 6. RegExp → object with source/flags
   * 7. Error → object with message/stack/name
   * 8. TypedArrays → number/string arrays
   * 9. ArrayBuffer/DataView → byte arrays
   * 10. Nested models → recursive serialization
   * 11. Arrays → element-wise serialization
   * 12. Map → object
   * 13. Set → array
   * 14. Primitives → as-is
   */
  private serializeValue(value: unknown): unknown {
    // Date
    if (value instanceof Date) {
      const transformer = this.transformers.get('date') || this.transformers.get(Date);
      return transformer ? transformer.serialize(value) : value.toISOString();
    }

    // URL
    if (value instanceof URL) {
      const transformer = this.transformers.get(URL) || this.transformers.get(Symbol('URL').toString());
      return transformer ? transformer.serialize(value) : value.href;
    }

    // URLSearchParams
    if (value instanceof URLSearchParams) {
      const transformer = this.transformers.get(URLSearchParams) || this.transformers.get(Symbol('URLSearchParams').toString());
      return transformer ? transformer.serialize(value) : value.toString();
    }

    // BigInt
    if (typeof value === 'bigint') {
      const transformer = this.transformers.get('bigint');
      if (transformer) {
        return transformer.serialize(value);
      }
      return value.toString();
    }

    // Symbol
    if (typeof value === 'symbol') {
      const transformer = this.transformers.get('symbol');
      return transformer
        ? transformer.serialize(value)
        : Symbol.keyFor(value) || value.toString();
    }

    // RegExp
    if (value instanceof RegExp) {
      const transformer = this.transformers.get(RegExp) || this.transformers.get(Symbol('RegExp').toString());
      return transformer
        ? transformer.serialize(value)
        : { source: value.source, flags: value.flags };
    }

    // Error
    if (value instanceof Error) {
      const transformer = this.transformers.get(Error) || this.transformers.get(Symbol('Error').toString());
      return transformer
        ? transformer.serialize(value)
        : { message: value.message, stack: value.stack, name: value.name };
    }

    // TypedArrays
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      // Determinar qué constructor usar para buscar el transformer
      let transformer;
      if (value instanceof Int8Array) transformer = this.transformers.get(Int8Array);
      else if (value instanceof Uint8Array) transformer = this.transformers.get(Uint8Array);
      else if (value instanceof Int16Array) transformer = this.transformers.get(Int16Array);
      else if (value instanceof Uint16Array) transformer = this.transformers.get(Uint16Array);
      else if (value instanceof Int32Array) transformer = this.transformers.get(Int32Array);
      else if (value instanceof Uint32Array) transformer = this.transformers.get(Uint32Array);
      else if (value instanceof Float32Array) transformer = this.transformers.get(Float32Array);
      else if (value instanceof Float64Array) transformer = this.transformers.get(Float64Array);
      else if (value instanceof BigInt64Array) transformer = this.transformers.get(BigInt64Array);
      else if (value instanceof BigUint64Array) transformer = this.transformers.get(BigUint64Array);

      if (transformer) {
        return transformer.serialize(value);
      }

      // Fallback: convertir a array
      // Para BigInt64Array y BigUint64Array, convertir bigints a strings
      if (value instanceof BigInt64Array || value instanceof BigUint64Array) {
        return Array.from(value, (v: bigint) => v.toString());
      }
      // TypedArrays tienen iterator pero TypeScript necesita type assertion
      if (value instanceof Int8Array) return Array.from(value);
      if (value instanceof Uint8Array) return Array.from(value);
      if (value instanceof Int16Array) return Array.from(value);
      if (value instanceof Uint16Array) return Array.from(value);
      if (value instanceof Int32Array) return Array.from(value);
      if (value instanceof Uint32Array) return Array.from(value);
      if (value instanceof Float32Array) return Array.from(value);
      if (value instanceof Float64Array) return Array.from(value);
      if (value instanceof Uint8ClampedArray) return Array.from(value);
      // Should never reach here
      return [];
    }

    // ArrayBuffer
    if (value instanceof ArrayBuffer) {
      const transformer = this.transformers.get(ArrayBuffer) || this.transformers.get(Symbol('ArrayBuffer').toString());
      return transformer ? transformer.serialize(value) : Array.from(new Uint8Array(value));
    }

    // DataView
    if (value instanceof DataView) {
      const transformer = this.transformers.get(DataView) || this.transformers.get(Symbol('DataView').toString());
      return transformer ? transformer.serialize(value) : Array.from(new Uint8Array(value.buffer));
    }

    // Nested model
    if (typeof value === 'object' && value !== null && 'serialize' in value && typeof value.serialize === 'function') {
      return value.serialize();
    }

    // Array
    if (Array.isArray(value)) {
      if (value.length > 0 && value[0]?.serialize) {
        return value.map((item) => item.serialize());
      }
      return value;
    }

    // Map
    if (value instanceof Map) {
      const transformer = this.transformers.get('map') || this.transformers.get(Map);
      if (transformer) {
        return transformer.serialize(value);
      }
      return Object.fromEntries(value);
    }

    // Set
    if (value instanceof Set) {
      const transformer = this.transformers.get('set') || this.transformers.get(Set);
      if (transformer) {
        return transformer.serialize(value);
      }
      return Array.from(value);
    }

    // Primitive
    return value;
  }
}

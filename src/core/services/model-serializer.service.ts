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
 * - **Dependency Inversion**: Depends on IQTransformerRegistry abstraction
 * 
 * Serialization process:
 * 1. Iterates through all model properties
 * 2. Looks up transformers for special types (Date, URL, Map, etc.)
 * 3. Falls back to default serialization if no transformer found
 * 4. Handles nested models recursively via `toInterface()` method
 * 
 * @example
 * ```typescript
 * const serializer = new ModelSerializer(qTransformerRegistry);
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

import { IQSerializer, IQTransformerRegistry } from '../interfaces';

export class ModelSerializer<
  TModel extends Record<string, unknown> = Record<string, unknown>,
  TInterface = any
> implements IQSerializer<TModel, TInterface> {
  /**
   * Creates a model serializer.
   * 
   * @param qTransformerRegistry - Registry containing type transformers
   */
  constructor(private readonly qTransformerRegistry: IQTransformerRegistry) {}

  /**
   * Serializes a model instance to plain object.
   * 
   * @param model - The model instance to serialize
   * @returns Plain object suitable for JSON serialization
   * 
   * @remarks
   * Preserves null and undefined values as-is. Uses transformers for special
   * types, handles nested models automatically.
   */
  serialize(model: TModel): TInterface {
    const result: Record<string, unknown> = {};

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
      
      const value = (model as any)[key];
      
      if (value === undefined || value === null) {
        result[key] = value;
        continue;
      }

      result[key] = this.serializeValue(value);
    }

    return result as TInterface;
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
      const transformer = this.qTransformerRegistry.get('date') || this.qTransformerRegistry.get(Date);
      return transformer ? transformer.toInterface(value) : value.toISOString();
    }

    // URL
    if (value instanceof URL) {
      const transformer = this.qTransformerRegistry.get(URL) || this.qTransformerRegistry.get(Symbol('URL').toString());
      return transformer ? transformer.toInterface(value) : value.href;
    }

    // URLSearchParams
    if (value instanceof URLSearchParams) {
      const transformer = this.qTransformerRegistry.get(URLSearchParams) || this.qTransformerRegistry.get(Symbol('URLSearchParams').toString());
      return transformer ? transformer.toInterface(value) : value.toString();
    }

    // BigInt
    if (typeof value === 'bigint') {
      const transformer = this.qTransformerRegistry.get('bigint');
      if (transformer) {
        return transformer.toInterface(value);
      }
      return value.toString();
    }

    // Symbol
    if (typeof value === 'symbol') {
      const transformer = this.qTransformerRegistry.get('symbol');
      return transformer
        ? transformer.toInterface(value)
        : Symbol.keyFor(value) || value.toString();
    }

    // RegExp
    if (value instanceof RegExp) {
      const transformer = this.qTransformerRegistry.get(RegExp) || this.qTransformerRegistry.get(Symbol('RegExp').toString());
      return transformer
        ? transformer.toInterface(value)
        : { source: value.source, flags: value.flags };
    }

    // Error
    if (value instanceof Error) {
      const transformer = this.qTransformerRegistry.get(Error) || this.qTransformerRegistry.get(Symbol('Error').toString());
      return transformer
        ? transformer.toInterface(value)
        : { message: value.message, stack: value.stack, name: value.name };
    }

    // TypedArrays
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      // Determinar qué constructor usar para buscar el transformer
      let transformer;
      if (value instanceof Int8Array) transformer = this.qTransformerRegistry.get(Int8Array);
      else if (value instanceof Uint8Array) transformer = this.qTransformerRegistry.get(Uint8Array);
      else if (value instanceof Int16Array) transformer = this.qTransformerRegistry.get(Int16Array);
      else if (value instanceof Uint16Array) transformer = this.qTransformerRegistry.get(Uint16Array);
      else if (value instanceof Int32Array) transformer = this.qTransformerRegistry.get(Int32Array);
      else if (value instanceof Uint32Array) transformer = this.qTransformerRegistry.get(Uint32Array);
      else if (value instanceof Float32Array) transformer = this.qTransformerRegistry.get(Float32Array);
      else if (value instanceof Float64Array) transformer = this.qTransformerRegistry.get(Float64Array);
      else if (value instanceof BigInt64Array) transformer = this.qTransformerRegistry.get(BigInt64Array);
      else if (value instanceof BigUint64Array) transformer = this.qTransformerRegistry.get(BigUint64Array);

      if (transformer) {
        return transformer.toInterface(value);
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
      const transformer = this.qTransformerRegistry.get(ArrayBuffer) || this.qTransformerRegistry.get(Symbol('ArrayBuffer').toString());
      return transformer ? transformer.toInterface(value) : Array.from(new Uint8Array(value));
    }

    // DataView
    if (value instanceof DataView) {
      const transformer = this.qTransformerRegistry.get(DataView) || this.qTransformerRegistry.get(Symbol('DataView').toString());
      return transformer ? transformer.toInterface(value) : Array.from(new Uint8Array(value.buffer));
    }

    // Nested model
    if (typeof value === 'object' && value !== null && 'toInterface' in value && typeof value.toInterface === 'function') {
      return value.toInterface();
    }

    // Array
    if (Array.isArray(value)) {
      if (value.length > 0 && value[0]?.toInterface) {
        return value.map((item) => item.toInterface());
      }
      return value;
    }

    // Map
    if (value instanceof Map) {
      const transformer = this.qTransformerRegistry.get('map') || this.qTransformerRegistry.get(Map);
      if (transformer) {
        return transformer.toInterface(value);
      }
      return Object.fromEntries(value);
    }

    // Set
    if (value instanceof Set) {
      const transformer = this.qTransformerRegistry.get('set') || this.qTransformerRegistry.get(Set);
      if (transformer) {
        return transformer.toInterface(value);
      }
      return Array.from(value);
    }

    // Primitive
    return value;
  }
}

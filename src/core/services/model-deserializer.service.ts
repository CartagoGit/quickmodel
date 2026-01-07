/**
 * Service for deserializing plain data into model instances.
 * 
 * Converts JSON-compatible objects into fully-typed QuickModel instances,
 * using registered transformers and reflection metadata for type conversions.
 * 
 * @template TInterface - The input interface type (plain object)
 * @template TModel - The output model type
 * 
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only handles data deserialization
 * - **Dependency Inversion**: Depends on IQTransformerRegistry abstraction
 * 
 * Deserialization process:
 * 1. Creates instance via Object.create (avoids constructor)
 * 2. Checks for custom transformers via `fieldType` metadata
 * 3. Checks for nested models via `arrayElementClass` metadata
 * 4. Falls back to auto-detection via `design:type` metadata
 * 5. Validates primitive types
 * 
 * @example
 * ```typescript
 * const deserializer = new ModelDeserializer(qTransformerRegistry);
 * 
 * class User extends QuickModel<IUser> {
 *   @QType() name!: string;
 *   @QType('date') birthDate!: Date;
 *   @QType() tags!: Set<string>;
 * }
 * 
 * const data = {
 *   name: "John",
 *   birthDate: "2000-01-01T00:00:00.000Z",
 *   tags: ["admin", "user"]
 * };
 * 
 * const user = deserializer.deserialize(data, User);
 * console.log(user.birthDate instanceof Date); // true
 * console.log(user.tags instanceof Set); // true
 * 
 * // From JSON string
 * const user2 = deserializer.deserializeFromJson(JSON.stringify(data), User);
 * ```
 */

import 'reflect-metadata';
import { IQDeserializer, IQTransformContext, IQTransformer, IQTransformerRegistry } from '../interfaces';
import { qModelRegistry } from '../registry/model.registry';

export class ModelDeserializer<
  TInterface extends Record<string, unknown> = Record<string, unknown>,
  TModel = any
> implements IQDeserializer<TInterface, TModel> {
  /**
   * Creates a model deserializer.
   * 
   * @param qTransformerRegistry - Registry containing type transformers
   */
  constructor(private readonly qTransformerRegistry: IQTransformerRegistry) {}

  /**
   * Deserializes plain data into a model instance.
   * 
   * @template TData - The input data type (can be any interface)
   * @template TResult - The resulting model type
   * @param data - Plain object to deserialize
   * @param modelClass - Model class constructor
   * @returns Fully-typed model instance
   * 
   * @remarks
   * If data is already an instance of the model class, returns it unchanged.
   * Otherwise, creates a new instance and populates it field by field.
   * 
   * This method is independent of the class generics to support nested models
   * with different interface types.
   */
  deserialize<TData extends Record<string, unknown>, TResult = unknown>(
    data: TData, 
    modelClass: new (data: TData) => TResult
  ): TResult {
    // Return existing instance as-is
    if (data instanceof modelClass) {
      return data;
    }

    const instance = Object.create(modelClass.prototype);
    this.populateInstance(instance, data, modelClass);
    return instance;
  }

  /**
   * Deserializes a JSON string into a model instance.
   * 
   * @param json - JSON string to parse and deserialize
   * @param modelClass - Model class constructor
   * @returns Fully-typed model instance
   * @throws {SyntaxError} If JSON parsing fails
   */
  deserializeFromJson(json: string, modelClass: new (data: any) => TModel): TModel {
    const data = JSON.parse(json);
    return this.deserialize(data, modelClass);
  }

  /**
   * Populates a model instance with data from a plain object.
   * 
   * @param instance - The model instance to populate
   * @param data - Plain object containing field values
   * @param modelClass - Model class constructor (for metadata access)
   * 
   * @remarks
   * Field transformation priority:
   * 1. Custom transformer (via `fieldType` metadata)
   * 2. Array of models or nested model (via `arrayElementClass` metadata)
   * 3. Auto-detection (via `design:type` metadata)
   * 
   * Preserves null/undefined values as-is without transformation.
   */
  private populateInstance<T extends Record<string, unknown>>(instance: Record<string, unknown>, data: T, modelClass: Function): void {
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        instance[key] = value;
        continue;
      }

      const context: IQTransformContext = {
        propertyKey: key,
        className: modelClass.name,
      };

      // 1. Check for custom transformer via fieldType metadata
      const fieldType = Reflect.getMetadata('fieldType', instance, key);
      
      if (fieldType) {
        const transformer = this.qTransformerRegistry.get(fieldType);
        if (transformer) {
          instance[key] = transformer.fromInterface(value, context.propertyKey, context.className);
          continue;
        }
      }

      // 2. Check for array of models or nested model
      const arrayElementClass = Reflect.getMetadata('arrayElementClass', instance, key);
      if (arrayElementClass) {
        const designType = Reflect.getMetadata('design:type', instance, key);
        
        // If design:type is Array, it's an array of models
        if (designType === Array) {
          if (!Array.isArray(value)) {
            throw new Error(`${context.className}.${key}: Expected array, got ${typeof value}`);
          }
          const validItems = value.filter((item) => item !== null && item !== undefined);
          instance[key] = validItems.map((item) => {
            if (typeof item !== 'object') {
              throw new Error(`${context.className}.${key}[]: Expected object, got ${typeof item}`);
            }
            return this.deserialize(item, arrayElementClass);
          });
          continue;
        }
        
        // If not Array, it's an individual nested model
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          instance[key] = this.deserialize(value as Record<string, unknown>, arrayElementClass);
          continue;
        }
      }

      // 3. Auto-detection via design:type
      const designType = Reflect.getMetadata('design:type', instance, key);
      
      // Special case: Array without explicit @QType(ModelClass)
      // Try to infer the model class by analyzing the array elements
      if (designType === Array && Array.isArray(value) && !arrayElementClass) {
        instance[key] = this.deserializeArrayWithInference(value, context);
        continue;
      }
      
      instance[key] = this.transformByDesignType(value, designType, context);
    }
  }

  /**
   * Deserializes an array by inferring the model class from element properties.
   * 
   * @param value - The array to deserialize
   * @param context - Transformation context (property name, class name)
   * @returns Array of deserialized models or original array if inference fails
   * @throws {Error} If properties don't match any registered model
   * 
   * @remarks
   * Inference process:
   * 1. Check if array is empty → return empty array
   * 2. Check first element type (primitives vs objects)
   * 3. For objects: Analyze EACH element's properties individually
   * 4. Look up model class for each element by property signature
   * 5. Deserialize each element with its corresponding model
   * 6. Supports union types: (User | Tag)[]
   */
  private deserializeArrayWithInference(value: unknown[], context: IQTransformContext): unknown[] {
    // Empty array - no inference needed
    if (value.length === 0) {
      return [];
    }

    // Find first plain object to use for inference
    // Skip primitives, null, undefined, arrays, and known complex types
    const firstObject = value.find((item) => {
      if (item === null || item === undefined) return false;
      if (typeof item !== 'object') return false;
      if (Array.isArray(item)) return false;
      if (
        item instanceof Date ||
        item instanceof RegExp ||
        item instanceof Error ||
        item instanceof ArrayBuffer ||
        item instanceof DataView ||
        item instanceof Map ||
        item instanceof Set ||
        ArrayBuffer.isView(item)
      ) {
        return false;
      }
      return true; // Plain object
    });

    // If no plain objects found, return array as-is
    if (!firstObject) {
      return value;
    }

    // Check if all OBJECTS in the array are homogeneous (same properties)
    // Get all plain objects for analysis
    const plainObjects = value.filter((item) => {
      if (item === null || item === undefined) return false;
      if (typeof item !== 'object') return false;
      if (Array.isArray(item)) return false;
      if (
        item instanceof Date ||
        item instanceof RegExp ||
        item instanceof Error ||
        item instanceof ArrayBuffer ||
        item instanceof DataView ||
        item instanceof Map ||
        item instanceof Set ||
        ArrayBuffer.isView(item)
      ) {
        return false;
      }
      return true;
    });

    // Check if all plain objects are homogeneous (same properties)
    // This is an optimization for common case
    const firstProperties = Object.keys(firstObject).sort().join(',');
    const allHomogeneous = plainObjects.every((item) => {
      return Object.keys(item as Record<string, unknown>).sort().join(',') === firstProperties;
    });
    
    if (allHomogeneous) {
      // All objects have same properties - infer once and apply to all objects
      const modelClass = qModelRegistry.findByProperties(Object.keys(firstObject));
      
      if (!modelClass) {
        // No matching model found - throw descriptive error
        const available = qModelRegistry.getRegisteredSignatures();
        
        throw new Error(
          `${context.className}.${context.propertyKey}: Cannot infer model for array elements. ` +
          `Object has properties [${firstProperties}] but no registered model matches. ` +
          `Available signatures: ${available.length > 0 ? available.join(' | ') : 'none'}. ` +
          `Use @QType(ModelClass) to specify the type explicitly.`
        );
      }

      // Deserialize all plain objects using same model class, keep others as-is
      type ModelConstructor = new (data: Record<string, unknown>) => unknown;
      return value.map((item) => {
        // Only deserialize plain objects
        if (plainObjects.includes(item)) {
          return this.deserialize(item as Record<string, unknown>, modelClass as ModelConstructor);
        }
        // Keep primitives, Dates, etc. as-is
        return item;
      });
    }

    // Heterogeneous array - infer type for EACH plain object individually (union types)
    // Process each element, deserialize plain objects, keep primitives/complex types as-is
    type ModelConstructor = new (data: Record<string, unknown>) => unknown;
    return value.map((item, index) => {
      // Null/undefined - keep as-is
      if (item === null || item === undefined) {
        return item;
      }
      
      // Primitives - keep as-is
      if (typeof item !== 'object') {
        return item;
      }
      
      // Arrays - keep as-is (nested arrays)
      if (Array.isArray(item)) {
        return item;
      }
      
      // Known complex types - keep as-is
      if (
        item instanceof Date ||
        item instanceof RegExp ||
        item instanceof Error ||
        item instanceof ArrayBuffer ||
        item instanceof DataView ||
        item instanceof Map ||
        item instanceof Set ||
        ArrayBuffer.isView(item)
      ) {
        return item;
      }
      
      // Plain object - try to infer and deserialize
      const properties = Object.keys(item);
      const signature = properties.sort().join(',');
      const modelClass = qModelRegistry.findByProperties(properties);

      if (!modelClass) {
        const available = qModelRegistry.getRegisteredSignatures();
        
        throw new Error(
          `${context.className}.${context.propertyKey}[${index}]: Cannot infer model for element. ` +
          `Object has properties [${signature}] but no registered model matches. ` +
          `Available signatures: ${available.length > 0 ? available.join(' | ') : 'none'}. ` +
          `Use @QType(ModelClass) to specify the type explicitly.`
        );
      }

      return this.deserialize(item as Record<string, unknown>, modelClass as ModelConstructor);
    });
  }

  /**
   * Detects the appropriate transformer based on the value type.
   * Used when @QType() is called without arguments.
   * 
   * @param value - The value to analyze
   * @returns The detected transformer or undefined
   */
  private detectTransformerFromValue(value: unknown): IQTransformer<unknown> | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    // Check if it's an ISO date string (formato YYYY-MM-DDTHH:mm:ss.sssZ)
    if (typeof value === 'string') {
      // ISO 8601 date format - más específico
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)) {
        return this.qTransformerRegistry.get('date');
      }
    }

    // Check for Map/Set/RegExp/Symbol/BigInt/Error/Buffer serialized with __type marker
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      // Maneja tanto mayúsculas (Map, Set) como minúsculas (bigint, symbol, regexp)
      const typeValue = obj.__type;
      if (typeValue === 'Map') {
        return this.qTransformerRegistry.get('map');
      }
      if (typeValue === 'Set') {
        return this.qTransformerRegistry.get('set');
      }
      if (typeValue === 'regexp') {
        return this.qTransformerRegistry.get('regexp');
      }
      if (typeValue === 'symbol') {
        return this.qTransformerRegistry.get('symbol');
      }
      if (typeValue === 'bigint') {
        return this.qTransformerRegistry.get('bigint');
      }
      if (typeValue === 'Error') {
        return this.qTransformerRegistry.get('error');
      }
      if (typeValue === 'Buffer') {
        return this.qTransformerRegistry.get('buffer');
      }
      // Check for typed arrays
      if (typeValue && typeof typeValue === 'string' && typeValue.endsWith('Array')) {
        return this.qTransformerRegistry.get(typeValue.toLowerCase());
      }
    }

    return undefined;
  }

  /**
   * Transforms a value based on its design:type metadata.
   * 
   * @param value - The value to transform
   * @param designType - The TypeScript design type from metadata
   * @param context - Transformation context (property name, class name)
   * @returns Transformed value
   * @throws {Error} If transformation fails or type is invalid
   * 
   * @remarks
   * Handles automatic type conversions for common types:
   * - Date: from string/number
   * - BigInt: from string/number (auto-detected via metadata)
   * - Symbol: from string (auto-detected via metadata)
   * - Map: from object
   * - Set: from array
   * - Nested models: recursive deserialization
   * - Primitives: with type validation
   */
  private transformByDesignType(value: unknown, designType: Function | undefined, context: IQTransformContext): unknown {
    // Si no hay designType (usando declare), intenta detectar del valor
    if (!designType) {
      const detectedTransformer = this.detectTransformerFromValue(value);
      if (detectedTransformer) {
        return detectedTransformer.fromInterface(value, context.propertyKey, context.className);
      }
      return value;
    }

    // Date
    if (designType === Date) {
      const transformer = this.qTransformerRegistry.get('date');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
        return new Date(value);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Date value`);
    }

    // BigInt (auto-detected via TypeScript metadata)
    if (designType === BigInt) {
      const transformer = this.qTransformerRegistry.get('bigint');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return BigInt(value);
      }
      if (typeof value === 'bigint') {
        return value;
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid BigInt value`);
    }

    // Symbol (auto-detected via TypeScript metadata)
    if (designType === Symbol) {
      const transformer = this.qTransformerRegistry.get('symbol');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      if (typeof value === 'string') {
        return Symbol.for(value);
      }
      if (typeof value === 'symbol') {
        return value;
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Symbol value`);
    }

    // Map
    if (designType === Map) {
      const transformer = this.qTransformerRegistry.get('map');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return new Map(Object.entries(value));
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Map value`);
    }

    // Set
    if (designType === Set) {
      const transformer = this.qTransformerRegistry.get('set');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      if (Array.isArray(value)) {
        return new Set(value);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Set value`);
    }

    // RegExp (auto-detected via TypeScript metadata)
    if (designType === RegExp) {
      const transformer = this.qTransformerRegistry.get('regexp');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: RegExp requires transformer`);
    }

    // Error (auto-detected via TypeScript metadata)
    if (designType === Error) {
      const transformer = this.qTransformerRegistry.get('error');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Error requires transformer`);
    }

    // TypedArrays (auto-detected via TypeScript metadata)
    if (designType === Uint8Array) {
      const transformer = this.qTransformerRegistry.get('uint8array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Uint8Array requires transformer`);
    }
    
    if (designType === Uint16Array) {
      const transformer = this.qTransformerRegistry.get('uint16array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Uint16Array requires transformer`);
    }
    
    if (designType === Uint32Array) {
      const transformer = this.qTransformerRegistry.get('uint32array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Uint32Array requires transformer`);
    }
    
    if (designType === Int8Array) {
      const transformer = this.qTransformerRegistry.get('int8array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Int8Array requires transformer`);
    }
    
    if (designType === Int16Array) {
      const transformer = this.qTransformerRegistry.get('int16array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Int16Array requires transformer`);
    }
    
    if (designType === Int32Array) {
      const transformer = this.qTransformerRegistry.get('int32array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Int32Array requires transformer`);
    }
    
    if (designType === Float32Array) {
      const transformer = this.qTransformerRegistry.get('float32array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Float32Array requires transformer`);
    }
    
    if (designType === Float64Array) {
      const transformer = this.qTransformerRegistry.get('float64array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Float64Array requires transformer`);
    }
    
    if (designType === BigInt64Array) {
      const transformer = this.qTransformerRegistry.get('bigint64array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: BigInt64Array requires transformer`);
    }
    
    if (designType === BigUint64Array) {
      const transformer = this.qTransformerRegistry.get('biguint64array');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: BigUint64Array requires transformer`);
    }

    // ArrayBuffer (auto-detected via TypeScript metadata)
    if (designType === ArrayBuffer) {
      const transformer = this.qTransformerRegistry.get('arraybuffer');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: ArrayBuffer requires transformer`);
    }

    // DataView (auto-detected via TypeScript metadata)
    if (designType === DataView) {
      const transformer = this.qTransformerRegistry.get('dataview');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: DataView requires transformer`);
    }

    // Nested model
    if (
      designType !== String &&
      designType !== Number &&
      designType !== Boolean &&
      designType !== Array &&
      designType !== Object &&
      typeof designType === 'function'
    ) {
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(
          `${context.className}.${context.propertyKey}: Expected object, got ${typeof value}`,
        );
      }
      type ModelConstructor = new (data: Record<string, unknown>) => unknown;
      return this.deserialize(value as Record<string, unknown>, designType as ModelConstructor);
    }

    // Primitive validation
    this.validatePrimitive(value, designType, context);

    return value;
  }

  /**
   * Validates that a value matches its expected primitive type.
   * 
   * @param value - The value to validate
   * @param designType - The expected type constructor
   * @param context - Transformation context (for error messages)
   * @throws {Error} If value doesn't match expected primitive type
   */
  private validatePrimitive(value: unknown, designType: Function | undefined, context: IQTransformContext): void {
    if (designType === String && typeof value !== 'string') {
      throw new Error(
        `${context.className}.${context.propertyKey}: Expected string, got ${typeof value}`,
      );
    }
    if (designType === Number && typeof value !== 'number') {
      throw new Error(
        `${context.className}.${context.propertyKey}: Expected number, got ${typeof value}`,
      );
    }
    if (designType === Boolean && typeof value !== 'boolean') {
      throw new Error(
        `${context.className}.${context.propertyKey}: Expected boolean, got ${typeof value}`,
      );
    }
  }
}

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
 * const deserializer = new ModelDeserializer();
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
import { IQDeserializer, IQTransformContext, IQTransformer } from '../interfaces';
import { QTYPES_METADATA_KEY } from '../decorators/qtype.decorator';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { DateTransformer } from '@/transformers/date.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import { MapTransformer, SetTransformer } from '@/transformers/map-set.transformer';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
import { SymbolTransformer } from '@/transformers/symbol.transformer';
import { ArrayBufferTransformer, DataViewTransformer, SharedArrayBufferTransformer } from '@/transformers/buffer.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';
import { URLTransformer, URLSearchParamsTransformer, TextEncoderTransformer, TextDecoderTransformer } from '@/transformers/web-apis.transformer';

export class ModelDeserializer<
  TInterface extends Record<string, unknown> = Record<string, unknown>,
  TModel = any
> implements IQDeserializer<TInterface, TModel> {
  private readonly transformers: Map<string, IQTransformer<any, any>>;

  /**
   * Creates a model deserializer.
   */
  constructor() {
    // Initialize transformers
    this.transformers = new Map();
    
    const dateTransformer = new DateTransformer();
    const bigintTransformer = new BigIntTransformer();
    const symbolTransformer = new SymbolTransformer();
    const regexpTransformer = new RegExpTransformer();
    const errorTransformer = new ErrorTransformer();
    const mapTransformer = new MapTransformer();
    const setTransformer = new SetTransformer();
    const bufferTransformer = new ArrayBufferTransformer();
    const dataviewTransformer = new DataViewTransformer();
    
    // Register by name
    this.transformers.set('date', dateTransformer);
    this.transformers.set('bigint', bigintTransformer);
    this.transformers.set('symbol', symbolTransformer);
    this.transformers.set('regexp', regexpTransformer);
    this.transformers.set('error', errorTransformer);
    this.transformers.set('map', mapTransformer);
    this.transformers.set('set', setTransformer);
    this.transformers.set('buffer', bufferTransformer);
    this.transformers.set('arraybuffer', bufferTransformer);
    this.transformers.set('dataview', dataviewTransformer);
    
    // Register typed arrays
    const int8Transformer = new TypedArrayTransformer<Int8Array>(Int8Array);
    const uint8Transformer = new TypedArrayTransformer<Uint8Array>(Uint8Array);
    const uint8ClampedTransformer = new TypedArrayTransformer<Uint8ClampedArray>(Uint8ClampedArray);
    const int16Transformer = new TypedArrayTransformer<Int16Array>(Int16Array);
    const uint16Transformer = new TypedArrayTransformer<Uint16Array>(Uint16Array);
    const int32Transformer = new TypedArrayTransformer<Int32Array>(Int32Array);
    const uint32Transformer = new TypedArrayTransformer<Uint32Array>(Uint32Array);
    const float32Transformer = new TypedArrayTransformer<Float32Array>(Float32Array);
    const float64Transformer = new TypedArrayTransformer<Float64Array>(Float64Array);
    const bigint64Transformer = new TypedArrayTransformer<BigInt64Array>(BigInt64Array);
    const biguint64Transformer = new TypedArrayTransformer<BigUint64Array>(BigUint64Array);
    
    this.transformers.set('int8array', int8Transformer);
    this.transformers.set('uint8array', uint8Transformer);
    this.transformers.set('uint8clampedarray', uint8ClampedTransformer);
    this.transformers.set('int16array', int16Transformer);
    this.transformers.set('uint16array', uint16Transformer);
    this.transformers.set('int32array', int32Transformer);
    this.transformers.set('uint32array', uint32Transformer);
    this.transformers.set('float32array', float32Transformer);
    this.transformers.set('float64array', float64Transformer);
    this.transformers.set('bigint64array', bigint64Transformer);
    this.transformers.set('biguint64array', biguint64Transformer);
    
    // Register SharedArrayBuffer
    const sharedArrayBufferTransformer = new SharedArrayBufferTransformer();
    this.transformers.set('sharedarraybuffer', sharedArrayBufferTransformer);
    
    // Register Web APIs
    const urlTransformer = new URLTransformer();
    const urlSearchParamsTransformer = new URLSearchParamsTransformer();
    const textEncoderTransformer = new TextEncoderTransformer();
    const textDecoderTransformer = new TextDecoderTransformer();
    
    this.transformers.set('url', urlTransformer);
    this.transformers.set('urlsearchparams', urlSearchParamsTransformer);
    this.transformers.set('textencoder', textEncoderTransformer);
    this.transformers.set('textdecoder', textDecoderTransformer);
  }

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

    // Check if class has custom instance creation (from @Quick() decorator)
    const createQuickInstance = (modelClass as any).__createQuickInstance;
    const instance = createQuickInstance 
      ? createQuickInstance(data)
      : Object.create(modelClass.prototype);
    
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
    // Get list of properties decorated with @QType()
    const decoratedFields = Reflect.getMetadata(QTYPES_METADATA_KEY, instance) || 
                            Reflect.getMetadata(QTYPES_METADATA_KEY, Object.getPrototypeOf(instance)) || 
                            [];
    
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        instance[key] = value;
        continue;
      }

      // If property is NOT decorated with @QType(), copy as-is
      if (!decoratedFields.includes(key)) {
        instance[key] = value;
        continue;
      }

      // Property IS decorated with @QType() → transform it
      const context: IQTransformContext = {
        propertyKey: key,
        className: modelClass.name,
      };

      // 1. Check for custom transformer function from @Quick()
      const customTransformer = Reflect.getMetadata('customTransformer', instance, key);
      if (customTransformer && typeof customTransformer === 'function') {
        instance[key] = customTransformer(value);
        continue;
      }

      // 2. Check for custom transformer via fieldType metadata
      const fieldType = Reflect.getMetadata('fieldType', instance, key);
      
      if (fieldType) {
        const transformer = this.transformers.get(fieldType);
        if (transformer) {
          instance[key] = transformer.deserialize(value, context.propertyKey, context.className);
          continue;
        }
      }

      // 3. Check for array of models or nested model
      const arrayElementClass = Reflect.getMetadata('arrayElementClass', instance, key);
      if (arrayElementClass) {
        const designType = Reflect.getMetadata('design:type', instance, key);
        
        // Check if arrayElementClass is actually Set or Map (special collection types)
        if (arrayElementClass === Set) {
          const setTransformer = this.transformers.get('set');
          if (setTransformer) {
            instance[key] = setTransformer.deserialize(value, context.propertyKey, context.className);
            continue;
          }
        }
        
        if (arrayElementClass === Map) {
          const mapTransformer = this.transformers.get('map');
          if (mapTransformer) {
            instance[key] = mapTransformer.deserialize(value, context.propertyKey, context.className);
            continue;
          }
        }
        
        // If design:type is Array, it's an array of models OR transformable types
        if (designType === Array) {
          if (!Array.isArray(value)) {
            throw new Error(`${context.className}.${key}: Expected array, got ${typeof value}`);
          }
          
          // Check if arrayElementClass is a primitive/transformable type (Date, BigInt, etc.)
          const isPrimitiveOrTransformable = [Date, BigInt, Number, String, Boolean].includes(arrayElementClass);
          
          if (isPrimitiveOrTransformable) {
            // Transform each element using transformByDesignType
            instance[key] = value.map((item) => {
              if (item === null || item === undefined) return item;
              return this.transformByDesignType(item, arrayElementClass, context);
            });
          } else {
            // It's an array of complex objects - deserialize recursively
            const validItems = value.filter((item) => item !== null && item !== undefined);
            instance[key] = validItems.map((item) => {
              if (typeof item !== 'object') {
                throw new Error(`${context.className}.${key}[]: Expected object, got ${typeof item}`);
              }
              return this.deserialize(item, arrayElementClass);
            });
          }
          continue;
        }
        
        // If not Array, it's an individual nested model
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          instance[key] = this.deserialize(value as Record<string, unknown>, arrayElementClass);
          continue;
        }
      }

      // 4. Auto-detection via design:type
      const designType = Reflect.getMetadata('design:type', instance, key);
      
      // 5. If property has @QType() decorator but no type metadata (declare without arg),
      // try to detect type from value
      const fields = Reflect.getMetadata(QTYPES_METADATA_KEY, instance) || 
                     Reflect.getMetadata(QTYPES_METADATA_KEY, Object.getPrototypeOf(instance)) || 
                     [];
      const isDecoratedWithQType = fields.includes(key);
      
      if (isDecoratedWithQType && !designType && !fieldType && value !== null && value !== undefined) {
        // Smart detection for @QType() without arguments on declare properties
        
        // Automatic type detection removed - programmer must explicitly declare transformations
        // using @Quick({ fieldName: Date }) or @QType() decorators
      }
      
      // 5. Fallback: No automatic type detection
      // Programmer must explicitly declare transformations
      
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
   * Deserializes an array without explicit type information.
   * 
   * @param value - The array to deserialize
   * @param context - Transformation context (property name, class name)
   * @returns Original array without transformation
   * 
   * @remarks
   * Without explicit @QType(ModelClass) or typeMap, arrays are returned as-is.
   * This prevents ambiguous type inference and requires explicit type specification.
   * 
   * For transforming arrays, use:
   * - @QType(ModelClass) for single type arrays
   * - @Quick({ items: ModelClass }) for typeMap specification
   * - Custom transformer functions for heterogeneous arrays
   */
  private deserializeArrayWithInference(value: unknown[], context: IQTransformContext): unknown[] {
    // Without explicit type information, return array as-is
    // This prevents ambiguous type inference
    return value;
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
        return this.transformers.get('date');
      }
    }

    // Check for Map/Set/RegExp/Symbol/BigInt/Error/Buffer serialized with __type marker
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      // Maneja tanto mayúsculas (Map, Set) como minúsculas (bigint, symbol, regexp)
      const typeValue = obj.__type;
      if (typeValue === 'Map') {
        return this.transformers.get('map');
      }
      if (typeValue === 'Set') {
        return this.transformers.get('set');
      }
      if (typeValue === 'regexp') {
        return this.transformers.get('regexp');
      }
      if (typeValue === 'symbol') {
        return this.transformers.get('symbol');
      }
      if (typeValue === 'bigint') {
        return this.transformers.get('bigint');
      }
      if (typeValue === 'Error') {
        return this.transformers.get('error');
      }
      if (typeValue === 'Buffer') {
        return this.transformers.get('buffer');
      }
      // Check for typed arrays
      if (typeValue && typeof typeValue === 'string' && typeValue.endsWith('Array')) {
        return this.transformers.get(typeValue.toLowerCase());
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
    // Check for __type marker FIRST (highest priority)
    // This allows roundtrip: Model → serialize() → Model
    const detectedTransformer = this.detectTransformerFromValue(value);
    if (detectedTransformer) {
      return detectedTransformer.deserialize(value, context.propertyKey, context.className);
    }
    
    // Si no hay designType (usando declare), return value as-is
    if (!designType) {
      return value;
    }

    // Date
    if (designType === Date) {
      const transformer = this.transformers.get('date');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
        return new Date(value);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Date value`);
    }

    // BigInt (auto-detected via TypeScript metadata)
    if (designType === BigInt) {
      const transformer = this.transformers.get('bigint');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
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
      const transformer = this.transformers.get('symbol');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
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
      const transformer = this.transformers.get('map');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return new Map(Object.entries(value));
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Map value`);
    }

    // Set
    if (designType === Set) {
      const transformer = this.transformers.get('set');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      if (Array.isArray(value)) {
        return new Set(value);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Set value`);
    }

    // RegExp (auto-detected via TypeScript metadata)
    if (designType === RegExp) {
      const transformer = this.transformers.get('regexp');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: RegExp requires transformer`);
    }

    // Error (auto-detected via TypeScript metadata)
    if (designType === Error) {
      const transformer = this.transformers.get('error');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Error requires transformer`);
    }

    // TypedArrays (auto-detected via TypeScript metadata)
    if (designType === Uint8Array) {
      const transformer = this.transformers.get('uint8array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Uint8Array requires transformer`);
    }
    
    if (designType === Uint16Array) {
      const transformer = this.transformers.get('uint16array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Uint16Array requires transformer`);
    }
    
    if (designType === Uint32Array) {
      const transformer = this.transformers.get('uint32array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Uint32Array requires transformer`);
    }
    
    if (designType === Int8Array) {
      const transformer = this.transformers.get('int8array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Int8Array requires transformer`);
    }
    
    if (designType === Int16Array) {
      const transformer = this.transformers.get('int16array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Int16Array requires transformer`);
    }
    
    if (designType === Int32Array) {
      const transformer = this.transformers.get('int32array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Int32Array requires transformer`);
    }
    
    if (designType === Float32Array) {
      const transformer = this.transformers.get('float32array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Float32Array requires transformer`);
    }
    
    if (designType === Float64Array) {
      const transformer = this.transformers.get('float64array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Float64Array requires transformer`);
    }
    
    if (designType === BigInt64Array) {
      const transformer = this.transformers.get('bigint64array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: BigInt64Array requires transformer`);
    }
    
    if (designType === BigUint64Array) {
      const transformer = this.transformers.get('biguint64array');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: BigUint64Array requires transformer`);
    }

    // ArrayBuffer (auto-detected via TypeScript metadata)
    if (designType === ArrayBuffer) {
      const transformer = this.transformers.get('arraybuffer');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
      }
      throw new Error(`${context.className}.${context.propertyKey}: ArrayBuffer requires transformer`);
    }

    // DataView (auto-detected via TypeScript metadata)
    if (designType === DataView) {
      const transformer = this.transformers.get('dataview');
      if (transformer) {
        return transformer.deserialize(value, context.propertyKey, context.className);
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
   * Allows both primitives and wrapper objects to preserve original format.
   * 
   * @param value - The value to validate
   * @param designType - The expected type constructor
   * @param context - Transformation context (for error messages)
   * @throws {Error} If value doesn't match expected primitive type
   */
  private validatePrimitive(value: unknown, designType: Function | undefined, context: IQTransformContext): void {
    if (designType === String && typeof value !== 'string' && !(value instanceof String)) {
      throw new Error(
        `${context.className}.${context.propertyKey}: Expected string or String wrapper, got ${typeof value}`,
      );
    }
    if (designType === Number && typeof value !== 'number' && !(value instanceof Number)) {
      throw new Error(
        `${context.className}.${context.propertyKey}: Expected number or Number wrapper, got ${typeof value}`,
      );
    }
    if (designType === Boolean && typeof value !== 'boolean' && !(value instanceof Boolean)) {
      throw new Error(
        `${context.className}.${context.propertyKey}: Expected boolean or Boolean wrapper, got ${typeof value}`,
      );
    }
  }
}

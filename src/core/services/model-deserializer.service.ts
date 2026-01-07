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
 * - **Dependency Inversion**: Depends on ITransformerRegistry abstraction
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
 * const deserializer = new ModelDeserializer(transformerRegistry);
 * 
 * class User extends QuickModel<IUser> {
 *   @Field() name!: string;
 *   @Field('date') birthDate!: Date;
 *   @Field() tags!: Set<string>;
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
import { IDeserializer, ITransformContext, ITransformerRegistry } from '../interfaces';

export class ModelDeserializer<
  TInterface extends Record<string, unknown> = Record<string, unknown>,
  TModel = any
> implements IDeserializer<TInterface, TModel> {
  /**
   * Creates a model deserializer.
   * 
   * @param transformerRegistry - Registry containing type transformers
   */
  constructor(private readonly transformerRegistry: ITransformerRegistry) {}

  /**
   * Deserializes plain data into a model instance.
   * 
   * @template T - The specific interface type
   * @param data - Plain object to deserialize
   * @param modelClass - Model class constructor
   * @returns Fully-typed model instance
   * 
   * @remarks
   * If data is already an instance of the model class, returns it unchanged.
   * Otherwise, creates a new instance and populates it field by field.
   */
  deserialize<T extends TInterface>(data: T, modelClass: new (data: T) => TModel): TModel {
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

      const context: ITransformContext = {
        propertyKey: key,
        className: modelClass.name,
      };

      // 1. Check for custom transformer via fieldType metadata
      const fieldType = Reflect.getMetadata('fieldType', instance, key);
      if (fieldType) {
        const transformer = this.transformerRegistry.get(fieldType);
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
          instance[key] = this.deserialize(value, arrayElementClass);
          continue;
        }
      }

      // 3. Auto-detection via design:type
      const designType = Reflect.getMetadata('design:type', instance, key);
      instance[key] = this.transformByDesignType(value, designType, context);
    }
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
   * - Map: from object
   * - Set: from array
   * - Nested models: recursive deserialization
   * - Primitives: with type validation
   */
  private transformByDesignType(value: unknown, designType: Function | undefined, context: ITransformContext): unknown {
    if (!designType) {
      return value;
    }

    // Date
    if (designType === Date) {
      const transformer = this.transformerRegistry.get('date');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
        return new Date(value);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Date value`);
    }

    // Map
    if (designType === Map) {
      const transformer = this.transformerRegistry.get('map');
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
      const transformer = this.transformerRegistry.get('set');
      if (transformer) {
        return transformer.fromInterface(value, context.propertyKey, context.className);
      }
      if (Array.isArray(value)) {
        return new Set(value);
      }
      throw new Error(`${context.className}.${context.propertyKey}: Invalid Set value`);
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
      type ModelConstructor = new (data: typeof value) => TModel;
      return this.deserialize(value, designType as ModelConstructor);
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
  private validatePrimitive(value: unknown, designType: Function | undefined, context: ITransformContext): void {
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

/**
 * SOLID - Single Responsibility: Solo se encarga de deserializar datos
 * SOLID - Dependency Inversion: Depende de ITransformerRegistry (abstracción)
 */

import 'reflect-metadata';
import { IDeserializer, ITransformContext, ITransformerRegistry } from '../interfaces';

export class ModelDeserializer<
  TInterface extends Record<string, unknown> = Record<string, unknown>,
  TModel = any
> implements IDeserializer<TInterface, TModel> {
  constructor(private readonly transformerRegistry: ITransformerRegistry) {}

  deserialize<T extends TInterface>(data: T, modelClass: new (data: T) => TModel): TModel {
    // Si el data ya es una instancia del modelo, devolverla directamente
    if (data instanceof modelClass) {
      return data;
    }

    const instance = Object.create(modelClass.prototype);
    this.populateInstance(instance, data, modelClass);
    return instance;
  }

  deserializeFromJson(json: string, modelClass: new (data: any) => TModel): TModel {
    const data = JSON.parse(json);
    return this.deserialize(data, modelClass);
  }

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

      // 1. Verificar si hay un transformer personalizado registrado
      const fieldType = Reflect.getMetadata('fieldType', instance, key);
      if (fieldType) {
        const transformer = this.transformerRegistry.get(fieldType);
        if (transformer) {
          instance[key] = transformer.fromInterface(value, context.propertyKey, context.className);
          continue;
        }
      }

      // 2. Verificar si es un array de modelos o modelo anidado individual
      const arrayElementClass = Reflect.getMetadata('arrayElementClass', instance, key);
      if (arrayElementClass) {
        const designType = Reflect.getMetadata('design:type', instance, key);
        
        // Si el design:type es Array, es un array de modelos
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
        
        // Si no es Array, es un modelo anidado individual
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          instance[key] = this.deserialize(value, arrayElementClass);
          continue;
        }
      }

      // 3. Auto-detección via design:type
      const designType = Reflect.getMetadata('design:type', instance, key);
      instance[key] = this.transformByDesignType(value, designType, context);
    }
  }

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

    // Modelo anidado
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

    // Validación de primitivos
    this.validatePrimitive(value, designType, context);

    return value;
  }

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

/**
 * SOLID - Single Responsibility: Solo se encarga de deserializar datos
 * SOLID - Dependency Inversion: Depende de ITransformerRegistry (abstracción)
 */

import 'reflect-metadata';
import { IDeserializer, ITransformContext, ITransformerRegistry } from '../interfaces';

export class ModelDeserializer<TInterface = any, TModel = any> implements IDeserializer<
  TInterface,
  TModel
> {
  constructor(private readonly transformerRegistry: ITransformerRegistry) {}

  deserialize(data: TInterface, modelClass: new (data: TInterface) => TModel): TModel {
    // Si el data ya es una instancia del modelo, devolverla directamente
    if (data instanceof modelClass) {
      return data;
    }

    const instance = Object.create(modelClass.prototype);
    this.populateInstance(instance, data, modelClass);
    return instance as TModel;
  }

  deserializeFromJson(json: string, modelClass: new (data: any) => TModel): TModel {
    const data = JSON.parse(json);
    return this.deserialize(data, modelClass);
  }

  private populateInstance(instance: any, data: any, modelClass: Function): void {
    for (const [key, value] of Object.entries(data as any)) {
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

      // 2. Verificar si es un array de modelos
      const arrayElementClass = Reflect.getMetadata('arrayElementClass', instance, key);
      if (arrayElementClass) {
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

      // 3. Auto-detección via design:type
      const designType = Reflect.getMetadata('design:type', instance, key);
      instance[key] = this.transformByDesignType(value, designType, context);
    }
  }

  private transformByDesignType(value: any, designType: any, context: ITransformContext): any {
    if (!designType) {
      return value;
    }

    // Date
    if (designType === Date) {
      const transformer = this.transformerRegistry.get('date');
      return transformer
        ? transformer.fromInterface(value, context.propertyKey, context.className)
        : new Date(value);
    }

    // Map
    if (designType === Map) {
      const transformer = this.transformerRegistry.get('map');
      return transformer
        ? transformer.fromInterface(value, context.propertyKey, context.className)
        : new Map(Object.entries(value));
    }

    // Set
    if (designType === Set) {
      const transformer = this.transformerRegistry.get('set');
      return transformer
        ? transformer.fromInterface(value, context.propertyKey, context.className)
        : new Set(value);
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
      return this.deserialize(value, designType);
    }

    // Validación de primitivos
    this.validatePrimitive(value, designType, context);

    return value;
  }

  private validatePrimitive(value: any, designType: any, context: ITransformContext): void {
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

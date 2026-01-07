/**
 * SOLID - QuickModel refactorizado siguiendo principios SOLID
 *
 * S - Single Responsibility: QuickModel solo orquesta, delega a servicios específicos
 * O - Open/Closed: Abierto a extensión (nuevos transformers), cerrado a modificación
 * L - Liskov Substitution: Todos los transformers son intercambiables
 * I - Interface Segregation: Interfaces específicas (ISerializer, IDeserializer, etc.)
 * D - Dependency Inversion: Depende de abstracciones (ITransformerRegistry), no de implementaciones
 */

import 'reflect-metadata';
import { transformerRegistry } from './core/registry';
import { ModelDeserializer, ModelSerializer } from './core/services';
import './transformers/bootstrap'; // Auto-registro de transformers

// Exports públicos
export { Field } from './core/decorators';
export * from './core/interfaces'; // Símbolos de campo (BigIntField, etc.)
export type { QuickType } from './core/interfaces';
export abstract class QuickModel<
  TInterface,
  _TTransforms extends Partial<Record<keyof TInterface, any>> = {},
> {
  // SOLID - Dependency Inversion: Servicios inyectados como dependencias
  private static readonly deserializer = new ModelDeserializer(transformerRegistry);
  private static readonly serializer = new ModelSerializer(transformerRegistry);

  constructor(data: TInterface | any) {
    Object.defineProperty(this, '__tempData', {
      value: data,
      writable: false,
      enumerable: false,
      configurable: true,
    });

    // Auto-inicializar (antes lo hacía el decorador @Model)
    this.initialize();
  }

  /**
   * SOLID - Single Responsibility: Solo inicializa, delega deserialización
   */
  protected initialize(): void {
    const data = (this as any).__tempData;
    if (!data) return;

    if (data.constructor === this.constructor) {
      Object.assign(this, data);
      return;
    }

    const deserialized = QuickModel.deserializer.deserialize(data, this.constructor as any);
    Object.assign(this, deserialized);
    delete (this as any).__tempData;
  }

  /**
   * SOLID - Single Responsibility: Delega serialización a ModelSerializer
   */
  toInterface(): TInterface {
    return QuickModel.serializer.serialize(this) as TInterface;
  }

  /**
   * Serializa a JSON string
   */
  toJSON(): string {
    return QuickModel.serializer.serializeToJson(this);
  }

  /**
   * SOLID - Open/Closed: Permite crear instancias desde interfaces
   */
  static fromInterface<T>(this: new (data: any) => T, data: any): T {
    return QuickModel.deserializer.deserialize(data, this);
  }

  /**
   * Crea instancia desde JSON string
   */
  static fromJSON<T>(this: new (data: any) => T, json: string): T {
    return QuickModel.deserializer.deserializeFromJson(json, this);
  }
}

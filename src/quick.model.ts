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
import type { SerializedInterface, ModelData } from './core/interfaces/serialization-types.interface';

// Exports públicos
export { Field } from './core/decorators';
export * from './core/interfaces'; // Símbolos de campo (BigIntField, etc.)
export type { QuickType } from './core/interfaces';
export abstract class QuickModel<
  TInterface,
  _TTransforms extends Partial<Record<keyof TInterface, unknown>> = {},
> {
  // SOLID - Dependency Inversion: Servicios inyectados como dependencias
  private static readonly deserializer = new ModelDeserializer(transformerRegistry);
  private static readonly serializer = new ModelSerializer(transformerRegistry);

  // Propiedad temporal para datos no procesados (se elimina después de initialize)
  private readonly __tempData?: ModelData<TInterface>;

  constructor(data: ModelData<TInterface>) {
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
    const data = this.__tempData;
    if (!data) return;

    if (data.constructor === this.constructor) {
      Object.assign(this, data);
      return;
    }

    const deserialized = QuickModel.deserializer.deserialize(
      data as TInterface,
      this.constructor as new (data: TInterface) => this
    );
    Object.assign(this, deserialized);
    // Eliminar propiedad temporal usando unknown para evitar error de tipo
    delete (this as unknown as Record<string, unknown>).__tempData;
  }

  /**
   * SOLID - Single Responsibility: Delega serialización a ModelSerializer
   * 
   * @returns La versión serializada de la instancia (tipos complejos convertidos a primitivos/objetos planos)
   */
  toInterface(): SerializedInterface<TInterface> {
    return QuickModel.serializer.serialize(this) as SerializedInterface<TInterface>;
  }

  /**
   * Serializa a JSON string
   */
  toJSON(): string {
    return QuickModel.serializer.serializeToJson(this);
  }

  /**
   * SOLID - Open/Closed: Permite crear instancias desde interfaces
   * Acepta tanto datos serializados (de toInterface/JSON) como objetos originales
   */
  static fromInterface<T extends QuickModel<any>>(
    this: new (data: ModelData<any>) => T,
    data: ModelData<any>
  ): T {
    return QuickModel.deserializer.deserialize(data, this);
  }

  /**
   * Crea instancia desde JSON string
   */
  static fromJSON<T extends QuickModel<any>>(this: new (data: ModelData<any>) => T, json: string): T {
    return QuickModel.deserializer.deserializeFromJson(json, this);
  }
}

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
import { ModelDeserializer, ModelSerializer, MockGenerator, type MockType } from './core/services';
import './transformers/bootstrap'; // Auto-registro de transformers
import type { SerializedInterface, ModelData } from './core/interfaces/serialization-types.interface';

// Exports públicos
export { Field } from './core/decorators';
export * from './core/interfaces'; // Símbolos de campo (BigIntField, etc.)
export type { QuickType } from './core/interfaces';
export type { MockType } from './core/services';

export abstract class QuickModel<
  TInterface,
  _TTransforms extends Partial<Record<keyof TInterface, unknown>> = {},
> {
  // SOLID - Dependency Inversion: Servicios inyectados como dependencias
  private static readonly deserializer = new ModelDeserializer(transformerRegistry);
  private static readonly serializer = new ModelSerializer(transformerRegistry);
  private static readonly mockGenerator = new MockGenerator(transformerRegistry);

  /**
   * Sistema de mocks con tipado estricto
   * @example User.mock.random() // devuelve User
   * @example User.mock.array(5) // devuelve User[]
   */
  static get mock() {
    const ModelClass = this as any;
    return {
      empty: (overrides?: Partial<any>): any => {
        const data = QuickModel.mockGenerator.generate(ModelClass, 'empty', overrides);
        return new ModelClass(data);
      },
      random: (overrides?: Partial<any>): any => {
        const data = QuickModel.mockGenerator.generate(ModelClass, 'random', overrides);
        return new ModelClass(data);
      },
      sample: (overrides?: Partial<any>): any => {
        const data = QuickModel.mockGenerator.generate(ModelClass, 'sample', overrides);
        return new ModelClass(data);
      },
      minimal: (overrides?: Partial<any>): any => {
        const data = QuickModel.mockGenerator.generate(ModelClass, 'minimal', overrides);
        return new ModelClass(data);
      },
      full: (overrides?: Partial<any>): any => {
        const data = QuickModel.mockGenerator.generate(ModelClass, 'full', overrides);
        return new ModelClass(data);
      },
      interfaceEmpty: (overrides?: Partial<any>): any => {
        return QuickModel.mockGenerator.generate(ModelClass, 'empty', overrides);
      },
      interfaceRandom: (overrides?: Partial<any>): any => {
        return QuickModel.mockGenerator.generate(ModelClass, 'random', overrides);
      },
      interfaceSample: (overrides?: Partial<any>): any => {
        return QuickModel.mockGenerator.generate(ModelClass, 'sample', overrides);
      },
      interfaceMinimal: (overrides?: Partial<any>): any => {
        return QuickModel.mockGenerator.generate(ModelClass, 'minimal', overrides);
      },
      interfaceFull: (overrides?: Partial<any>): any => {
        return QuickModel.mockGenerator.generate(ModelClass, 'full', overrides);
      },
      array: (
        count: number,
        type: MockType = 'random',
        overrides?: (index: number) => Partial<any>
      ): any[] => {
        if (count < 0) {
          throw new Error(`Count must be non-negative, got ${count}`);
        }
        if (count === 0) {
          return [];
        }
        const dataArray = QuickModel.mockGenerator.generateArray(ModelClass, count, type, overrides);
        return dataArray.map((data: any) => new ModelClass(data));
      },
      interfaceArray: (
        count: number,
        type: MockType = 'random',
        overrides?: (index: number) => Partial<any>
      ): any[] => {
        if (count < 0) {
          throw new Error(`Count must be non-negative, got ${count}`);
        }
        if (count === 0) {
          return [];
        }
        return QuickModel.mockGenerator.generateArray(ModelClass, count, type, overrides);
      },
    };
  }

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

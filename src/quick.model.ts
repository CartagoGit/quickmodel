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
import {
	ModelDeserializer,
	ModelSerializer,
	MockGenerator,
	type MockType,
} from './core/services';
import './transformers/bootstrap'; // Auto-registro de transformers
import type {
	SerializedInterface,
	ModelData,
} from './core/interfaces/serialization-types.interface';

// Exports públicos
export { Field } from './core/decorators';
export * from './core/interfaces'; // Símbolos de campo (BigIntField, etc.)
export type { QuickType } from './core/interfaces';
export type { MockType } from './core/services';

/**
 * Helper types para extraer tipos de una clase QuickModel
 */
export type QuickModelInstance<T> = T extends abstract new (
	...args: any[]
) => infer R
	? R
	: never;
export type QuickModelInterface<T> = QuickModelInstance<T> extends QuickModel<
	infer I,
	any
>
	? I
	: never;

/**
 * Constructor de mocks con tipado estricto.
 * Cada instancia está especializada para una clase específica.
 */
export class MockBuilder<TInstance, TInterface> {
	constructor(
		private readonly modelClass: new (data: TInterface) => TInstance,
		private readonly mockGenerator: MockGenerator
	) {}

	empty(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(this.modelClass, 'empty', overrides);
		return new this.modelClass(data);
	}

	random(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(this.modelClass, 'random', overrides);
		return new this.modelClass(data);
	}

	sample(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(this.modelClass, 'sample', overrides);
		return new this.modelClass(data);
	}

	minimal(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(this.modelClass, 'minimal', overrides);
		return new this.modelClass(data);
	}

	full(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(this.modelClass, 'full', overrides);
		return new this.modelClass(data);
	}

	interfaceEmpty(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'empty', overrides);
	}

	interfaceRandom(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'random', overrides);
	}

	interfaceSample(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'sample', overrides);
	}

	interfaceMinimal(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'minimal', overrides);
	}

	interfaceFull(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'full', overrides);
	}

	array(
		count: number,
		type: MockType = 'random',
		overrides?: (index: number) => Partial<TInterface>
	): TInstance[] {
		if (count < 0) {
			throw new Error(`Count must be non-negative, got ${count}`);
		}
		if (count === 0) {
			return [];
		}
		const dataArray = this.mockGenerator.generateArray(
			this.modelClass,
			count,
			type,
			overrides
		);
		return dataArray.map((data) => new this.modelClass(data));
	}

	interfaceArray(
		count: number,
		type: MockType = 'random',
		overrides?: (index: number) => Partial<TInterface>
	): TInterface[] {
		if (count < 0) {
			throw new Error(`Count must be non-negative, got ${count}`);
		}
		if (count === 0) {
			return [];
		}
		return this.mockGenerator.generateArray(
			this.modelClass,
			count,
			type,
			overrides
		);
	}
}

/**
 * Tipo para el objeto mock generado por el getter (deprecated, usar MockBuilder)
 */
export type MockAPI<TInstance, TInterface> = {
	empty: (overrides?: Partial<TInterface>) => TInstance;
	random: (overrides?: Partial<TInterface>) => TInstance;
	sample: (overrides?: Partial<TInterface>) => TInstance;
	minimal: (overrides?: Partial<TInterface>) => TInstance;
	full: (overrides?: Partial<TInterface>) => TInstance;
	interfaceEmpty: (overrides?: Partial<TInterface>) => TInterface;
	interfaceRandom: (overrides?: Partial<TInterface>) => TInterface;
	interfaceSample: (overrides?: Partial<TInterface>) => TInterface;
	interfaceMinimal: (overrides?: Partial<TInterface>) => TInterface;
	interfaceFull: (overrides?: Partial<TInterface>) => TInterface;
	array: (
		count: number,
		type?: MockType,
		overrides?: (index: number) => Partial<TInterface>
	) => TInstance[];
	interfaceArray: (
		count: number,
		type?: MockType,
		overrides?: (index: number) => Partial<TInterface>
	) => TInterface[];
};

export abstract class QuickModel<
	TInterface,
	_TTransforms extends Partial<Record<keyof TInterface, unknown>> = {}
> {
	// SOLID - Dependency Inversion: Servicios inyectados como dependencias
	private static readonly deserializer = new ModelDeserializer(
		transformerRegistry
	);
	private static readonly serializer = new ModelSerializer(
		transformerRegistry
	);
	private static readonly mockGenerator = new MockGenerator(
		transformerRegistry
	);

	// /**
	//  * Sistema de mocks con tipado estricto.
	//  * Cada clase hija infiere automáticamente sus tipos.
	//  * @example User.mock().random() // devuelve User
	//  * @example User.mock().array(5) // devuelve User[]
	//  */
	// static mock(): MockBuilder<
	// 	QuickModelInstance<typeof this>,
	// 	QuickModelInterface<typeof this>
	// > {
	// 	type ThisClass = typeof this;
	// 	type InstanceType = ThisClass extends abstract new (
	// 		...args: any[]
	// 	) => infer R
	// 		? R
	// 		: never;
	// 	type InterfaceType = InstanceType extends QuickModel<infer I>
	// 		? I
	// 		: never;

	// 	// @ts-expect-error - TypeScript no permite instanciar clases abstractas, pero en runtime `this` es la clase concreta
	// 	const ModelClass: new (data: InterfaceType) => InstanceType = this;

	// 	return new MockBuilder(ModelClass, QuickModel.mockGenerator);
	// }

  static mock<T extends abstract new (...args: any[]) => QuickModel<any, any>>(
    this: T
  ): MockAPI<QuickModelInstance<T>, QuickModelInterface<T>> {
    type ThisClass = T;
    type InstanceType = ThisClass extends abstract new (
      ...args: any[]
    ) => infer R
      ? R
      : never;
    type InterfaceType = InstanceType extends QuickModel<infer I>
      ? I
      : never;

    // @ts-expect-error - TypeScript no permite instanciar clases abstractas, pero en runtime `this` es la clase concreta
    const ModelClass: new (data: InterfaceType) => InstanceType = this;

    const generator = new MockGenerator(transformerRegistry);

    return {
      empty: (overrides?: Partial<InterfaceType>) =>
        new ModelClass(generator.generate(ModelClass, 'empty', overrides)),
      random: (overrides?: Partial<InterfaceType>) =>
        new ModelClass(generator.generate(ModelClass, 'random', overrides)),
      sample: (overrides?: Partial<InterfaceType>) =>
        new ModelClass(generator.generate(ModelClass, 'sample', overrides)),
      minimal: (overrides?: Partial<InterfaceType>) =>
        new ModelClass(generator.generate(ModelClass, 'minimal', overrides)),
      full: (overrides?: Partial<InterfaceType>) =>
        new ModelClass(generator.generate(ModelClass, 'full', overrides)),
      interfaceEmpty: (overrides?: Partial<InterfaceType>) =>
        generator.generate(ModelClass, 'empty', overrides),
      interfaceRandom: (overrides?: Partial<InterfaceType>) =>
        generator.generate(ModelClass, 'random', overrides),
      interfaceSample: (overrides?: Partial<InterfaceType>) =>
        generator.generate(ModelClass, 'sample', overrides),
      interfaceMinimal: (overrides?: Partial<InterfaceType>) =>
        generator.generate(ModelClass, 'minimal', overrides),
      interfaceFull: (overrides?: Partial<InterfaceType>) =>
        generator.generate(ModelClass, 'full', overrides),
      array: (
        count: number,
        type: MockType = 'random',
        overrides?: (index: number) => Partial<InterfaceType>
      ) =>
        Array.from({ length: count }, (_, i) =>
          new ModelClass(
            generator.generate(ModelClass, type, overrides ? overrides(i) : undefined)
          )
        ),
      interfaceArray: (
        count: number,
        type: MockType = 'random',
        overrides?: (index: number) => Partial<InterfaceType>
      ) =>
        Array.from({ length: count }, (_, i) =>
          generator.generate(ModelClass, type, overrides ? overrides(i) : undefined)
        ),
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

		type DataAsInterface = Record<string, unknown>;
		type ThisConstructor = new (data: DataAsInterface) => this;
		const deserialized = QuickModel.deserializer.deserialize(
			data as unknown as DataAsInterface,
			this.constructor as ThisConstructor
		);
		Object.assign(this, deserialized);
		// Eliminar propiedad temporal
		Reflect.deleteProperty(this, '__tempData');
	}

	/**
	 * SOLID - Single Responsibility: Delega serialización a ModelSerializer
	 *
	 * @returns La versión serializada de la instancia (tipos complejos convertidos a primitivos/objetos planos)
	 */
	toInterface(): SerializedInterface<TInterface> {
		type ModelAsRecord = Record<string, unknown>;
		return QuickModel.serializer.serialize(
			this as unknown as ModelAsRecord
		) as SerializedInterface<TInterface>;
	}

	/**
	 * Serializa a JSON string
	 */
	toJSON(): string {
		type ModelAsRecord = Record<string, unknown>;
		return QuickModel.serializer.serializeToJson(
			this as unknown as ModelAsRecord
		);
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
	static fromJSON<T extends QuickModel<any>>(
		this: new (data: ModelData<any>) => T,
		json: string
	): T {
		return QuickModel.deserializer.deserializeFromJson(json, this);
	}
}

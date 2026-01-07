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
	MockBuilder,
	type MockType,
} from './core/services';
import type {
	QuickModelInstance,
	QuickModelInterface,
} from './core/interfaces';
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
export { MockBuilder } from './core/services';

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

	/**
	 * Sistema de mocks con tipado estricto.
	 * Cada clase hija infiere automáticamente sus tipos.
	 * @example User.mock().random() // devuelve User
	 * @example User.mock().array(5) // devuelve User[]
	 */
	static mock<T extends abstract new (...args: any[]) => QuickModel<any, any>>(
		this: T
	): MockBuilder<QuickModelInstance<T>, QuickModelInterface<T>> {
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

		return new MockBuilder(ModelClass, QuickModel.mockGenerator);
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

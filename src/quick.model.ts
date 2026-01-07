/**
 * QuickModel - Type-safe serialization and mock generation for TypeScript models
 * 
 * SOLID Principles Applied:
 * - S (Single Responsibility): QuickModel orchestrates, delegates to specific services
 * - O (Open/Closed): Open for extension (new transformers), closed for modification
 * - L (Liskov Substitution): All transformers are interchangeable
 * - I (Interface Segregation): Specific interfaces (ISerializer, IDeserializer, etc.)
 * - D (Dependency Inversion): Depends on abstractions (ITransformerRegistry), not implementations
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
import './transformers/bootstrap'; // Auto-register transformers
import type {
	SerializedInterface,
	ModelData,
} from './core/interfaces/serialization-types.interface';

// Public exports
export { Field } from './core/decorators';
export * from './core/interfaces'; // Field symbols (BigIntField, etc.)
export type { QuickType } from './core/interfaces';
export type { MockType } from './core/services';
export { MockBuilder } from './core/services';

/**
 * Abstract base class for all models with automatic serialization and type-safe mocking.
 * 
 * @template TInterface - The interface type representing the model's data structure
 * @template _TTransforms - Optional type transforms for special field conversions
 * 
 * @example
 * ```typescript
 * interface IUser {
 *   id: string;
 *   name: string;
 *   createdAt: Date;
 * }
 * 
 * class User extends QuickModel<IUser> {
 *   \@Field() id!: string;
 *   \@Field() name!: string;
 *   \@Field() createdAt!: Date;
 * }
 * 
 * // Create from interface
 * const user = new User({ id: '1', name: 'John', createdAt: new Date() });
 * 
 * // Serialize to plain object
 * const data = user.toInterface(); // { id: '1', name: 'John', createdAt: '2024-01-01T00:00:00.000Z' }
 * 
 * // Generate mocks
 * const mockUser = User.mock().random();
 * const mockUsers = User.mock().array(5);
 * ```
 */
export abstract class QuickModel<
	TInterface,
	_TTransforms extends Partial<Record<keyof TInterface, unknown>> = {}
> {
	// SOLID - Dependency Inversion: Services injected as dependencies
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
	 * Creates a type-safe mock builder for generating test data.
	 * Each derived class automatically infers its correct types.
	 * 
	 * @template T - The model class constructor type
	 * @returns A MockBuilder instance specialized for this model class
	 * 
	 * @example
	 * ```typescript
	 * const user = User.mock().random(); // returns User
	 * const users = User.mock().array(5); // returns User[]
	 * ```
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

		// @ts-expect-error - TypeScript doesn't allow instantiating abstract classes, but at runtime `this` is the concrete class
		const ModelClass: new (data: InterfaceType) => InstanceType = this;

		return new MockBuilder(ModelClass, QuickModel.mockGenerator);
	}

	// Temporary property for unprocessed data (removed after initialize)
	private readonly __tempData?: ModelData<TInterface>;

	/**
	 * Constructs a new model instance from interface data or another instance.
	 * Automatically deserializes complex types (Date, BigInt, etc.) based on @Field decorators.
	 * 
	 * @param data - Either a plain interface object or another model instance
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({
	 *   id: '1',
	 *   name: 'John',
	 *   createdAt: new Date() // or '2024-01-01T00:00:00.000Z'
	 * });
	 * ```
	 */
	constructor(data: ModelData<TInterface>) {
		Object.defineProperty(this, '__tempData', {
			value: data,
			writable: false,
			enumerable: false,
			configurable: true,
		});

		// Auto-initialize
		this.initialize();
	}

	/**
	 * Initializes the model instance by deserializing the input data.
	 * 
	 * SOLID - Single Responsibility: Only initializes, delegates deserialization to service.
	 * 
	 * @protected
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
		// Remove temporary property
		Reflect.deleteProperty(this, '__tempData');
	}

	/**
	 * Serializes the model instance to a plain interface object.
	 * Complex types (Date, BigInt, Map, etc.) are converted to JSON-serializable primitives.
	 * 
	 * SOLID - Single Responsibility: Delegates serialization to ModelSerializer.
	 * 
	 * @returns The serialized version of the instance (complex types converted to primitives/plain objects)
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', createdAt: new Date() });
	 * const data = user.toInterface();
	 * // { id: '1', name: 'John', createdAt: '2024-01-01T00:00:00.000Z' }
	 * ```
	 */
	toInterface(): SerializedInterface<TInterface> {
		type ModelAsRecord = Record<string, unknown>;
		return QuickModel.serializer.serialize(
			this as unknown as ModelAsRecord
		) as SerializedInterface<TInterface>;
	}

	/**
	 * Serializes the model instance to a JSON string.
	 * 
	 * @returns A JSON string representation of the model
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', createdAt: new Date() });
	 * const json = user.toJSON();
	 * // '{"id":"1","name":"John","createdAt":"2024-01-01T00:00:00.000Z"}'
	 * ```
	 */
	toJSON(): string {
		type ModelAsRecord = Record<string, unknown>;
		return QuickModel.serializer.serializeToJson(
			this as unknown as ModelAsRecord
		);
	}

	/**
	 * Creates a model instance from an interface object or serialized data.
	 * 
	 * SOLID - Open/Closed: Allows creating instances from interfaces.
	 * Accepts both serialized data (from toInterface/JSON) and original objects.
	 * 
	 * @template T - The model class type
	 * @param data - Interface data (plain object or serialized)
	 * @returns A new model instance
	 * 
	 * @example
	 * ```typescript
	 * const userData = { id: '1', name: 'John', createdAt: '2024-01-01T00:00:00.000Z' };
	 * const user = User.fromInterface(userData);
	 * console.log(user.createdAt instanceof Date); // true
	 * ```
	 */
	static fromInterface<T extends QuickModel<any>>(
		this: new (data: ModelData<any>) => T,
		data: ModelData<any>
	): T {
		return QuickModel.deserializer.deserialize(data, this);
	}

	/**
	 * Creates a model instance from a JSON string.
	 * 
	 * @template T - The model class type
	 * @param json - JSON string representation of the model
	 * @returns A new model instance
	 * 
	 * @example
	 * ```typescript
	 * const json = '{"id":"1","name":"John","createdAt":"2024-01-01T00:00:00.000Z"}';
	 * const user = User.fromJSON(json);
	 * console.log(user instanceof User); // true
	 * ```
	 */
	static fromJSON<T extends QuickModel<any>>(
		this: new (data: ModelData<any>) => T,
		json: string
	): T {
		return QuickModel.deserializer.deserializeFromJson(json, this);
	}
}

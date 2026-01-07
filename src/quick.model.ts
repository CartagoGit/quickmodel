/**
 * QModel - Type-safe serialization and mock generation for TypeScript models
 * 
 * SOLID Principles Applied:
 * - S (Single Responsibility): QModel orchestrates, delegates to specific services
 * - O (Open/Closed): Open for extension (new transformers), closed for modification
 * - L (Liskov Substitution): All transformers are interchangeable
 * - I (Interface Segregation): Specific interfaces (ISerializer, IDeserializer, etc.)
 * - D (Dependency Inversion): Depends on abstractions (IQTransformerRegistry), not implementations
 */

import 'reflect-metadata';
import { qTransformerRegistry } from './core/registry';
import {
	ModelDeserializer,
	ModelSerializer,
	MockGenerator,
	MockBuilder
} from './core/services';
import type {
	QModelInstance,
	QModelInterface,
	QInterface,
} from './core/interfaces';
import './transformers/bootstrap'; // Auto-register transformers
import type {
	SerializedInterface,
	ModelData,
} from './core/interfaces/serialization-types.interface';


// Public exports
export { QType, Quick } from './core/decorators';
export * from './core/interfaces'; // Q-prefixed symbols (QBigInt, QRegExp, etc.)
export type { QInterface } from './core/interfaces';
export type { MockType as QMockType } from './core/services';
export { MockBuilder as QMockBuilder } from './core/services';

/**
 * Helper type that merges TInterface with TTransforms.
 * Properties in TTransforms override their corresponding types in TInterface.
 */
type TransformedInterface<
	TInterface,
	TTransforms extends Partial<Record<keyof TInterface, unknown>>
> = {
	[K in keyof TInterface]: K extends keyof TTransforms
		? TTransforms[K]
		: TInterface[K];
};

/**
 * Abstract base class for type-safe models with automatic serialization and mock generation.
 * 
 * **Note about `implements`:** TypeScript does not allow abstract classes to implement 
 * generic interfaces with dynamic types. Therefore, concrete classes extending QModel 
 * should add `implements QInterface<IYourInterface, YourTransforms>` explicitly to 
 * enforce type safety.
 * 
 * QModel is the core class providing a declarative way to define TypeScript models 
 * with automatic JSON serialization/deserialization and type transformations.
 * 
 * **SOLID Principles Applied:**
 * - **S** (Single Responsibility): QModel orchestrates operations, delegates to specialized services
 * - **O** (Open/Closed): Open for extension via transformers, closed for modification
 * - **L** (Liskov Substitution): All transformers are interchangeable
 * - **I** (Interface Segregation): Specific interfaces (ISerializer, IDeserializer, etc.)
 * - **D** (Dependency Inversion): Depends on abstractions (IQTransformerRegistry), not implementations
 * 
 * @template TInterface - The interface type representing the model's JSON structure
 * @template TTransforms - Optional type transforms for special field conversions (Date, BigInt, etc.)
 * 
 * @example
 * Basic model with primitives
 * ```typescript
 * interface IUser {
 *   id: string;
 *   name: string;
 *   age: number;
 * }
 * 
 * class User extends QModel<IUser> implements QInterface<IUser> {
 *   @QType() id!: string;
 *   @QType() name!: string;
 *   @QType() age!: number;
 * }
 * 
 * const user = new User({ id: '1', name: 'John', age: 30 });
 * const json = user.toJSON(); // Serialized string
 * const user2 = User.fromJSON(json); // Deserialized instance
 * ```
 * 
 * @example
 * Model with type transformations
 * ```typescript
 * interface IAccount {
 *   id: string;
 *   balance: string;      // JSON: string
 *   createdAt: string;    // JSON: ISO date string
 * }
 * 
 * type AccountTransforms = {
 *   balance: bigint;      // Memory: bigint
 *   createdAt: Date;      // Memory: Date object
 * };
 * 
 * class Account extends QModel<IAccount, AccountTransforms>
 *   implements QInterface<IAccount, AccountTransforms> {
 *   @QType() id!: string;
 *   @QType() balance!: bigint;
 *   @QType() createdAt!: Date;
 * }
 * ```
 * 
 * @example
 * Using mock generation
 * ```typescript
 * // Generate single mock
 * const mockUser = User.mock().random();
 * 
 * // Generate array of mocks
 * const mockUsers = User.mock().array(10);
 * 
 * // Custom mock builder
 * const customMock = User.mock()
 *   .with('name', 'Alice')
 *   .with('age', 25)
 *   .build();
 * ```
 */
export abstract class QModel<
	TInterface extends Record<string, any>,
	TTransforms extends Partial<Record<keyof TInterface, unknown>> = {}
> {
	// SOLID - Dependency Inversion: Services injected as dependencies
	private static readonly deserializer = new ModelDeserializer(
		qTransformerRegistry
	);
	private static readonly serializer = new ModelSerializer(
		qTransformerRegistry
	);
	private static readonly mockGenerator = new MockGenerator(
		qTransformerRegistry
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
	static mock<T extends abstract new (...args: any[]) => QModel<any, any>>(
		this: T
	): MockBuilder<QModelInstance<T>, QModelInterface<T>> {
		type ThisClass = T;
		type InstanceType = ThisClass extends abstract new (
			...args: any[]
		) => infer R
			? R
			: never;
		type InterfaceType = InstanceType extends QModel<infer I>
			? I
			: never;

		// @ts-expect-error - TypeScript doesn't allow instantiating abstract classes, but at runtime `this` is the concrete class
		const ModelClass: new (data: InterfaceType) => InstanceType = this;

		return new MockBuilder(ModelClass, QModel.mockGenerator);
	}

	// Temporary property for unprocessed data (removed after initialize)
	private readonly __tempData?: ModelData<TInterface>;

	/**
	 * Constructs a new model instance from interface data or another instance.
	 * Automatically deserializes complex types (Date, BigInt, etc.) based on @QType decorators.
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

		// Auto-register was already done in constructor, just deserialize
		type DataAsInterface = Record<string, unknown>;
		type ThisConstructor = new (data: DataAsInterface) => this;
		const deserialized = QModel.deserializer.deserialize(
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
		return QModel.serializer.serialize(
			this as unknown as ModelAsRecord
		) as SerializedInterface<TInterface>;
	}

	/**
	 * Serializes the model instance to a JSON string.
	 * 
	 * Converts the model to a JSON string representation. This is a convenience method
	 * that combines toInterface() and JSON.stringify().
	 * 
	 * **SOLID - Single Responsibility:** Delegates to ModelSerializer service.
	 * 
	 * @returns JSON string representation of the model
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
		return QModel.serializer.serializeToJson(
			this as unknown as ModelAsRecord
		);
	}

	/**
	 * Creates a model instance from a plain interface object.
	 * 
	 * Deserializes a plain JavaScript object into a fully typed model instance,
	 * applying all type transformations (string → Date, string → BigInt, etc.)
	 * according to the @QType decorators defined in the model.
	 * 
	 * **SOLID - Open/Closed:** Allows creating instances from interfaces without modification.
	 * 
	 * @template T - The model class type
	 * @param data - Plain object matching the model's interface structure
	 * @returns A new, fully typed model instance
	 * 
	 * @example
	 * Basic deserialization
	 * ```typescript
	 * const userData = { 
	 *   id: '1', 
	 *   name: 'John', 
	 *   createdAt: '2024-01-01T00:00:00.000Z' 
	 * };
	 * 
	 * const user = User.fromInterface(userData);
	 * console.log(user instanceof User); // true
	 * console.log(user.createdAt instanceof Date); // true
	 * ```
	 * 
	 * @example
	 * Deserialization with type transformations
	 * ```typescript
	 * const accountData = {
	 *   id: '123',
	 *   balance: '999999',  // Will transform to bigint
	 *   pattern: { source: 'test', flags: 'gi' } // Will transform to RegExp
	 * };
	 * 
	 * const account = Account.fromInterface(accountData);
	 * console.log(typeof account.balance); // 'bigint'
	 * console.log(account.pattern instanceof RegExp); // true
	 * ```
	 */
	static fromInterface<T extends QModel<any>>(
		this: new (data: ModelData<any>) => T,
		data: ModelData<any>
	): T {
		return QModel.deserializer.deserialize(data, this);
	}

	/**
	 * Creates a model instance from a JSON string.
	 * 
	 * Parses a JSON string and deserializes it into a fully typed model instance.
	 * This is a convenience method that combines JSON.parse() and fromInterface().
	 * 
	 * @template T - The model class type
	 * @param json - JSON string representation of the model
	 * @returns A new, fully typed model instance
	 * 
	 * @example
	 * ```typescript
	 * const json = '{"id":"1","name":"John","createdAt":"2024-01-01T00:00:00.000Z"}';
	 * const user = User.fromJSON(json);
	 * 
	 * console.log(user instanceof User); // true
	 * console.log(user.createdAt instanceof Date); // true
	 * ```
	 */
	static fromJSON<T extends QModel<any>>(
		this: new (data: ModelData<any>) => T,
		json: string
	): T {
		return QModel.deserializer.deserializeFromJson(json, this);
	}

	/**
	 * Creates a deep clone of the model instance.
	 * 
	 * Performs a complete deep clone by serializing to interface and deserializing back.
	 * All nested models and arrays are also cloned, ensuring complete independence
	 * from the original instance.
	 * 
	 * **SOLID - Single Responsibility:** Leverages existing serialization services for cloning.
	 * 
	 * @returns A new instance with the same data but completely independent references
	 * 
	 * @example
	 * Simple model cloning
	 * ```typescript
	 * const user1 = new User({ id: '1', name: 'John', createdAt: new Date() });
	 * const user2 = user1.clone();
	 * 
	 * console.log(user2).not.toBe(user1); // true (different instances)
	 * console.log(user2.name === user1.name); // true (same data)
	 * ```
	 * 
	 * @example
	 * Nested model cloning
	 * ```typescript
	 * const company = new Company({
	 *   id: '1',
	 *   employees: [
	 *     { id: '1', name: 'Alice' },
	 *     { id: '2', name: 'Bob' }
	 *   ]
	 * });
	 * 
	 * const cloned = company.clone();
	 * 
	 * // Different instances
	 * console.log(cloned).not.toBe(company);
	 * console.log(cloned.employees).not.toBe(company.employees);
	 * console.log(cloned.employees[0]).not.toBe(company.employees[0]);
	 * 
	 * // Same data
	 * console.log(cloned.employees[0].name); // 'Alice'
	 * ```
	 */
	clone(): this {
		const Constructor = this.constructor as typeof QModel;
		return (Constructor as any).fromInterface(this.toInterface()) as this;
	}
}

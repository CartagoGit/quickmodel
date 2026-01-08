/**
 * QModel - Type-safe serialization and mock generation for TypeScript models
 * 
 * SOLID Principles Applied:
 * - S (Single Responsibility): QModel orchestrates, delegates to specific services
 * - O (Open/Closed): Open for extension (new transformers), closed for modification
 * - L (Liskov Substitution): All transformers are interchangeable
 * - I (Interface Segregation): Specific interfaces (ISerializer, IDeserializer, etc.)
 */

import 'reflect-metadata';
import {
	ModelDeserializer,
	ModelSerializer,
	MockGenerator,
	MockBuilder
} from '../services';
import type {
	QModelInstance,
	QModelInterface,
} from '../interfaces';
import type {
	SerializedInterface,
	ModelData,
} from '../interfaces/serialization-types.interface';


// Internal exports only (QType is implementation detail)
// Public API uses only @Quick() decorator
export { Quick } from '../decorators';
import { FIELDS_METADATA_KEY } from '../decorators/qtype.decorator';
export type { QInterface } from '../interfaces';

/**
 * Abstract base class for type-safe models with automatic serialization and mock generation.
 * 
 * QModel is the core class providing a declarative way to define TypeScript models 
 * with automatic JSON serialization/deserialization and type transformations.
 * 
 * **SOLID Principles Applied:**
 * - **S** (Single Responsibility): QModel orchestrates operations, delegates to specialized services
 * - **O** (Open/Closed): Open for extension via transformers, closed for modification
 * - **L** (Liskov Substitution): All transformers are interchangeable
 * - **I** (Interface Segregation): Specific interfaces (ISerializer, IDeserializer, etc.)
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
 * class User extends QModel<IUser> {
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
	TInterface extends Record<string, any>
> {
	// SOLID - Dependency Inversion: Services injected as dependencies
	private static readonly deserializer = new ModelDeserializer();
	private static readonly serializer = new ModelSerializer();
	private static readonly mockGenerator = new MockGenerator();

	// Store initial state for change tracking and reset
	private __initData?: SerializedInterface<TInterface>;

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
	static mock<T extends abstract new (...args: any[]) => QModel<any>>(
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
	 * @param data - Either a plain interface object or another model instance (for cloning)
	 * 
	 * @example
	 * ```typescript
	 * // From interface data
	 * const user = new User({
	 *   id: '1',
	 *   name: 'John',
	 *   createdAt: new Date() // or '2024-01-01T00:00:00.000Z'
	 * });
	 * 
	 * // Clone from another instance
	 * const clonedUser = new User(user);
	 * ```
	 */
	// Internal flag to track initialization
	private __initialized = false;

	constructor(data: ModelData<TInterface> | QModel<TInterface>) {
		Object.defineProperty(this, '__tempData', {
			value: data,
			writable: false,
			enumerable: false,
			configurable: true,
		});

		// Initialize immediately - the lazy getters will handle TypeScript field initialization
		this.initialize();
	}

	/**
	 * Gets metadata information for all fields in this model.
	 * Returns a Map with field names as keys and metadata objects containing type and transformer info.
	 * 
	 * @returns Map of field metadata
	 * 
	 * @example
	 * ```typescript
	 * const metadata = User.getMetadata();
	 * metadata.forEach((meta, fieldName) => {
	 *   console.log(`${fieldName}: type=${meta.type}, transformer=${meta.transformer}`);
	 * });
	 * ```
	 */
	static getMetadata(): Map<string, { type: string; transformer: any }> {
		const result = new Map<string, { type: string; transformer: any }>();
		const prototype = this.prototype;
		
		// Get all registered fields
		const fields = Reflect.getMetadata(FIELDS_METADATA_KEY, prototype) || [];
		
		for (const fieldName of fields) {
			const fieldType = Reflect.getMetadata('fieldType', prototype, fieldName);
			const arrayElementClass = Reflect.getMetadata('arrayElementClass', prototype, fieldName);
			const customTransformer = Reflect.getMetadata('customTransformer', prototype, fieldName);
			
			let type = fieldType || 'unknown';
			let transformer = null;
			
			if (customTransformer) {
				transformer = customTransformer;
			} else if (fieldType) {
				// Get transformer from registry
				const transformerRegistry = QModel.transformers;
				transformer = transformerRegistry.get(fieldType);
			}
			
			if (arrayElementClass) {
				type = `Array<${arrayElementClass.name || arrayElementClass}>`;
			}
			
			result.set(fieldName as string, { type, transformer });
		}
		
		return result;
	}

	/**
	 * Initializes the model instance by deserializing the input data.
	 * 
	 * SOLID - Single Responsibility: Only initializes, delegates deserialization to service.
	 * 
	 * @protected
	 */
	protected initialize(): void {
		// Avoid double initialization
		if (this.__initialized) return;
		this.__initialized = true;
		
		const data = this.__tempData;
		if (!data) return;

		// Check if the decorator pre-deserialized the values (embedded in data)
		const preDeserialized = (data as any).__quickPreDeserialized;
		
		if (preDeserialized && preDeserialized.deserializedValues) {
			// Use pre-deserialized values from decorator
			const { originalData, deserializedValues } = preDeserialized;
			
			// IMPORTANTE: Usar getOwnPropertyNames para obtener TODAS las propiedades,
			// incluyendo las no enumerables como __quickmodel_*
			const allKeys = Object.getOwnPropertyNames(deserializedValues);
			
			// Copy ALL properties from deserialized instance (including storage keys)
			const keysToInstall: string[] = [];
			
			for (const key of allKeys) {
				const value = deserializedValues[key];
				
				// Copy property directly
				(this as any)[key] = value;
				
				// Track keys that start with __quickmodel_ for lazy getter installation
				if (key.startsWith('__quickmodel_') && key !== '__quickmodel_values') {
					const propName = key.replace('__quickmodel_', '');
					if (!keysToInstall.includes(propName)) {
						keysToInstall.push(propName);
					}
				}
			}
			
			// Copy symbols
			for (const sym of Object.getOwnPropertySymbols(deserializedValues)) {
				(this as any)[sym] = deserializedValues[sym];
			}
			
			// Instalar getters "lazy" que buscan en backup si la propiedad es undefined
			this.installLazyGetters(keysToInstall);
			
			// Store initial data for change tracking
			Object.defineProperty(this, '__initData', {
				value: JSON.parse(JSON.stringify(originalData)),
				writable: false,
				enumerable: false,
				configurable: true,
			});
			
			Reflect.deleteProperty(this, '__tempData');
			return;
		}

		if (data.constructor === this.constructor) {
			Object.assign(this, data);
			// Store initial state for change tracking (BEFORE removing tempData) 
			Object.defineProperty(this, '__initData', {
				value: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
				writable: false,
				enumerable: false,
				configurable: true,
			});
			Reflect.deleteProperty(this, '__tempData');
			return;
		}

		// Auto-register was already done in constructor, just deserialize
		type DataAsInterface = Record<string, unknown>;
		type ThisConstructor = new (data: DataAsInterface) => this;
		const deserialized = QModel.deserializer.deserialize(
			data as unknown as DataAsInterface,
			this.constructor as ThisConstructor
		);
		
		// Copy ALL properties from deserialized instance
		// (includes both transformed properties with @QType and copied properties without @QType)
		
		// Store deserialized values in a hidden storage to handle Bun bug
		Object.defineProperty(this, '__quickmodel_values', {
			value: {} as any,
			writable: false,
			enumerable: false,
			configurable: true,
		});
		
		for (const key of Object.keys(deserialized)) {
			const value = (deserialized as any)[key];
			const storageKey = `__quickmodel_${key}`;
			// Asignar al storage que usa el getter/setter
			(this as any)[storageKey] = value;
			// También asignar directamente (puede ser sobrescrito por Bun)
			(this as any)[key] = value;
			// También guardar backup
			(this as any).__quickmodel_values[key] = value;
		}
		
		// Instalar getters "lazy" que buscan en backup si la propiedad es undefined
		this.installLazyGetters(Object.keys(deserialized));
		
		// Store initial state for change tracking and reset (BEFORE removing tempData)
		// This is the original data as it came into the constructor
		Object.defineProperty(this, '__initData', {
			value: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
			writable: false,
			enumerable: false,
			configurable: true,
		});
		
		// Remove temporary property
		Reflect.deleteProperty(this, '__tempData');
	}
	
	/**
	 * Instala getters que recuperan valores del backup si fueron sobrescritos por Bun
	 */
	private installLazyGetters(keys: string[]): void {
		for (const key of keys) {
			const descriptor = Object.getOwnPropertyDescriptor(this, key);
			
			// Si ya tiene getter (de @QType()), skip
			if (descriptor && descriptor.get) {
				continue;
			}
			
			const storageKey = `__quickmodel_${key}`;
			
			// Definir getter que busca en múltiples lugares
			// IMPORTANTE: configurable: false para que TypeScript no lo sobrescriba
			Object.defineProperty(this, key, {
				get(this: any) {
					// 1. Intentar del storage específico
					let val = this[storageKey];
					if (val !== undefined) return val;
					
					// 2. Buscar en el backup
					val = this.__quickmodel_values?.[key];
					if (val !== undefined) return val;
					
					// 3. Retornar undefined
					return undefined;
				},
				set(this: any, value: any) {
					this[storageKey] = value;
				},
				enumerable: true,
				configurable: false  // NO permitir que TypeScript lo sobrescriba
			});
		}
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
	 * const data = user.serialize();
	 * // { id: '1', name: 'John', createdAt: '2024-01-01T00:00:00.000Z' }
	 * ```
	 */
	serialize(): SerializedInterface<TInterface> {
		type ModelAsRecord = Record<string, unknown>;
		return QModel.serializer.serialize(
			this as unknown as ModelAsRecord
		) as SerializedInterface<TInterface>;
	}

	/**
	 * Serializes the model instance to a JSON string.
	 * 
	 * Converts the model to a JSON string representation. This is a convenience method
	 * that combines serialize() and JSON.stringify().
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
	 * const user = User.deserialize(userData);
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
	 * const account = Account.deserialize(accountData);
	 * console.log(typeof account.balance); // 'bigint'
	 * console.log(account.pattern instanceof RegExp); // true
	 * ```
	 */
	static deserialize<T extends QModel<any>>(
		this: new (data: ModelData<any>) => T,
		data: ModelData<any>
	): T {
		return QModel.deserializer.deserialize(data, this);
	}

	/**
	 * Creates a model instance from a JSON string.
	 * 
	 * Parses a JSON string and deserializes it into a fully typed model instance.
	 * This is a convenience method that combines JSON.parse() and deserialize().
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

	/**
	 * Returns the current state as a plain interface object with primitive values.
	 * 
	 * This converts all transformed types back to their interface representation:
	 * - Date → ISO string
	 * - BigInt → string representation
	 * - RegExp → string pattern
	 * - Set → array
	 * - Map → plain object
	 * - etc.
	 * 
	 * This is the inverse of the transformations applied during construction.
	 * 
	 * @returns Plain object with current values in primitive/serializable format
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({
	 *   id: '1',
	 *   createdAt: '2024-01-01T00:00:00.000Z'
	 * });
	 * 
	 * user.createdAt = new Date('2024-12-31');
	 * 
	 * const current = user.getInterface();
	 * // { id: '1', createdAt: '2024-12-31T00:00:00.000Z' }
	 * ```
	 */
	getInterface(): SerializedInterface<TInterface> {
		if (!this.__initData) {
			return this.serialize();
		}

		const result: any = {};
		const metadata = (this.constructor as typeof QModel).getMetadata();

		// Iterate over all keys in the initial data
		for (const key in this.__initData) {
			const currentValue = (this as any)[key];
			const initValue = this.__initData[key];
			const fieldMetadata = metadata.get(key);

			// If no current value, use initial
			if (currentValue === undefined || currentValue === null) {
				result[key] = currentValue;
				continue;
			}

			// If we have transformer metadata, use the transformer
			if (fieldMetadata) {
				const { type, transformer } = fieldMetadata;
				
				if (transformer) {
					result[key] = transformer.toInterface(currentValue, type);
					continue;
				}
			}

			// Handle objects with serialize method (nested QModels)
			if (currentValue && typeof currentValue === 'object' && typeof currentValue.serialize === 'function') {
				result[key] = currentValue.serialize();
				continue;
			}

			// Handle objects with getInterface method
			if (currentValue && typeof currentValue === 'object' && typeof currentValue.getInterface === 'function') {
				result[key] = currentValue.getInterface();
				continue;
			}

			// Handle objects with clone method - create new instance
			if (currentValue && typeof currentValue === 'object' && typeof currentValue.clone === 'function') {
				result[key] = currentValue.clone();
				continue;
			}

			// Handle arrays
			if (Array.isArray(currentValue)) {
				result[key] = currentValue.map(item => {
					if (item && typeof item === 'object') {
						if (typeof item.serialize === 'function') return item.serialize();
						if (typeof item.getInterface === 'function') return item.getInterface();
						if (typeof item.clone === 'function') return item.clone();
						// Try to create new instance using constructor
						const ItemConstructor = item.constructor;
						if (ItemConstructor && ItemConstructor !== Object) {
							try {
								return new ItemConstructor(item);
							} catch {
								return { ...item };
							}
						}
						return { ...item };
					}
					return item;
				});
				continue;
			}

			// Handle regular objects - check if same type as initial
			if (currentValue && typeof currentValue === 'object' && initValue && typeof initValue === 'object') {
				const CurrentConstructor = currentValue.constructor;
				
				// If it's a special type (not plain Object), try to create new instance
				if (CurrentConstructor && CurrentConstructor !== Object) {
					// Check if same type or instance of
					if (currentValue instanceof CurrentConstructor) {
						// Try clone method first
						if (typeof currentValue.clone === 'function') {
							result[key] = currentValue.clone();
							continue;
						}
						
						// Try constructor
						try {
							result[key] = new CurrentConstructor(currentValue);
							continue;
						} catch {
							// Fall through to default handling
						}
					}
				}
				
				// Default: shallow copy
				result[key] = { ...currentValue };
				continue;
			}

			// Primitive values - use as is
			result[key] = currentValue;
		}

		return result;
	}

	/**
	 * Returns the initial state as it was when the model was constructed.
	 * 
	 * This returns the exact interface data used to create the instance,
	 * with all values in their primitive/serialized format. Useful for:
	 * - Detecting changes: compare with getInterface()
	 * - Resetting to original state
	 * - Undo functionality
	 * - Audit trails
	 * 
	 * @returns Plain object with initial values in primitive format
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({
	 *   id: '1',
	 *   name: 'John',
	 *   createdAt: '2024-01-01T00:00:00.000Z'
	 * });
	 * 
	 * user.name = 'Jane';
	 * user.createdAt = new Date('2024-12-31');
	 * 
	 * const init = user.getInitInterface();
	 * // { id: '1', name: 'John', createdAt: '2024-01-01T00:00:00.000Z' }
	 * 
	 * const current = user.getInterface();
	 * // { id: '1', name: 'Jane', createdAt: '2024-12-31T00:00:00.000Z' }
	 * ```
	 */
	getInitInterface(): SerializedInterface<TInterface> {
		return { ...(this.__initData as SerializedInterface<TInterface>) };
	}

	/**
	 * Checks if the model has been modified since construction.
	 * 
	 * Compares the current state with the initial state to detect changes.
	 * Performs a deep comparison of all fields.
	 * 
	 * @returns true if any field has changed, false otherwise
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', age: 30 });
	 * 
	 * console.log(user.hasChanges()); // false
	 * 
	 * user.name = 'Jane';
	 * console.log(user.hasChanges()); // true
	 * ```
	 */
	hasChanges(): boolean {
		const current = this.getInterface();
		const initial = this.getInitInterface();
		return !this.deepEqual(current, initial);
	}

	/**
	 * Alias for hasChanges(). Checks if the model is dirty (has unsaved changes).
	 * 
	 * @returns true if the model has been modified, false otherwise
	 */
	isDirty(): boolean {
		return this.hasChanges();
	}

	/**
	 * Returns an array of field names that have changed since construction.
	 * 
	 * Useful for:
	 * - Partial updates (PATCH requests)
	 * - Change tracking
	 * - Audit logs
	 * - Optimistic UI updates
	 * 
	 * @returns Array of field names that differ from initial state
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', age: 30, email: 'john@example.com' });
	 * 
	 * user.name = 'Jane';
	 * user.age = 31;
	 * 
	 * console.log(user.getChangedFields()); // ['name', 'age']
	 * ```
	 */
	getChangedFields(): string[] {
		const current = this.getInterface();
		const initial = this.getInitInterface();
		const changes: string[] = [];

		for (const key in current) {
			if (!this.deepEqual(current[key], initial[key])) {
				changes.push(key);
			}
		}

		return changes;
	}

	/**
	 * Returns an object containing only the fields that have changed.
	 * 
	 * Perfect for PATCH requests where you only want to send modified fields.
	 * 
	 * @returns Object with only changed fields and their current values
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({ 
	 *   id: '1', 
	 *   name: 'John', 
	 *   age: 30, 
	 *   email: 'john@example.com' 
	 * });
	 * 
	 * user.name = 'Jane';
	 * user.age = 31;
	 * 
	 * const changes = user.getChanges();
	 * // { name: 'Jane', age: 31 }
	 * 
	 * // Use for PATCH request
	 * await api.patch(`/users/${user.id}`, changes);
	 * ```
	 */
	getChanges(): Partial<SerializedInterface<TInterface>> {
		const current = this.getInterface();
		const initial = this.getInitInterface();
		const changes: Partial<SerializedInterface<TInterface>> = {};

		for (const key in current) {
			if (!this.deepEqual(current[key], initial[key])) {
				changes[key] = current[key];
			}
		}

		return changes;
	}

	/**
	 * Resets the model to its initial state.
	 * 
	 * Restores all fields to the values they had when the instance was created.
	 * Useful for:
	 * - Cancel/undo operations
	 * - Form reset buttons
	 * - Reverting failed updates
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', age: 30 });
	 * 
	 * user.name = 'Jane';
	 * user.age = 31;
	 * 
	 * console.log(user.name); // 'Jane'
	 * 
	 * user.reset();
	 * 
	 * console.log(user.name); // 'John'
	 * console.log(user.age); // 30
	 * console.log(user.hasChanges()); // false
	 * ```
	 */
	reset(): void {
		const initial = this.getInitInterface();
		const Constructor = this.constructor as typeof QModel;
		const restored = (Constructor as any).deserialize(initial);

		// Copy all properties from restored instance
		for (const key of Object.keys(restored)) {
			(this as any)[key] = (restored as any)[key];
		}
	}

	/**
	 * Applies partial updates to the model.
	 * 
	 * Merges the provided data with the current state. Only updates fields
	 * that are present in the patch data. Useful for:
	 * - Applying server responses from PATCH requests
	 * - Incremental updates
	 * - Form partial updates
	 * 
	 * @param patch - Partial object with fields to update
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({ 
	 *   id: '1', 
	 *   name: 'John', 
	 *   age: 30, 
	 *   email: 'john@example.com' 
	 * });
	 * 
	 * user.patch({ name: 'Jane', age: 31 });
	 * 
	 * console.log(user.name); // 'Jane'
	 * console.log(user.age); // 31
	 * console.log(user.email); // 'john@example.com' (unchanged)
	 * ```
	 */
	patch(patch: Partial<ModelData<TInterface>>): void {
		const Constructor = this.constructor as typeof QModel;
		const current = this.serialize();
		const merged = { ...current, ...patch };
		const updated = (Constructor as any).deserialize(merged);

		// Copy all properties from updated instance
		for (const key of Object.keys(updated)) {
			(this as any)[key] = (updated as any)[key];
		}
	}

	/**
	 * Deep equality comparison for change detection.
	 * 
	 * @private
	 */
	private deepEqual(a: any, b: any): boolean {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (typeof a !== typeof b) return false;

		// Handle arrays
		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) return false;
			return a.every((val, idx) => this.deepEqual(val, b[idx]));
		}

		// Handle objects
		if (typeof a === 'object' && typeof b === 'object') {
			const keysA = Object.keys(a);
			const keysB = Object.keys(b);
			
			if (keysA.length !== keysB.length) return false;
			
			return keysA.every(key => this.deepEqual(a[key], b[key]));
		}

		return false;
	}

	/**
	 * Creates a deep copy of this model instance.
	 * 
	 * @returns A new instance with the same data
	 */
	clone(): this {
		const Constructor = this.constructor as typeof QModel;
		return (Constructor as any).deserialize(this.serialize()) as this;
	}
}

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
import { Deserializer } from '@/core/services/deserializer.service';
import { Serializer } from '@/core/services/serializer.service';
import { MockGenerator } from '@/core/services/mock-generator.service';
import { MockBuilder } from '@/core/services/mock-builder.service';
import type { QModelInstance, QModelInterface } from '@/core/interfaces/mock-types.interface';
import type {
	SerializedInterface,
	ModelData,
} from '@/core/interfaces/serialization-types.interface';
import { QTYPES_METADATA_KEY } from '@/core/decorators/qtype.decorator';
import { QUICK_DECORATOR_KEY, QUICK_VALUES_KEY } from '../constants/metadata-keys';

// Internal exports only (QType is implementation detail)
// Public API uses only @Quick() decorator
export { Quick } from '@/core/decorators/quick.decorator';
export type { QInterface } from '@/core/interfaces/model.interface';

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
export abstract class QModel<TInterface extends Record<string, any>> {
	// SOLID - Dependency Inversion: Services injected as dependencies
	private static readonly deserializer = new Deserializer();
	private static readonly serializer = new Serializer();
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
		type InstanceType = ThisClass extends abstract new (...args: any[]) => infer R ? R : never;
		type InterfaceType = InstanceType extends QModel<infer I> ? I : never;

		// @ts-expect-error - TypeScript doesn't allow instantiating abstract classes, but at runtime `this` is the concrete class
		const ModelClass: new (data: InterfaceType) => InstanceType = this;

		return new MockBuilder(ModelClass, QModel.mockGenerator);
	}

	/**
	 * Gets metadata information for all registered qtypes in this model class.
	 * Returns a Map with field names as keys and metadata objects containing type and transformer info.
	 *
	 * @returns Map of field metadata with type names and transformer information
	 *
	 * @example
	 * ```typescript
	 * const metadata = User.getMetadata();
	 * metadata.forEach((meta, fieldName) => {
	 *   console.log(`${fieldName}: type=${meta.type}, transformer=${meta.transformer?.name}`);
	 * });
	 * // Output:
	 * // id: type=String, transformer=undefined
	 * // createdAt: type=Date, transformer=DateTransformer
	 * // balance: type=BigInt, transformer=BigIntTransformer
	 * ```
	 */
	static getMetadata(): Map<string, { type: string; transformer: any }> {
		const result = new Map<string, { type: string; transformer: any }>();
		const prototype = this.prototype;

		// Get all registered qtypes using the correct symbol
		const qtypes = Reflect.getMetadata(QTYPES_METADATA_KEY, prototype) || [];

		for (const fieldName of qtypes) {
			const fieldType = Reflect.getMetadata('fieldType', prototype, fieldName);
			const arrayElementClass = Reflect.getMetadata('arrayElementClass', prototype, fieldName);
			const customTransformer = Reflect.getMetadata('customTransformer', prototype, fieldName);

			let type = 'unknown';
			let transformer = null;

			if (customTransformer) {
				type = 'Custom';
				transformer = customTransformer;
			} else if (arrayElementClass) {
				type = `Array<${arrayElementClass.name || 'unknown'}>`;
				// Get transformer for array element type from deserializer registry
				transformer = (QModel.deserializer as any).transformers?.get(arrayElementClass);
			} else if (fieldType) {
				type = fieldType.name || fieldType.toString();
				// Get transformer from deserializer registry
				transformer = (QModel.deserializer as any).transformers?.get(fieldType);
			}

			result.set(fieldName as string, { type, transformer });
		}

		return result;
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
	constructor(data: ModelData<TInterface> | QModel<TInterface>) {
		Object.defineProperty(this, '__tempData', {
			value: data,
			writable: false,
			enumerable: false,
			configurable: true,
		});

		// Auto-initialize and store deserialized values
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

		// Copy ALL properties from deserialized instance
		// (includes both transformed properties with @QType and copied properties without @QType)

		// Store deserialized values in a hidden storage to handle Bun bug
		Object.defineProperty(this, QUICK_VALUES_KEY, {
			value: {} as any,
			writable: false,
			enumerable: false,
			configurable: true,
		});

		// Get all property keys from deserialized instance (only OWN properties, not getters from prototype)
		const allKeys = new Set<string>();

		// Add own enumerable properties (these have actual values)
		for (const key of Object.keys(deserialized)) {
			allKeys.add(key);
		}

		for (const key of allKeys) {
			// Skip internal __initData, __tempData, etc. but NOT __quickDecorator__ storage keys
			if (key.startsWith('__') && !key.startsWith(QUICK_DECORATOR_KEY)) {
				continue;
			}

			// Skip methods
			if (typeof (deserialized as any)[key] === 'function') {
				continue;
			}

			const value = (deserialized as any)[key];

			// Determine storage key - don't duplicate __quickDecorator__ prefix
			let storageKey: string;
			let propertyKey: string;

			if (key.startsWith(QUICK_DECORATOR_KEY)) {
				// Key is already a storage key, use as-is
				storageKey = key;
				// Extract property name by removing prefix
				propertyKey = key.slice(QUICK_DECORATOR_KEY.length);
			} else {
				// Regular property, add prefix for storage
				storageKey = `${QUICK_DECORATOR_KEY}${key}`;
				propertyKey = key;
			}

			(this as any)[storageKey] = value;
			// Store in backup
			(this as any)[QUICK_VALUES_KEY][propertyKey] = value;
		}

		// Install lazy getters only for actual property names (not storage keys)
		const propertyNames = Array.from(allKeys).filter((k) => !k.startsWith(QUICK_DECORATOR_KEY));
		this.installLazyGetters(propertyNames);

		// Remove temporary property
		Reflect.deleteProperty(this, '__tempData');

		// Store ORIGINAL data (before transformations) for format preservation in toInterface()
		// Use custom clone because structuredClone doesn't support symbols
		const initDataClone: any = {};
		for (const key in data) {
			const value = data[key];
			// Symbols and functions cannot be cloned, keep reference
			if (typeof value === 'symbol' || typeof value === 'function') {
				initDataClone[key] = value;
			} else {
				try {
					initDataClone[key] = structuredClone(value);
				} catch {
					// Fallback for non-cloneable values
					initDataClone[key] = value;
				}
			}
		}

		Object.defineProperty(this, '__initData', {
			value: initDataClone,
			writable: false,
			enumerable: false,
			configurable: true,
		});
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

			const storageKey = `${QUICK_DECORATOR_KEY}${key}`;

			// Definir getter que busca en múltiples lugares
			Object.defineProperty(this, key, {
				get(this: any) {
					// 1. Intentar del storage específico
					let val = this[storageKey];
					if (val !== undefined) return val;

					// 2. Buscar en el backup
					val = this[QUICK_VALUES_KEY]?.[key];
					if (val !== undefined) return val;

					// 3. Retornar undefined
					return undefined;
				},
				set(this: any, value: any) {
					this[storageKey] = value;
				},
				enumerable: true,
				configurable: true,
			});
		}
	}

	/**
	 * Serializes the model instance to a plain interface object.
	 * Complex types (Date, BigInt, Map, etc.) are converted to JSON-serializable primitives.
	 *
	 * SOLID - Single Responsibility: Delegates serialization to Serializer.
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
	 * **SOLID - Single Responsibility:** Delegates to Serializer service.
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
		return QModel.serializer.serializeToJson(this as unknown as ModelAsRecord);
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
	static fromJSON<T extends QModel<any>>(this: new (data: ModelData<any>) => T, json: string): T {
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
	 * Converts the current state to interface format (same as constructor input).
	 * 
	 * This method converts the current values back to the exact format that was originally
	 * passed to the constructor, preserving types:
	 * - Date objects → ISO 8601 strings (as they came in)
	 * - BigInt → preserves original format (string or object)
	 * - RegExp → preserves original format (string or object)
	 * - Numbers → preserves type (including NaN, Infinity)
	 * - Wrappers → preserves wrapper vs primitive
	 * 
	 * Use cases:
	 * - Sending to backend APIs
	 * - Comparing with initial state
	 * - Detecting changes
	 * - NOT for JSON (use toJSON() instead)
	 * 
	 * @returns Object with current values in the same format/types as constructor input
	 * 
	 * @example
	 * ```typescript
	 * const user = new User({
	 *   id: '1',
	 *   age: 30,  // number primitive
	 *   createdAt: '2024-01-01T00:00:00.000Z'  // String format
	 * });
	 * 
	 * user.age = NaN;  // Still a number
	 * user.createdAt = new Date('2024-12-31');
	 * 
	 * const current = user.toInterface();
	 * // { id: '1', age: NaN, createdAt: '2024-12-31T00:00:00.000Z' }
	 * // age is number (NaN), not string "NaN"
	 * ```
	 */
	toInterface(): TInterface {
		return QModel.serializer.toInterface<TInterface>(this as any);
	}

	/**
	 * Returns the initial state exactly as it was passed to the constructor.
	 *
	 * This returns a copy of the exact interface data used to create the instance,
	 * in the same format it was provided (with all values as primitives/strings).
	 * Useful for:
	 * - Detecting changes: compare with toInterface()
	 * - Resetting to original state: restore from this data
	 * - Undo functionality: revert to initial values
	 * - Audit trails: track what the original data was
	 *
	 * @returns Plain object with initial values in the same format as constructor input
	 *
	 * @example
	 * ```typescript
	 * const user = new User({
	 *   id: '1',
	 *   name: 'John',
	 *   age: 30,
	 *   createdAt: '2024-01-01T00:00:00.000Z'  // String format
	 * });
	 *
	 * // Modify the instance
	 * user.name = 'Jane';
	 * user.age = 31;
	 * user.createdAt = new Date('2024-12-31');
	 *
	 * // Get initial state (unchanged)
	 * const init = user.getInitInterface();
	 * // { id: '1', name: 'John', age: 30, createdAt: '2024-01-01T00:00:00.000Z' }
	 *
	 * // Get current state (modified)
	 * const current = user.toInterface();
	 * // { id: '1', name: 'Jane', age: 31, createdAt: '2024-12-31T00:00:00.000Z' }
	 *
	 * // Compare to detect changes
	 * console.log(init.name !== current.name); // true
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
		const current = this.toInterface();
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
		const current = this.toInterface();
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
		const current = this.toInterface();
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

			return keysA.every((key) => this.deepEqual(a[key], b[key]));
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

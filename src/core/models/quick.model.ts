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
import type { IQSerializationOptions } from '@/core/interfaces/serializer.interface';
import { ToInterfaceService } from '@/core/services/to-interface.service';
import { QMockGenerator } from '@/core/services/mock-generator.service';
import { ValidationService } from '@/core/services/validation.service';
import { QMockBuilder } from '@/core/services/mock-builder.service';
import type {
	IQModelInstance,
	IQModelInterface,
} from '@/core/interfaces/mock-types.interface';
import type {
	IQSerializedInterface,
	IQModelData,
} from '@/core/interfaces/serialization-types.interface';
import type { IQValidationResult } from '@/core/interfaces/transformer.interface';
import type {
	IQAnyRecord,
	IModelConstructor,
} from '@/core/interfaces/model.interface';
import { QTYPES_METADATA_KEY } from '@/core/decorators/qtype.decorator';
import {
	QUICK_VALUES_KEY,
	QUICK_PROPERTY_KEYS,
	QUICK_TYPE_MAP_KEY,
	QUICK_OPTIONS_KEY,
} from '../constants/metadata-keys';
import { deepFreeze } from '@/core/helpers/transform-helpers';

// Internal exports only (QType is implementation detail)
// Public API uses only @Quick() decorator
export { Quick } from '@/core/decorators/quick.decorator';
export type {
	IQImplements,
	IQTransform,
} from '@/core/interfaces/model.interface';

/**
 * Base abstract class for type-safe models with automatic serialization and type transformation.
 *
 * `QModel` is the heart of the library. It provides a declarative way to define TypeScript models
 * that automatically handle the conversion between IQSerialized formats (JSON) and runtime types.
 *
 * **Key Features:**
 * - 🔄 **Type Transformation**: Convert strings to Date, BigInt, RegExp, etc.
 * - 📦 **Serialization**: Safe `toJSON()` and `deserialize()` methods.
 * - 🎭 **Mocking**: Built-in mock generator using Faker.js.
 * - 🔍 **Validation**: Integrity checks for required properties.
 *
 * **Design Principles (SOLID):**
 * - **Single Responsibility (SRP)**: Delegates logic to dedicated services (Serializer, Deserializer).
 * - **Open/Closed (OCP)**: Extensible via custom transformers without core modification.
 * - **Dependency Inversion (DIP)**: Depends on abstractions, not concrete implementations.
 *
 * @group Classes
 * Syntax: `QModel<InterfaceType>`
 *
 * @template TInterface - The interface representing the IQSerialized JSON structure (e.g., `string` for dates)
 *
 * @example
 * **Basic Usage**
 * ```typescript
 * interface IUser {
 *   id: string;
 *   createdAt: string; // ISO Date string
 * }
 *
 * @Quick({ createdAt: Date })
 * class User extends QModel<IUser> {
 *   declare id: string;
 *   declare createdAt: Date; // Transformed to Date object
 * }
 *
 * const user = User.create({ id: '1', createdAt: '2024-01-01' });
 * console.log(user.createdAt instanceof Date); // true
 * ```
 */
export abstract class QModel<TInterface extends IQAnyRecord> {
	// SOLID - Dependency Inversion: Services injected as dependencies
	private static readonly deserializer = new Deserializer();
	private static readonly serializer = new Serializer();
	private static readonly toInterfaceService = new ToInterfaceService();
	private static readonly QMockGenerator = new QMockGenerator();
	private static readonly validation = new ValidationService();

	// Store initial state for change tracking and reset
	private __initData?: IQSerializedInterface<TInterface>;

	/**
	 * Internal property storage for transformed values.
	 * Explicitly defined to avoid 'any' usage and dynamic assignment.
	 * @internal
	 */
	protected [QUICK_VALUES_KEY]: Record<string, unknown> = {};

	/**
	 * Factory method to create model instances with type-safe access to all properties.
	 *
	 * **IMPORTANT: This method provides TWO different approaches for type-safety:**
	 *
	 * 1. **RECOMMENDED (Option A)**: Use `declare` keyword in your class
	 *    - Standard TypeScript pattern
	 *    - Works with both `new` constructor and `create()` method
	 *    - Explicit and clear
	 *    - Most common approach
	 *
	 * 2. **ALTERNATIVE (Option B)**: Use `IQTransform` helper or generic overriding
	 *    - ONLY if you specifically want to avoid `declare` keyword
	 *    - Requires passing type explicitly
	 *    - Less common, more verbose
	 *
	 * **⚠️ CRITICAL: TypeScript CANNOT auto-infer transformations**
	 * You MUST specify transformed types using ONE of the two approaches above.
	 * There is no "magic" automatic inference.
	 *
	 * @template T - Backend interface type (JSON-serializable types)
	 * @template TClass - The concrete model class type
	 * @template TResult - The final return type (defaults to class & interface, but can be overridden)
	 *
	 * @param data - Data to initialize the model
	 * @returns Model instance with type-safe property access
	 *
	 * @example
	 * **OPTION A (RECOMMENDED): Using `declare` keyword**
	 * ```typescript
	 * interface IPost {
	 *   id: number;
	 *   title: string;
	 *   createdAt: string;  // Backend sends ISO string
	 *   balance: string;    // Backend sends string
	 * }
	 *
	 * @Quick({ createdAt: Date, balance: BigInt })
	 * class Post extends QModel<IPost> {
	 *   declare id: number;        // ← Explicit declaration
	 *   declare title: string;     // ← Explicit declaration
	 *   declare createdAt: Date;   // ← Runtime type (transformed)
	 *   declare balance: bigint;   // ← Runtime type (transformed)
	 * }
	 *
	 * // Usage is simple and clean
	 * const post = Post.create({
	 *   id: 1,
	 *   title: 'My Post',
	 *   createdAt: '2026-01-10T00:00:00.000Z',
	 *   balance: '999999999999999'
	 * });
	 *
	 * post.id         // ✅ number (type-safe)
	 * post.title      // ✅ string (type-safe)
	 * post.createdAt  // ✅ Date (type-safe, transformed)
	 * post.balance    // ✅ bigint (type-safe, transformed)
	 *
	 * // Also works with `new` constructor
	 * const post2 = new Post({ ... });  // ✅ Same type-safety
	 * ```
	 *
	 * @example
	 * **OPTION B (ALTERNATIVE): Using IQTransform type helper with generic override**
	 *
	 * ⚠️ ONLY use this if you specifically don't want to use `declare` keyword.
	 * This approach is MORE VERBOSE and ONLY WORKS with `create()`, not with `new`.
	 *
	 * ```typescript
	 * interface IPost {
	 *   id: number;
	 *   title: string;
	 *   createdAt: string;  // Backend: ISO string
	 *   balance: string;    // Backend: string
	 * }
	 *
	 * @Quick({ createdAt: Date, balance: BigInt })
	 * class Post extends QModel<IPost> {
	 *   // No declare needed
	 * }
	 *
	 * // Pass IQTransform as 3rd type parameter to create()
	 * const post = Post.create<IPost, Post, IQTransform<IPost, {
	 *   createdAt: Date;
	 *   balance: bigint;
	 * }>>({
	 *   id: 1,
	 *   title: 'My Post',
	 *   createdAt: '2026-01-10T00:00:00.000Z',
	 *   balance: '999999999999999'
	 * });
	 *
	 * post.id         // ✅ number (type-safe)
	 * post.title      // ✅ string (type-safe)
	 * post.createdAt  // ✅ Date (type-safe via IQTransform)
	 * post.balance    // ✅ bigint (type-safe via IQTransform)
	 *
	 * // ❌ Does NOT work with `new` constructor
	 * const post2 = new Post({ ... });  // ❌ No type-safety for transforms
	 * ```
	 *
	 * @remarks
	 * **When to use each approach:**
	 *
	 * | Aspect | Option A: `declare` | Option B: `IQTransform` |
	 * |--------|---------------------|------------------------|
	 * | **Recommendation** | ✅ RECOMMENDED | ⚠️ ALTERNATIVE |
	 * | **Syntax complexity** | Simple | Simple (but manual generic) |
	 * | **Works with `new`** | ✅ Yes | ❌ No |
	 * | **Works with `create()`** | ✅ Yes | ✅ Yes (with generic) |
	 * | **Input Validation** | ✅ Strict | ⚠️ Loose (unless 2nd generic used) |
	 *
	 * **Example Usage Details:**
	 *
	 * | Usage Pattern | Input (Data) | Output (Instance) |
	 * |---------------|--------------|-------------------|
	 * | `User.create(data)` | `IUser` | `User` (requires `declare`) |
	 * | `User.create<User>(data)` | Loose | `User` |
	 * | `User.create<IQTransform<...>>(data)` | Loose | Transformed Type |
	 *
	 * @see {@link QModel} for main class documentation
	 */
	/**
	 * Creates a new instance of the model with STRICT type checking.
	 *
	 * @param data - Data strictly matching the model interface
	 */
	static create<
		TClass extends QModel<any>,
		TInterface = TClass extends QModel<infer I> ? I : never,
		TResult = TClass,
	>(this: new (data: any) => TClass, data: NoInfer<TInterface>): TResult;

	static create(this: any, data: any): any {
		// Use generics to cast 'this' to the constructor type
		const Constructor = this;
		return new Constructor(data);
	}

	/**
	 * Creates a READ-ONLY (immutable) instance of the model.
	 * The instance and all nested properties will be recursively frozen.
	 *
	 * @param data - Data to initialize the model
	 * @returns Deeply frozen model instance
	 *
	 * @example
	 * ```typescript
	 * const user = User.createReadonly({ name: 'John' });
	 * user.name = 'Jane'; // ❌ Throws TypeError in strict mode
	 * ```
	 */
	static createReadonly<
		T extends IQAnyRecord = IQAnyRecord,
		TClass extends QModel<T> = QModel<T>,
		TResult = TClass,
	>(this: new (data: T) => TClass, data: T): Readonly<TResult> {
		// Instantiate directly using the logic from create() to avoid abstract type issues
		const Constructor = this as unknown as new (data: T) => TClass;
		const instance = new Constructor(data) as unknown as TResult;
		return deepFreeze(instance) as unknown as Readonly<TResult>;
	}

	/**
	 * Creates a type-safe mock builder for generating test data.
	 * Each derived class automatically infers its correct types.
	 *
	 * @template T - The model class constructor type
	 * @returns A QMockBuilder instance specialized for this model class
	 *
	 * @example
	 * ```typescript
	 * const user = User.mock().random(); // returns User
	 * const users = User.mock().array(5); // returns User[]
	 * ```
	 */
	static mock<T extends abstract new (...args: any[]) => QModel<IQAnyRecord>>(
		this: T
	): QMockBuilder<IQModelInstance<T>, IQModelInterface<T>> {
		type ThisClass = T;
		type InstanceType = ThisClass extends abstract new (
			...args: unknown[]
		) => infer R
			? R
			: never;

		const ModelClass: new (data: any) => InstanceType =
			this as unknown as IModelConstructor<InstanceType>;

		return new QMockBuilder(
			ModelClass,
			QModel.QMockGenerator
		) as unknown as QMockBuilder<IQModelInstance<T>, IQModelInterface<T>>;
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
	static getMetadata(): Map<string, { type: string; transformer: unknown }> {
		const result = new Map<
			string,
			{ type: string; transformer: unknown }
		>();
		const prototype = this.prototype;

		// Get all registered qtypes using the correct symbol
		const qtypes =
			Reflect.getMetadata(QTYPES_METADATA_KEY, prototype) || [];

		for (const fieldName of qtypes) {
			const fieldType = Reflect.getMetadata(
				'fieldType',
				prototype,
				fieldName
			);
			const arrayElementClass = Reflect.getMetadata(
				'arrayElementClass',
				prototype,
				fieldName
			);
			const customTransformer = Reflect.getMetadata(
				'customTransformer',
				prototype,
				fieldName
			);

			let type = 'unknown';
			let transformer = null;

			if (customTransformer) {
				type = 'Custom';
				transformer = customTransformer;
			} else if (arrayElementClass) {
				type = `Array<${arrayElementClass.name || 'unknown'}>`;
				// Get transformer for array element type from deserializer registry
				transformer =
					QModel.deserializer.getTransformer(arrayElementClass);
			} else if (fieldType) {
				type = fieldType.name || fieldType.toString();
				// Get transformer from deserializer registry
				transformer = QModel.deserializer.getTransformer(fieldType);
			}

			result.set(fieldName as string, { type, transformer });
		}

		return result;
	}

	// Temporary property for unprocessed data (removed after initialize)
	private readonly __tempData?: IQModelData<TInterface>;

	/**
	 * Constructs a new model instance from interface data or another instance.
	 * Automatically deserializes complex types (Date, BigInt, etc.) based on `@QType` decorators.
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
	constructor(data: IQModelData<TInterface> | QModel<TInterface>) {
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
	protected initialize(
		inputData?: IQModelData<TInterface> | QModel<TInterface>
	): void {
		const data = inputData || this.__tempData;
		if (!data) return;

		if (data.constructor === this.constructor) {
			// Cloning logic: Copy internal storage directly
			// Object.assign(this, data) fails because properties are getters on prototype (not own enumerable)
			const source = data as unknown as Record<string, unknown>;

			if (QUICK_VALUES_KEY in source) {
				const storage = source[QUICK_VALUES_KEY] as object;
				Object.defineProperty(this, QUICK_VALUES_KEY, {
					value: { ...storage }, // Shallow copy
					writable: true,
					enumerable: false, // Internal storage hidden
					configurable: true,
				});

				// Install lazy getters for the cloned properties to ensure they are accessible
				// This is critical when cloning because Object.assign was removed and getters are on the instance
				this.installLazyGetters(Object.keys(storage));
			}

			// Also copy __initData to preserve dirty status
			if ('__initData' in source) {
				const initData = source['__initData'] as object;
				Object.defineProperty(this, '__initData', {
					value: initData ? { ...initData } : undefined,
					writable: false,
					enumerable: false,
					configurable: true,
				});
			}
			return;
		}

		// Store ORIGINAL data (before transformations) for format preservation in toInterface()
		// IMPORTANT: Must be done BEFORE deserialization to preserve original types
		const initDataClone: Record<string, unknown> = {};
		for (const key in data) {
			// SECURITY: Prevent Prototype Pollution
			if (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			) {
				continue;
			}

			const value = (data as Record<string, unknown>)[key];
			// Symbols and functions cannot be cloned, keep reference
			// QModel instances should also be kept by reference to avoid structuredClone corruption of getters
			if (
				typeof value === 'symbol' ||
				typeof value === 'function' ||
				(typeof value === 'object' &&
					value !== null &&
					'toInterface' in value)
			) {
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

		// Auto-register was already done in constructor, just deserialize
		type DataAsInterface = Record<string, unknown>;
		type ThisConstructor = new (data: DataAsInterface) => this;
		const deserialized = QModel.deserializer.deserialize(
			data as unknown as DataAsInterface,
			this.constructor as ThisConstructor
		);

		// Copy ALL properties from deserialized instance
		// (includes both transformed properties with @QType and copied properties without @QType)

		// Store deserialized values in hidden storage to ensure persistence
		Object.defineProperty(this, QUICK_VALUES_KEY, {
			value: {},
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
			// Skip internal __initData, __tempData, etc. but NOT QUICK_PROPERTY_KEYS storage keys
			if (key.startsWith('__') && !key.startsWith(QUICK_PROPERTY_KEYS)) {
				continue;
			}

			// Skip methods
			if (
				typeof (deserialized as Record<string, unknown>)[key] ===
				'function'
			) {
				continue;
			}

			const value = (deserialized as Record<string, unknown>)[key];

			// Determine storage key - don't duplicate QUICK_PROPERTY_KEYS prefix
			let storageKey: string;
			let propertyKey: string;

			if (key.startsWith(QUICK_PROPERTY_KEYS)) {
				// Key is already a storage key, use as-is
				storageKey = key;
				// Extract property name by removing prefix
				propertyKey = key.slice(QUICK_PROPERTY_KEYS.length);
			} else {
				// Regular property, add prefix for storage
				storageKey = `${QUICK_PROPERTY_KEYS}${key}`;
				propertyKey = key;
			}

			(this as Record<string, unknown>)[storageKey] = value;
			// Store in backup
			this[QUICK_VALUES_KEY][propertyKey] = value;
		}

		// Install lazy getters only for actual property names (not storage keys)
		const propertyNames = new Set(
			Array.from(allKeys).filter(
				(k) => !k.startsWith(QUICK_PROPERTY_KEYS)
			)
		);

		// Add keys from @Quick metadata to ensure smart setters work even for empty/missing properties
		const typeMap = Reflect.getMetadata(
			QUICK_TYPE_MAP_KEY,
			this.constructor
		);
		if (typeMap) {
			Object.keys(typeMap).forEach((key) => propertyNames.add(key));
		}

		// Add keys from @QType metadata
		const qTypes = Reflect.getMetadata(
			QTYPES_METADATA_KEY,
			this.constructor.prototype
		);
		if (Array.isArray(qTypes)) {
			qTypes.forEach((key) => propertyNames.add(String(key)));
		}

		this.installLazyGetters(Array.from(propertyNames));

		// Remove temporary property
		Reflect.deleteProperty(this, '__tempData');
	}

	/**
	 * INTERNAL: Handles TypeScript/ES2022 class initialization order.
	 *
	 * When using `class User extends QModel { name = 'Default' }`, the property initializer
	 * runs AFTER super() (QModel constructor), overwriting the deserialized value.
	 *
	 * This method is called by the `@Quick` decorator wrapper to restore values from the
	 * backup storage, effectively making "input data wins over default initializers".
	 *
	 * @internal
	 */
	public __forceHydration(): void {
		// Only run if we have backup values
		if (!this[QUICK_VALUES_KEY]) return;

		for (const key of Object.keys(this[QUICK_VALUES_KEY])) {
			// Compare current value (might be default) with backup (deserialized data)
			// ACCESS DIRECTLY VIA PROPERTY NAME to check effective value (handles getters/shadowed props)
			const currentValue = (this as Record<string, unknown>)[key];
			const backupValue = this[QUICK_VALUES_KEY][key];

			// If different, likely overwritten by default initializer
			if (currentValue !== backupValue) {
				// Restore from backup (triggers setter which updates storage)
				(this as Record<string, unknown>)[key] = backupValue;
			}
		}
	}

	/**
	 * Installs getters that retrieve values from backup storage if overwritten by Bun/compiler.
	 */
	private installLazyGetters(keys: string[]): void {
		for (const key of keys) {
			// 1. Check for existing own property descriptor (e.g. from @QType handled manually)
			const ownDescriptor = Object.getOwnPropertyDescriptor(this, key);
			if (ownDescriptor && ownDescriptor.get) {
				continue;
			}

			// 2. Check prototype chain for user-defined accessors
			let proto = Object.getPrototypeOf(this);
			let hasAccessor = false;
			while (proto && proto !== Object.prototype) {
				const desc = Object.getOwnPropertyDescriptor(proto, key);
				if (desc && (desc.get || desc.set)) {
					// Check if this accessor was generated by QType
					const isGenerated = Reflect.getMetadata(
						'qtype:generated',
						proto,
						key
					);

					// Only consider it a "user accessor" if it wasn't generated by QType
					if (!isGenerated) {
						hasAccessor = true;
						break;
					}
				}
				proto = Object.getPrototypeOf(proto);
			}

			// If user defined a custom getter/setter, do NOT install smart setter
			if (hasAccessor) {
				continue;
			}

			const storageKey = `${QUICK_PROPERTY_KEYS}${key}`;

			// Define getter that searches in multiple locations
			Object.defineProperty(this, key, {
				get(this: Record<string, unknown>) {
					// 1. Try from specific storage (check existence, not just undefined value)
					if (
						Object.prototype.hasOwnProperty.call(this, storageKey)
					) {
						return this[storageKey];
					}

					// 2. Search in backup
					const val = (
						this as unknown as Record<
							string,
							Record<string, unknown>
						>
					)[QUICK_VALUES_KEY]?.[key];
					if (val !== undefined) return val;

					// 3. Return undefined
					return undefined;
				},
				set(this: any, value: unknown) {
					// SMART SETTER IMPLEMENTATION
					// Attempt to auto-transform the value if a transformer exists
					// and the value is not already of the correct type.

					try {
						let spec: unknown = null;

						// 1. Try @QType metadata first (Higher specificity)
						// Check native field type (e.g. 'date', 'bigint', 'set')
						const fieldType = Reflect.getMetadata(
							'fieldType',
							this,
							key
						);

						// Check array element type
						const arrayElementClass = Reflect.getMetadata(
							'arrayElementClass',
							this,
							key
						);

						// Check design:type (Array or Class)
						const designType = Reflect.getMetadata(
							'design:type',
							this,
							key
						);

						if (fieldType && fieldType !== 'array') {
							// Use explicit field type (e.g. 'date')
							spec = fieldType;
						} else if (arrayElementClass) {
							// It has an element class, check if it's an array or single nested
							if (fieldType === 'array' || designType === Array) {
								// It is an array of [Element]
								spec = [arrayElementClass];
							} else {
								// It is a single nested model
								spec = arrayElementClass;
							}
						}

						// 2. Fallback to @Quick map (Class-level configuration)
						if (!spec) {
							const constructor = this.constructor;
							const typeMap = Reflect.getMetadata(
								QUICK_TYPE_MAP_KEY,
								constructor
							);
							if (typeMap && typeMap[key]) {
								spec = typeMap[key];
							}
						}

						// 3. Apply transformation if spec found
						if (spec) {
							// Access the private static deserializer instance
							// We cast QModel to any to access the private property
							const deserializer = (QModel as any).deserializer;

							if (
								deserializer &&
								typeof deserializer.transformValue ===
									'function'
							) {
								const transformed = deserializer.transformValue(
									value,
									key,
									spec
								);

								// STRICT MODE CHECK
								const constructor = this.constructor;
								const options = Reflect.getMetadata(
									QUICK_OPTIONS_KEY,
									constructor
								);

								if (options?.strict) {
									// Check for Invalid Date
									if (
										transformed instanceof Date &&
										isNaN(transformed.getTime())
									) {
										throw new Error(
											`Strict Mode: Property '${key}' received invalid Date value`
										);
									}

									// Future: Add more strict checks (e.g. if BigInt fails silently?)
								}

								this[storageKey] = transformed;
								return;
							}
						}
					} catch (e) {
						// STRICT MODE: Rethrow validation errors
						const constructor = this.constructor;
						const options = Reflect.getMetadata(
							QUICK_OPTIONS_KEY,
							constructor
						);

						if (options?.strict) {
							throw e;
						}

						// If transformation fails, fall back to raw assignment
						// We don't want to break the app if a partial string is typed
					}

					// Fallback: Raw assignment
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
	 * @returns The IQSerialized version of the instance (complex types converted to primitives/plain objects)
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', createdAt: new Date() });
	 * const data = user.serialize();
	 * // { id: '1', name: 'John', createdAt: '2024-01-01T00:00:00.000Z' }
	 * ```
	 */
	serialize(
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): IQSerializedInterface<TInterface> {
		type ModelAsRecord = Record<string, unknown>;
		return QModel.serializer.serialize(
			this as unknown as ModelAsRecord,
			seen,
			options
		) as IQSerializedInterface<TInterface>;
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
	toJSON(_key?: string, options?: IQSerializationOptions): string {
		type ModelAsRecord = Record<string, unknown>;
		return QModel.serializer.serializeToJson(
			this as unknown as ModelAsRecord,
			options
		);
	}

	/**
	 * Validates the model instance against defined transformers.
	 *
	 * Checks each property that has a transformer with validation logic.
	 *
	 * @returns Array of validation errors (empty if valid)
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ email: 'invalid-email' });
	 * const errors = user.validate();
	 * if (errors.length > 0) {
	 *   console.error('Validation failed:', errors);
	 * }
	 * ```
	 */
	validate(): IQValidationResult[] {
		type ModelAsRecord = Record<string, unknown>;
		return QModel.validation.validate(this as unknown as ModelAsRecord);
	}

	/**
	 * Creates a model instance from a plain interface object.
	 *
	 * Deserializes a plain JavaScript object into a fully typed model instance,
	 * applying all type transformations (string → Date, string → BigInt, etc.)
	 * according to the `@QType` decorators defined in the model.
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
	static deserialize<T extends QModel<IQAnyRecord>>(
		this: new (data: IQModelData<IQAnyRecord>) => T,
		data: IQModelData<IQAnyRecord>
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
	static fromJSON<T extends QModel<IQAnyRecord>>(
		this: new (data: IQModelData<IQAnyRecord>) => T,
		json: string
	): T {
		return QModel.deserializer.deserializeFromJson(json, this);
	}

	/**
	 * Converts the current state to interface format (preserving original input types).
	 *
	 * **IMPORTANT:** This does NOT serialize to JSON. It preserves the EXACT format from constructor input.
	 *
	 * **Key differences:**
	 * - `toInterface()` → Preserves ORIGINAL input format (string stays string, RegExp stays RegExp)
	 * - `serialize()` → Converts to JSON-compatible format (Date → ISO string, RegExp → object, etc.)
	 * - `toJSON()` → Same as serialize() but returns JSON string
	 *
	 * **How it works:**
	 * - Reads `__initData` (stored BEFORE transformations)
	 * - Compares original type vs current type
	 * - Returns value in ORIGINAL format:
	 *   - If input was string `'2024-01-01'` → returns string (NOT Date object)
	 *   - If input was string `'999999'` → returns string (NOT bigint)
	 *   - If input was RegExp `/test/` → returns RegExp (NOT string)
	 *   - If input was string `'^test$'` → returns string (NOT RegExp)
	 *
	 * **Use cases:**
	 * - Change detection: `model.toInterface() vs model.getInitInterface()`
	 * - Form reset: restore original values
	 * - API responses: return data in same format as received
	 * - State comparison: check modifications
	 *
	 * @returns Object with current values in ORIGINAL input format (NOT JSON IQSerialized)
	 *
	 * @example
	 * **Example 1: Date as string input**
	 * ```typescript
	 * const user = new User({
	 *   createdAt: '2024-01-01T00:00:00.000Z'  // String input
	 * });
	 *
	 * user.createdAt;        // Date object (transformed)
	 * user.toInterface();    // { createdAt: '2024-01-01T00:00:00.000Z' } - STRING preserved
	 * user.serialize();      // { createdAt: '2024-01-01T00:00:00.000Z' } - ISO string
	 * ```
	 *
	 * @example
	 * **Example 2: BigInt as string input**
	 * ```typescript
	 * const account = new Account({
	 *   balance: '999999999999999'  // String input
	 * });
	 *
	 * account.balance;       // 999999999999999n (bigint transformed)
	 * account.toInterface(); // { balance: '999999999999999' } - STRING preserved
	 * account.serialize();   // { balance: '999999999999999' } - string for JSON
	 * ```
	 *
	 * @example
	 * **Example 3: RegExp input formats**
	 * ```typescript
	 * // Case A: String pattern input
	 * const model1 = new Model({ pattern: '^test$' });
	 * model1.pattern;        // /^test$/ (RegExp transformed)
	 * model1.toInterface();  // { pattern: '^test$' } - STRING preserved
	 *
	 * // Case B: RegExp object input
	 * const model2 = new Model({ pattern: /^test$/ });
	 * model2.pattern;        // /^test$/ (RegExp)
	 * model2.toInterface();  // { pattern: /^test$/ } - REGEXP preserved
	 * ```
	 */
	toInterface(seen?: WeakSet<object>, depth?: number): TInterface {
		return QModel.toInterfaceService.toInterface<TInterface>(
			this as unknown as Record<string, unknown>,
			seen,
			depth
		);
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
	getInitInterface(): IQSerializedInterface<TInterface> {
		return { ...(this.__initData as IQSerializedInterface<TInterface>) };
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
	getChanges(): Partial<IQSerializedInterface<TInterface>> {
		const current = this.toInterface();
		const initial = this.getInitInterface();
		const changes: Partial<IQSerializedInterface<TInterface>> = {};

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
		const Constructor = this.constructor as unknown as IModelConstructor<
			QModel<TInterface>
		>;
		const restored = Constructor.deserialize(initial);

		// Copy all properties from restored instance
		for (const key of Object.keys(restored)) {
			(this as unknown as IQAnyRecord)[key] = (
				restored as unknown as IQAnyRecord
			)[key];
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
	patch(patch: Partial<IQModelData<TInterface>>): void {
		const Constructor = this.constructor as unknown as IModelConstructor<
			QModel<TInterface>
		>;
		const current = this.serialize();
		const merged = { ...current, ...patch };
		const updated = Constructor.deserialize(merged);

		// Copy all properties from updated instance
		for (const key of Object.keys(updated)) {
			(this as unknown as IQAnyRecord)[key] = (
				updated as unknown as IQAnyRecord
			)[key];
		}
	}

	/**
	 * Deep equality comparison for change detection.
	 *
	 * @private
	 */
	private deepEqual(a: unknown, b: unknown): boolean {
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

			return keysA.every((key) =>
				this.deepEqual(
					(a as Record<string, unknown>)[key],
					(b as Record<string, unknown>)[key]
				)
			);
		}

		return false;
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
	 * ```
	 */
	clone(): this {
		const Constructor = this
			.constructor as unknown as IModelConstructor<this>;
		return Constructor.deserialize(this.serialize());
	}
}

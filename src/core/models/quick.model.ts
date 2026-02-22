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
import { IntegrityService } from '@/core/services/integrity.service';
import { QMockBuilder } from '@/core/services/mock-builder.service';
import type {
	IQModelInstance,
	IQModelInterface,
} from '@/core/interfaces/mock-types.interface';
import type {
	IQSerializedInterface,
	IQModelData,
} from '@/core/interfaces/serialization-types.interface';
import type { IQIntegrityResult } from '@/core/interfaces/transformer.interface';
import type {
	IQAnyRecord,
	IModelConstructor,
} from '@/core/interfaces/model.interface';
import { QTYPES_METADATA_KEY } from '@/core/decorators/qtype.decorator';
import type {
	IQRulesResult,
	IQRulesAsyncOptions,
} from '@/core/decorators/qrule.decorator';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import {
	QFIELD_METADATA_KEY,
	QFIELD_FIELDS_KEY,
} from '@/core/decorators/qfield.decorator';
import type {
	IQFieldMeta,
	IQFormSchemaEntry,
} from '@/core/decorators/qfield.decorator';
import {
	QALIAS_METADATA_KEY,
	QALIAS_FIELDS_KEY,
} from '@/core/decorators/qalias.decorator';
import { QGROUP_METADATA_KEY } from '@/core/decorators/qgroup.decorator';
import type { IQFormSchemaGroup } from '@/core/decorators/qgroup.decorator';
import {
	QUICK_VALUES_KEY,
	QUICK_PROPERTY_KEYS,
	QUICK_TYPE_MAP_KEY,
	QUICK_OPTIONS_KEY,
	FORCE_HYDRATION_KEY,
} from '../constants/metadata-keys';
import { deepFreeze } from '@/core/helpers/transform-helpers';
import { QConfig } from '@/core/config/quick.config';
import type { IQAdvancedOptions } from '@/core/interfaces/quick-options.interface';

/**
 * Combined validation report from both `checkIntegrity()` and `checkRules()`.
 * Returned by {@link QModel.validationReport}.
 */
export interface IQValidationReport {
	/**
	 * `true` when both integrity checks and all `@QRule` predicates pass.
	 * Equivalent to `checkIntegrity().length === 0 && checkRules().valid`.
	 */
	valid: boolean;
	/** Results from transformer-level integrity checks. Empty array = all pass. */
	integrity: IQIntegrityResult[];
	/** Results from `@QRule` business-logic predicates. */
	rules: IQRulesResult;
}

// Internal exports only (QType is implementation detail)
// Public API uses only @Quick() decorator
export { Quick } from '@/core/decorators/quick.decorator';
export type { IQImplements } from '@/core/interfaces/model.interface';

/**
 * Options accepted by {@link QModel.createMany}.
 */
export interface IQCreateManyOptions {
	/**
	 * When `true`, instances that fail validation are also included in `instances[]`
	 * (in addition to being in `errors[]`).
	 *
	 * Default: `false` — invalid instances are excluded from `instances[]`.
	 */
	includeErrorInstances?: boolean;
}

/**
 * A single validation error entry produced by {@link QModel.createMany}.
 */
export interface IQCreateManyError<TInstance> {
	/** Zero-based position in the original input array. */
	index: number;
	/** The model instance that failed validation. */
	instance: TInstance;
	/**
	 * Combined list of failures for this instance.
	 * - `field` and `value` are present for `@QRule` failures.
	 * - Integrity failures only provide `message`.
	 */
	errors: Array<{ field?: string; message: string; value?: unknown }>;
}

/**
 * Return type of {@link QModel.createMany}.
 */
export interface IQCreateManyResult<TInstance> {
	/**
	 * Successfully validated instances.
	 * When `includeErrorInstances: true`, failed instances are also included here.
	 */
	instances: TInstance[];
	/** Entries for every instance that failed `isValid()`. */
	errors: Array<IQCreateManyError<TInstance>>;
}

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
	private static readonly validation = new IntegrityService();

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
	 * Use `declare` in your class to inform TypeScript of transformed runtime types.
	 * Works identically to `new ModelClass(data)`.
	 *
	 * @param data - Data matching the model interface
	 * @returns Model instance with type-safe property access
	 *
	 * @example
	 * ```typescript
	 * interface IPost {
	 *   id: number;
	 *   title: string;
	 *   createdAt: string; // Backend sends ISO string
	 * }
	 *
	 * @Quick({ createdAt: Date })
	 * class Post extends QModel<IPost> {
	 *   declare id: number;
	 *   declare title: string;
	 *   declare createdAt: Date; // Runtime type after transformation
	 * }
	 *
	 * const post = Post.create({ id: 1, title: 'Hello', createdAt: '2026-01-10T00:00:00.000Z' });
	 * post.createdAt instanceof Date; // true
	 * ```
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
		TClass extends object = object,
		TResult = TClass,
	>(this: new (...args: any[]) => TClass, data: T): Readonly<TResult> {
		// Instantiate directly using the logic from create() to avoid abstract type issues
		const Constructor = this as unknown as new (data: T) => TClass;
		const instance = new Constructor(data) as unknown as TResult;

		// Check performance config
		const localOptions = Reflect.getMetadata(
			QUICK_OPTIONS_KEY,
			Constructor
		) as IQAdvancedOptions;
		const globalOptions = QConfig.get().defaults;
		const disableSafetyChecks =
			localOptions?.performance?.disableSafetyChecks ??
			globalOptions?.performance?.disableSafetyChecks ??
			false;

		if (disableSafetyChecks) {
			return instance as unknown as Readonly<TResult>;
		}

		return deepFreeze(instance) as unknown as Readonly<TResult>;
	}

	/**
	 * Creates multiple model instances from an array of plain objects.
	 *
	 * All items are processed regardless of validation failures — no fail-fast.
	 * Items that fail `isValid()` (integrity checks or `@QRule` violations) are
	 * collected in `errors[]` and **excluded** from `instances[]` by default.
	 *
	 * @param data - Array of plain objects to deserialize
	 * @param options - Optional configuration
	 * @returns `{ instances, errors }` — see {@link IQCreateManyResult}
	 *
	 * @example
	 * ```typescript
	 * const { instances, errors } = UserModel.createMany(rawList);
	 * // errors[n].index   — position in original array
	 * // errors[n].instance — the (invalid) model instance
	 * // errors[n].errors  — combined integrity + rule failures
	 *
	 * // Include invalid instances in the result too:
	 * const { instances } = UserModel.createMany(rawList, { includeErrorInstances: true });
	 * ```
	 */
	static createMany<
		TClass extends QModel<any>,
		TInterface = TClass extends QModel<infer I> ? I : never,
		TResult = TClass,
	>(
		this: new (data: any) => TClass,
		data: NoInfer<TInterface>[],
		options?: IQCreateManyOptions
	): IQCreateManyResult<TResult>;

	static createMany(
		this: any,
		data: any[],
		options?: IQCreateManyOptions
	): IQCreateManyResult<any> {
		const includeErrorInstances = options?.includeErrorInstances ?? false;
		const instances: any[] = [];
		const errors: Array<IQCreateManyError<any>> = [];

		for (let idx = 0; idx < data.length; idx++) {
			const Constructor = this;
			const instance = new Constructor(data[idx]);

			if (instance.isValid()) {
				instances.push(instance);
			} else {
				// Collect all failures
				const integrityErrors = instance
					.checkIntegrity()
					.map((result: IQIntegrityResult) => ({
						message: result.error ?? 'Integrity check failed',
					}));
				const ruleErrors = instance.checkRules().errors;

				errors.push({
					index: idx,
					instance,
					errors: [...integrityErrors, ...ruleErrors],
				});

				if (includeErrorInstances) {
					instances.push(instance);
				}
			}
		}

		return { instances, errors };
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
		type IThisClass = T;
		type ILocalInstanceType = IThisClass extends abstract new (
			...args: unknown[]
		) => infer R
			? R
			: never;

		const ModelClass: new (data: any) => ILocalInstanceType =
			this as unknown as IModelConstructor<ILocalInstanceType>;

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

		// Walk the FULL prototype chain so fields from ancestor classes are included.
		// Reflect.getOwnMetadata (not getMetadata) is used to avoid re-reading inherited
		// metadata arrays — we want each level's own list and merge them manually.
		const allFieldNames = new Set<string>();
		let proto = this.prototype;
		while (proto && proto !== Object.prototype) {
			const qtypes = Reflect.getOwnMetadata(
				QTYPES_METADATA_KEY,
				proto
			) as Array<string | symbol> | undefined;
			if (Array.isArray(qtypes)) {
				for (const key of qtypes) {
					allFieldNames.add(String(key));
				}
			}
			proto = Object.getPrototypeOf(proto);
		}

		for (const fieldName of allFieldNames) {
			// Resolve metadata from the most-derived class first (closest override wins).
			const fieldType = Reflect.getMetadata(
				'fieldType',
				this.prototype,
				fieldName
			);
			const arrayElementClass = Reflect.getMetadata(
				'arrayElementClass',
				this.prototype,
				fieldName
			);
			const customTransformer = Reflect.getMetadata(
				'customTransformer',
				this.prototype,
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

			result.set(fieldName, { type, transformer });
		}

		return result;
	}

	/**
	 * Mixin factory that injects full QModel functionality into a class that must extend
	 * an **external** (third-party / framework) base class.
	 *
	 * Use this when you cannot extend `QModel` directly because you already need to extend
	 * another class (e.g. an Angular component, a NestJS entity, a custom base).
	 *
	 * The returned class:
	 * - Extends `ExternalBase` (prototype chain intact: `instance instanceof ExternalBase === true`)
	 * - Exposes all static QModel methods: `create()`, `createReadonly()`, `mock()`,
	 *   `getMetadata()`, `deserialize()`, `deserializeJson()`
	 * - Exposes all instance QModel methods: `serialize()`, `toJSON()`, `toInterface()`,
	 *   `isDirty()`, `getDirtyFields()`, `reset()`, `patch()`, `merge()`
	 * - Works with `@Quick` and `@QType` decorators on the derived class
	 * - Is NOT an `instanceof QModel` (different prototype chain — this is expected)
	 *
	 * Pass a **single** `TRuntime` generic describing the expected instance type:
	 * - For an external base with no field-type changes: pass the class directly.
	 * - To change the type of inherited fields: compose with {@link IQImplements}.
	 *
	 * @template TRuntime - The instance type of the resulting mixin. Use the external base class
	 *   directly when there are no field overrides, or `IQImplements<Base, { field: NewType }>`
	 *   to change the type of specific inherited fields.
	 * @param ExternalBase - The external class to extend
	 * @returns A mixin base class ready to be extended
	 *
	 * @example
	 * Basic usage — external base, no field overrides
	 * ```typescript
	 * class NgComponent { ngOnInit(): void {} }
	 *
	 * @Quick({ createdAt: Date })
	 * class UserModel extends QModel.extends<NgComponent>(NgComponent) {
	 *   declare name: string;
	 *   declare createdAt: Date;
	 * }
	 * instance.ngOnInit(); // ✅ TypeScript knows about NgComponent methods
	 * ```
	 *
	 * @example
	 * Overriding inherited field types with {@link IQImplements}
	 * ```typescript
	 * @Quick({ value: Date })
	 * class BaseModel extends QModel<any> { declare value: Date; }
	 *
	 * @Quick({ value: BigInt })
	 * class Derived extends QModel.extends<IQImplements<BaseModel, { value: bigint }>>(BaseModel) {
	 *   declare value: bigint; // ✅ no conflict — value: Date removed from intersection
	 * }
	 * ```
	 */
	static extends<TRuntime extends object = object>(
		ExternalBase: new (...args: any[]) => any
	): typeof QModel<IQAnyRecord> &
		(abstract new (...args: any[]) => TRuntime & QModel<IQAnyRecord>) {
		// ── 1. Create the mixin class that extends the external base ────────────
		// TypeScript does not allow `class Foo extends GenericTypeParam` when the
		// type param is introduced at the method level. The idiomatic workaround is
		// a locally-scoped generic helper function whose parameter IS the concrete
		// constructor — the compiler can then verify the relationship at each call-site.
		const makeMixed = <T extends new (...args: any[]) => any>(Base: T) => {
			class QModelMixed extends Base {
				constructor(...args: any[]) {
					// Call external base with no args — QModel hydration fills all fields
					super();
					const data = args[0];
					Object.defineProperty(this, '__tempData', {
						value: data,
						writable: false,
						enumerable: false,
						configurable: true,
					});
					// Delegate to QModel's initialization logic (declared `protected`)
					(QModel.prototype as any)['initialize'].call(this);
				}
			}
			return QModelMixed;
		};
		const QModelMixed = makeMixed(ExternalBase);

		// ── 2. Copy all INSTANCE methods from QModel.prototype ─────────────────
		// This includes: serialize, toJSON, toInterface, isDirty, reset, patch, merge,
		// getMetadata (instance), initialize, installLazyGetters, hasAccessor, etc.
		for (const name of Object.getOwnPropertyNames(QModel.prototype)) {
			if (name === 'constructor') continue;
			const descriptor = Object.getOwnPropertyDescriptor(
				QModel.prototype,
				name
			);
			if (descriptor) {
				Object.defineProperty(QModelMixed.prototype, name, descriptor);
			}
		}

		// Also copy the QUICK_VALUES_KEY property definition from QModel.prototype
		// (it is a prototype-level property defined as a class field in legacy TS mode)
		const quickValuesDescriptor = Object.getOwnPropertyDescriptor(
			QModel.prototype,
			QUICK_VALUES_KEY
		);
		if (quickValuesDescriptor) {
			Object.defineProperty(
				QModelMixed.prototype,
				QUICK_VALUES_KEY,
				quickValuesDescriptor
			);
		}

		// ── 3. Copy all STATIC methods from QModel ─────────────────────────────
		const staticsToCopy = [
			'create',
			'createReadonly',
			'mock',
			'getMetadata',
			'deserialize',
			'deserializeJson',
		] as const;
		for (const name of staticsToCopy) {
			const descriptor = Object.getOwnPropertyDescriptor(QModel, name);
			if (descriptor) {
				Object.defineProperty(QModelMixed, name, descriptor);
			}
		}

		return QModelMixed as unknown as typeof QModel<IQAnyRecord> &
			(abstract new (...args: any[]) => TRuntime & QModel<IQAnyRecord>);
	}

	/**
	 * Instance alias for static getMetadata.
	 * Useful for inspecting model state and configuration from an instance.
	 *
	 * Includes Dynamic Auto-discovery: Returns both statically defined fields AND
	 * instance-specific fields found on this object (e.g. declare properties without decorators).
	 *
	 * @see {@link QModel.getMetadata}
	 */
	public getMetadata(): Map<string, { type: string; transformer: unknown }> {
		// Start with static metadata (schema definition)
		const metadata = (this.constructor as any).getMetadata();

		// Merge with instance keys (dynamic data discovery)
		// This provides "what arrived" validation without permanently polluting the class schema
		const keys = Object.keys(this);
		for (const key of keys) {
			if (!key.startsWith('__') && !metadata.has(key)) {
				// Register discovered key as unknown/Object to indicate presence
				// We don't assume type to avoid misleading info, just presence
				metadata.set(key, { type: 'Object', transformer: undefined });
			}
		}

		return metadata;
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

		// @QAlias: remap aliased input keys → property keys before processing
		const _aliasMap = QModel._getAliasMap(
			this.constructor.prototype as object
		);
		const workData: Record<string, unknown> = {};
		for (const key in data) {
			if (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			)
				continue;
			workData[key] = (data as Record<string, unknown>)[key];
		}
		if (_aliasMap.size > 0) {
			for (const [prop, alias] of _aliasMap) {
				if (alias in workData) {
					workData[prop] = workData[alias];
					delete workData[alias];
				}
			}
		}

		// Store ORIGINAL data (before transformations) for format preservation in toInterface()
		// IMPORTANT: Must be done BEFORE deserialization to preserve original types
		const initDataClone: Record<string, unknown> = {};
		for (const key in workData) {
			// SECURITY: Prevent Prototype Pollution
			if (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			) {
				continue;
			}

			const value = workData[key];
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
		type IDataAsInterface = Record<string, unknown>;
		type IThisConstructor = new (data: IDataAsInterface) => this;
		const deserialized = QModel.deserializer.deserialize(
			workData as unknown as IDataAsInterface,
			this.constructor as IThisConstructor
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

			// Check for custom accessor (Backing Field Pattern support)
			if (this.hasAccessor(key)) {
				// Use public assignment to trigger the custom setter
				(this as any)[key] = value;
				// Remove from allKeys so it's not picked up for lazy getter installation
				allKeys.delete(key);
				continue;
			}

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
				(key) => !key.startsWith(QUICK_PROPERTY_KEYS)
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
	 * **INTERNAL LIFECYCLE METHOD**
	 *
	 * Handles a specific quirk of TypeScript/ES2022 class initialization order where
	 * property initializers (e.g. `name = 'Default'`) run **after** the `super()` constructor calls.
	 *
	 * This behavior effectively overwrites any data deserialized in the parent `QModel` constructor.
	 * This method is called by the `@Quick` decorator wrapper immediately after the subclass
	 * has finished initializing, to "re-apply" the correct deserialized values from the backup storage.
	 *
	 * Uses a `Symbol` key to remain hidden from the public API and autocompletion.
	 *
	 * @internal
	 */
	public [FORCE_HYDRATION_KEY](): void {
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
	 * Checks if a property has a custom accessor (getter/setter) on the prototype chain.
	 */
	private hasAccessor(key: string): boolean {
		let current = Object.getPrototypeOf(this);
		while (current && current !== Object.prototype) {
			const descriptor = Object.getOwnPropertyDescriptor(current, key);
			if (descriptor && (descriptor.get || descriptor.set)) {
				const isGenerated = Reflect.getMetadata(
					'qtype:generated',
					current,
					key
				);
				if (!isGenerated) return true;
			}
			current = Object.getPrototypeOf(current);
		}
		return false;
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
					} catch (err) {
						// STRICT MODE: Rethrow validation errors
						const constructor = this.constructor;
						const options = Reflect.getMetadata(
							QUICK_OPTIONS_KEY,
							constructor
						);

						if (options?.strict) {
							throw err;
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
	/**
	 * Returns a plain snapshot of the current runtime state.
	 *
	 * Unlike `serialize()`, complex types are NOT converted to JSON-safe primitives:
	 * `Date` stays `Date`, `bigint` stays `bigint`, `Map` stays `Map`, etc.
	 *
	 * Unlike `toInterface()`, this always returns the **current transformed state**
	 * regardless of the original input format.
	 *
	 * Useful for:
	 * - In-memory logic that operates on native types
	 * - Passing data to code that understands runtime types
	 * - Debugging / inspection
	 *
	 * @returns Plain `Record<string, unknown>` with current runtime values
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ createdAt: '2024-01-01T00:00:00.000Z', balance: '999' });
	 * const plain = user.toPlain();
	 * plain.createdAt instanceof Date; // true
	 * typeof plain.balance === 'bigint'; // true
	 * ```
	 */
	toPlain(): Record<string, unknown> {
		// Use QUICK_VALUES_KEY for the list of known keys, but read each via the
		// property getter so that mutations made after construction are reflected
		// (the setter updates storageKey, not the backup store directly).
		const keys = Object.keys(this[QUICK_VALUES_KEY]);
		const result: Record<string, unknown> = {};
		for (const key of keys) {
			result[key] = (this as Record<string, unknown>)[key];
		}
		return result;
	}

	serialize(
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): IQSerializedInterface<TInterface> {
		type IModelAsRecord = Record<string, unknown>;
		const rawResult = QModel.serializer.serialize(
			this as unknown as IModelAsRecord,
			seen,
			options
		);

		// @QAlias: remap property keys → alias keys in output
		const _aliasMap = QModel._getAliasMap(
			this.constructor.prototype as object
		);
		let result: Record<string, unknown> = rawResult;
		if (_aliasMap.size > 0) {
			result = { ...rawResult };
			for (const [prop, alias] of _aliasMap) {
				if (prop in result) {
					result[alias] = result[prop];
					delete result[prop];
				}
			}
		}

		// pick takes precedence over omit
		if (options?.pick) {
			const filtered = {} as IQSerializedInterface<TInterface>;
			for (const key of options.pick) {
				if (key in result) {
					(filtered as Record<string, unknown>)[key] = result[key];
				}
			}
			return filtered;
		}

		if (options?.omit && options.omit.length > 0) {
			const filtered: Record<string, unknown> = { ...result };
			for (const key of options.omit) {
				delete filtered[key];
			}
			return filtered as IQSerializedInterface<TInterface>;
		}

		return result as IQSerializedInterface<TInterface>;
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
		// Delegate to serialize() so @QAlias remapping is applied before JSON encoding
		return JSON.stringify(this.serialize(undefined, options));
	}

	/**
	 * Checks the model instance for type integrity.
	 *
	 * Runs each property through its transformer's integrity check (e.g.
	 * valid Date range, safe RegExp, BigInt size limits).
	 *
	 * @returns Array of integrity errors (empty if all pass)
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ email: 'invalid-email' });
	 * const errors = user.checkIntegrity();
	 * if (errors.length > 0) {
	 *   console.error('Integrity check failed:', errors);
	 * }
	 * ```
	 */
	checkIntegrity(): IQIntegrityResult[] {
		type IModelAsRecord = Record<string, unknown>;
		return QModel.validation.checkIntegrity(
			this as unknown as IModelAsRecord
		);
	}

	/**
	 * Evaluates all `@QRule` business-logic rules defined on this model's properties.
	 *
	 * Unlike `checkIntegrity()` (transformer-level type safety), `checkRules()` checks
	 * user-defined predicates — e.g. length constraints, format validation, business invariants.
	 *
	 * **All failing rules are collected** (no fail-fast). Multiple `@QRule` decorators
	 * on the same property are all evaluated.
	 *
	 * The `message` in each error is already resolved: if the rule was declared with a
	 * `() => string` lazy resolver, it is called at this point — perfect for runtime i18n.
	 * For Angular, you can also store i18n keys as plain strings and apply `e.message | translate`
	 * directly in the template.
	 *
	 * @returns `{ valid: boolean, errors: Array<{ field, message, value }> }`
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ name: 'Jo', age: -1, email: 'notanemail' });
	 * const result = user.checkRules();
	 *
	 * console.log(result.valid); // false
	 * console.log(result.errors);
	 * // [
	 * //   { field: 'name',  message: 'Name must be at least 3 characters', value: 'Jo' },
	 * //   { field: 'age',   message: 'Age cannot be negative',             value: -1 },
	 * //   { field: 'email', message: 'Must be a valid email',              value: 'notanemail' }
	 * // ]
	 * ```
	 */
	checkRules(): IQRulesResult {
		return qCheckRules(this);
	}

	/**
	 * Returns `true` if all transformer-level integrity checks pass.
	 *
	 * Shortcut for `checkIntegrity().length === 0`.
	 *
	 * @returns `true` when every field value matches its declared transformer type
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ age: 30, active: true });
	 * if (!user.hasIntegrity()) {
	 *   console.error('Type integrity violated');
	 * }
	 * ```
	 */
	hasIntegrity(): boolean {
		return this.checkIntegrity().length === 0;
	}

	/**
	 * Returns `true` if both transformer-level integrity checks **and** all `@QRule`
	 * business-logic rules pass.
	 *
	 * Equivalent to `hasIntegrity() && checkRules().valid`.
	 *
	 * Use this as a single boolean gate before persisting or processing a model.
	 *
	 * @returns `true` when the instance has full type integrity and all rules are satisfied
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ name: 'Alice', age: 30, email: 'alice@example.com' });
	 * if (!user.isValid()) {
	 *   const integrityErrors = user.checkIntegrity();
	 *   const ruleErrors = user.checkRules().errors;
	 *   // handle errors...
	 * }
	 * ```
	 */
	isValid(): boolean {
		return this.hasIntegrity() && this.checkRules().valid;
	}

	/**
	 * Returns a combined validation report from both `checkIntegrity()` and `checkRules()`.
	 *
	 * Single call instead of invoking both methods separately.
	 *
	 * @returns `{ valid, integrity, rules }` — see {@link IQValidationReport}
	 *
	 * @example
	 * ```typescript
	 * const report = user.validationReport();
	 *
	 * if (!report.valid) {
	 *   // transformer-level failures:
	 *   console.log(report.integrity);
	 *   // @QRule failures:
	 *   console.log(report.rules.errors);
	 * }
	 * ```
	 */
	validationReport(): IQValidationReport {
		const integrity = this.checkIntegrity();
		const rules = this.checkRules();
		return {
			valid: integrity.length === 0 && rules.valid,
			integrity,
			rules,
		};
	}

	/**
	 * Async version of `checkRules()`. Evaluates all `@QRule` predicates, including async ones,
	 * and returns a Promise with the combined result.
	 *
	 * Sync predicates are wrapped with `Promise.resolve()`, so you can mix sync and async rules
	 * freely on the same model.
	 *
	 * **Execution modes** (`options.mode`):
	 * - `'parallel'` *(default)* — all predicates start simultaneously via `Promise.all`.
	 *   Total time ≈ `max(individual times)`. Best for independent I/O calls.
	 * - `'serial'` — predicates run one at a time in field-declaration order.
	 *   Total time ≈ `Σ(individual times)`. Useful when predicates have side-effects
	 *   or must respect a strict evaluation order.
	 *
	 * **Timeout** (`options.timeoutMs`): each predicate is individually raced against a
	 * per-call timer. Predicates that exceed the budget fail with `timedOut: true` in the
	 * error entry. A custom message can be supplied via `options.timeoutMessage`.
	 *
	 * @param options - Optional execution settings (mode, timeoutMs, timeoutMessage).
	 * @returns `Promise<IQRulesResult>`
	 *
	 * @example Basic usage
	 * ```typescript
	 * const result = await user.checkRulesAsync();
	 * if (!result.valid) console.log(result.errors);
	 * ```
	 *
	 * @example With timeout
	 * ```typescript
	 * const result = await user.checkRulesAsync({ timeoutMs: 200, timeoutMessage: 'Service unavailable' });
	 * result.errors.forEach((err) => {
	 *   if (err.timedOut) console.warn(`${err.field} timed out`);
	 * });
	 * ```
	 *
	 * @example Serial execution (e.g. check format first, then uniqueness)
	 * ```typescript
	 * const result = await user.checkRulesAsync({ mode: 'serial' });
	 * ```
	 */
	async checkRulesAsync(
		options?: IQRulesAsyncOptions
	): Promise<IQRulesResult> {
		return qCheckRulesAsync(this, options);
	}

	/**
	 * Async version of `isValid()`. Returns `true` when both integrity and async rules pass.
	 *
	 * @param options - Optional timeout and message settings forwarded to `checkRulesAsync()`.
	 * @returns `Promise<boolean>`
	 */
	async isValidAsync(options?: IQRulesAsyncOptions): Promise<boolean> {
		return (
			this.hasIntegrity() && (await this.checkRulesAsync(options)).valid
		);
	}

	/**
	 * Async version of `validationReport()`. Runs `checkIntegrity()` synchronously
	 * and `checkRulesAsync()` for async predicate support.
	 *
	 * @returns `Promise<IQValidationReport>`
	 */
	async validationReportAsync(
		options?: IQRulesAsyncOptions
	): Promise<IQValidationReport> {
		const integrity = this.checkIntegrity();
		const rules = await this.checkRulesAsync(options);
		return {
			valid: integrity.length === 0 && rules.valid,
			integrity,
			rules,
		};
	}

	/**
	 * Returns the form schema for this instance, built from `@QField` decorators.
	 * Traverses the full prototype chain to include inherited fields.
	 *
	 * @returns Ordered array of {@link IQFormSchemaEntry} — one per `@QField`-decorated property.
	 *
	 * @example
	 * ```typescript
	 * const schema = instance.getFormSchema();
	 * // [{ field: 'email', widget: 'input', label: 'Email', ... }, ...]
	 * ```
	 */
	getFormSchema(): IQFormSchemaEntry[] {
		return QModel._collectFormSchema(Object.getPrototypeOf(this));
	}

	/**
	 * Static version of `getFormSchema()` — no instance required.
	 *
	 * @returns Ordered array of {@link IQFormSchemaEntry} — one per `@QField`-decorated property.
	 *
	 * @example
	 * ```typescript
	 * const schema = ProfileModel.getFormSchema();
	 * ```
	 */
	static getFormSchema(): IQFormSchemaEntry[] {
		return QModel._collectFormSchema(this.prototype);
	}

	/**
	 * Returns the form schema grouped by `@QGroup` sections.
	 * Fields without `@QGroup` are placed in a group with `group: undefined`.
	 *
	 * @returns Ordered array of `{ group, fields }` entries.
	 *
	 * @example
	 * ```typescript
	 * ContactModel.getFormSchemaGrouped();
	 * // [
	 * //   { group: 'Personal Info', fields: [{ field: 'firstName', ... }] },
	 * //   { group: 'Address',       fields: [{ field: 'street', ... }] },
	 * //   { group: undefined,       fields: [{ field: 'bio', ... }] },
	 * // ]
	 * ```
	 */
	getFormSchemaGrouped(): IQFormSchemaGroup[] {
		return QModel._buildGrouped(
			QModel._collectFormSchema(Object.getPrototypeOf(this))
		);
	}

	/**
	 * Static version of `getFormSchemaGrouped()` — no instance required.
	 */
	static getFormSchemaGrouped(): IQFormSchemaGroup[] {
		return QModel._buildGrouped(QModel._collectFormSchema(this.prototype));
	}

	/**
	 * Internal helper: walks the prototype chain collecting `@QField` entries.
	 * @internal
	 */
	private static _collectFormSchema(startProto: object): IQFormSchemaEntry[] {
		// Collect from root → leaf so leaf overrides parent if same field name
		const chain: object[] = [];
		let proto = startProto;
		while (proto && proto !== Object.prototype) {
			chain.unshift(proto);
			proto = Object.getPrototypeOf(proto);
		}

		// Merged map: field → entry (later levels override earlier)
		const merged = new Map<string, IQFormSchemaEntry>();
		// Preserve declaration order per level
		const order: string[] = [];

		for (const char of chain) {
			const fields: string[] =
				Reflect.getMetadata(QFIELD_FIELDS_KEY, char) ?? [];
			for (const field of fields) {
				const meta: IQFieldMeta | undefined = Reflect.getMetadata(
					QFIELD_METADATA_KEY,
					char,
					field
				);
				if (meta) {
					const group: string | undefined = Reflect.getMetadata(
						QGROUP_METADATA_KEY,
						char,
						field
					);
					if (!merged.has(field)) order.push(field);
					merged.set(field, {
						field,
						...meta,
						...(group !== undefined ? { group } : {}),
					});
				}
			}
		}

		return order.map((field) => merged.get(field)!);
	}

	/**
	 * Internal helper: groups a flat schema array by `@QGroup` section.
	 * @internal
	 */
	private static _buildGrouped(
		flat: IQFormSchemaEntry[]
	): IQFormSchemaGroup[] {
		if (flat.length === 0) return [];

		const groupOrder: Array<string | undefined> = [];
		const groupMap = new Map<string | undefined, IQFormSchemaEntry[]>();

		for (const entry of flat) {
			const group = (entry as Record<string, unknown>).group as
				| string
				| undefined;
			if (!groupMap.has(group)) {
				groupMap.set(group, []);
				groupOrder.push(group);
			}
			groupMap.get(group)!.push(entry);
		}

		return groupOrder.map((groupKey) => ({
			group: groupKey,
			fields: groupMap.get(groupKey)!,
		}));
	}

	/**
	 * Internal helper: builds a Map of propertyName → alias by walking the prototype chain.
	 * @internal
	 */
	private static _getAliasMap(startProto: object): Map<string, string> {
		const map = new Map<string, string>();
		let proto = startProto;
		while (proto && proto !== Object.prototype) {
			const fields: string[] =
				Reflect.getMetadata(QALIAS_FIELDS_KEY, proto) ?? [];
			for (const field of fields) {
				if (!map.has(field)) {
					const alias = Reflect.getMetadata(
						QALIAS_METADATA_KEY,
						proto,
						field
					) as string | undefined;
					if (alias) map.set(field, alias);
				}
			}
			proto = Object.getPrototypeOf(proto);
		}
		return map;
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
		// Use `new this()` (not the deserializer directly) so that @QAlias remapping
		// in initialize() is applied before deserialization.
		return new this(JSON.parse(json) as IQModelData<IQAnyRecord>);
	}

	/**
	 * Alias for {@link fromJSON}. Creates a model instance from a JSON string.
	 *
	 * Parses a JSON string and deserializes it into a fully typed model instance.
	 * Use this when you prefer a `deserialize`-style naming convention.
	 *
	 * @template T - The model class type
	 * @param json - JSON string representation of the model
	 * @returns A new, fully typed model instance
	 *
	 * @example
	 * ```typescript
	 * const json = user.toJSON();
	 * const restored = User.deserializeJson(json);
	 * restored.createdAt instanceof Date; // true
	 * ```
	 */
	static deserializeJson<T extends QModel<IQAnyRecord>>(
		this: new (data: IQModelData<IQAnyRecord>) => T,
		json: string
	): T {
		// Delegates to fromJSON for consistent @QAlias remapping
		return new this(JSON.parse(json) as IQModelData<IQAnyRecord>);
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
	 * Checks if the model (or a specific field) has been modified since construction.
	 *
	 * When called without arguments, equivalent to `hasChanges()` — returns `true` if
	 * **any** field has changed.
	 *
	 * When called with a field name, returns `true` only if that specific field has
	 * changed since the instance was created.
	 *
	 * @param field - Optional field name to check. If omitted, checks all fields.
	 * @returns `true` if the field (or any field) has been modified, `false` otherwise
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', age: 30 });
	 * user.name = 'Jane';
	 *
	 * user.isDirty();        // true  (any field changed)
	 * user.isDirty('name');  // true  (name changed)
	 * user.isDirty('age');   // false (age unchanged)
	 * ```
	 */
	isDirty(field?: string): boolean {
		if (field === undefined) {
			return this.hasChanges();
		}
		const current = this.toInterface() as Record<string, unknown>;
		const initial = this.getInitInterface() as Record<string, unknown>;

		// Field existed in initial data — compare values directly
		if (field in initial) {
			return !this.deepEqual(current[field], initial[field]);
		}

		// Field was NOT in initial data (optional field added after construction)
		// Considered dirty if it now has a defined value
		const currentVal = (this as unknown as Record<string, unknown>)[field];
		return currentVal !== undefined;
	}

	/**
	 * Returns a `Set` of field names that have changed since the instance was created.
	 *
	 * Equivalent to {@link getChangedFields} but returns a `Set<string>` instead
	 * of an array, making membership checks O(1).
	 *
	 * @returns Set of field names that differ from their initial value
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ name: 'John', age: 30 });
	 * user.patch({ name: 'Jane' });
	 *
	 * const dirty = user.getDirtyFields();
	 * dirty.has('name'); // true
	 * dirty.has('age');  // false
	 * dirty.size;        // 1
	 * ```
	 */
	getDirtyFields(): Set<string> {
		return new Set(this.getChangedFields());
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
	 * Returns a **new instance** with the given partial data merged into the current state.
	 *
	 * Unlike `patch()` which mutates in place, `merge()` is **immutable**: the original
	 * instance is never modified. The new instance is completely independent and its
	 * initial state is set to the merged data, so:
	 * - `isDirty()` on the new instance returns `false`
	 * - `reset()` on the new instance reverts to the merged state (not the original)
	 *
	 * All type transformations (Date, BigInt, etc.) are applied to the merged values.
	 *
	 * @param partial - Fields to override in the new instance
	 * @returns A new model instance with current + partial data
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', age: 30 });
	 *
	 * const updated = user.merge({ name: 'Jane' });
	 *
	 * user.name;     // 'John'   ← original unchanged
	 * updated.name;  // 'Jane'   ← new instance
	 * updated.age;   // 30       ← fields not in partial are preserved
	 * updated.isDirty(); // false ← clean initial state
	 *
	 * // Chaining
	 * const v3 = user.merge({ name: 'Jane' }).merge({ age: 99 });
	 * ```
	 */
	merge(partial: Partial<IQModelData<TInterface>>): this {
		// Use `new Constructor()` (not deserialize) so that __initData is set correctly.
		// deserialize() bypasses the constructor via Object.create, losing __initData,
		// which would break isDirty() / reset() on the returned instance.
		const Constructor = this.constructor as unknown as new (
			data: IQModelData<TInterface>
		) => this;
		const current = this.serialize();
		const merged = { ...current, ...partial };
		return new Constructor(merged as unknown as IQModelData<TInterface>);
	}

	/**
	 * Deep equality comparison for change detection.
	 *
	 * @private
	 */
	private deepEqual(valA: unknown, valB: unknown): boolean {
		if (valA === valB) return true;
		if (valA == null || valB == null) return false;
		if (typeof valA !== typeof valB) return false;

		// Handle arrays
		if (Array.isArray(valA) && Array.isArray(valB)) {
			if (valA.length !== valB.length) return false;
			return valA.every((val, idx) => this.deepEqual(val, valB[idx]));
		}

		// Handle objects
		if (typeof valA === 'object' && typeof valB === 'object') {
			const keysA = Object.keys(valA);
			const keysB = Object.keys(valB);

			if (keysA.length !== keysB.length) return false;

			return keysA.every((key) =>
				this.deepEqual(
					(valA as Record<string, unknown>)[key],
					(valB as Record<string, unknown>)[key]
				)
			);
		}

		return false;
	}

	/**
	 * Compares this instance with another and returns a field-by-field diff.
	 *
	 * Uses serialized (JSON-safe) values for comparison so that complex types
	 * like `Date` and `bigint` are compared as strings consistently.
	 *
	 * @param other - Another instance of the same model class
	 * @returns Object where each changed key maps to `{ before, after }` values.
	 *          `before` = this instance's value, `after` = other instance's value.
	 *          Returns an empty object when both instances are equal.
	 *
	 * @example
	 * ```typescript
	 * const a = new User({ name: 'John', age: 30 });
	 * const b = new User({ name: 'Jane', age: 31 });
	 *
	 * a.diff(b);
	 * // { name: { before: 'John', after: 'Jane' }, age: { before: 30, after: 31 } }
	 * ```
	 */
	diff(other: this): Record<string, { before: unknown; after: unknown }> {
		const selfData = this.serialize() as Record<string, unknown>;
		const otherData = other.serialize() as Record<string, unknown>;
		const result: Record<string, { before: unknown; after: unknown }> = {};

		const allKeys = new Set([
			...Object.keys(selfData),
			...Object.keys(otherData),
		]);

		for (const key of allKeys) {
			if (!this.deepEqual(selfData[key], otherData[key])) {
				result[key] = { before: selfData[key], after: otherData[key] };
			}
		}

		return result;
	}

	/**
	 * Returns `true` when this instance is deeply equal to `other`.
	 *
	 * Comparison is performed on serialized (JSON-safe) values so that `Date`,
	 * `bigint` and other complex types are compared consistently.
	 *
	 * @param other - Another instance of the same model class
	 * @returns `true` if all serialized fields are equal, `false` otherwise
	 *
	 * @example
	 * ```typescript
	 * const a = new User({ id: '1', name: 'John' });
	 * const b = new User({ id: '1', name: 'John' });
	 * a.equals(b); // true
	 *
	 * a.name = 'Jane';
	 * a.equals(b); // false
	 * ```
	 */
	equals(other: this): boolean {
		return Object.keys(this.diff(other)).length === 0;
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

	// ==========================================================================
	// SCHEMA GENERATION API
	// ==========================================================================

	/**
	 * Generate schema in multiple formats for validation, documentation, and integration.
	 *
	 * **Unified API** - One method for all schema types:
	 * - `'json'` - JSON Schema Draft-07 (universal standard)
	 * - `'zod'` - Zod validation schema (popular TypeScript validator)
	 * - `'mongo'` - MongoDB/Mongoose schema definition
	 * - `'typescript'` - TypeScript interface string
	 * - `'graphql'` - GraphQL SDL type definition
	 * - `'openapi'` - OpenAPI 3.0 schema
	 * - `'ajv'` - AJV validator schema
	 *
	 * **SOLID - Open/Closed:** Extensible to new schema types without modifying core.
	 *
	 * @param type - Schema type to generate
	 * @returns Generated schema in the requested format
	 * @throws Error if schema type is unknown
	 *
	 * @example
	 * Generate JSON Schema
	 * ```typescript
	 * @Quick({ createdAt: Date, balance: BigInt })
	 * class User extends QModel<IUser> {
	 *   declare id: number;
	 *   declare name: string;
	 *   declare createdAt: Date;
	 *   declare balance: bigint;
	 * }
	 *
	 * const jsonSchema = User.getSchema('json');
	 * // {
	 * //   $schema: 'http://json-schema.org/draft-07/schema#',
	 * //   type: 'object',
	 * //   title: 'User',
	 * //   properties: {
	 * //     id: { type: 'number' },
	 * //     name: { type: 'string' },
	 * //     createdAt: { type: 'string', format: 'date-time' },
	 * //     balance: { type: 'string', pattern: '^-?\\d+$' }
	 * //   },
	 * //   required: ['id', 'name', 'createdAt', 'balance']
	 * // }
	 * ```
	 *
	 * @example
	 * Generate Zod Schema
	 * ```typescript
	 * const zodSchema = User.getSchema('zod');
	 *
	 * // Validate data
	 * const result = zodSchema.safeParse({
	 *   id: 1,
	 *   name: 'John',
	 *   createdAt: '2024-01-01T00:00:00.000Z',
	 *   balance: '999999999999'
	 * });
	 *
	 * console.log(result.success); // true
	 * ```
	 *
	 * @example
	 * Generate MongoDB Schema
	 * ```typescript
	 * const mongoSchema = User.getSchema('mongo');
	 * // {
	 * //   id: { type: Number, required: true },
	 * //   name: { type: String, required: true },
	 * //   createdAt: { type: Date, required: true },
	 * //   balance: { type: String, required: true }
	 * // }
	 * ```
	 *
	 * @example
	 * Generate TypeScript Interface
	 * ```typescript
	 * const tsInterface = User.getSchema('typescript');
	 * // "interface IUser {\n\tid: number;\n\tname: string;\n\tcreatedAt: Date;\n\tbalance: bigint;\n}"
	 * ```
	 *
	 * @example
	 * Generate GraphQL Type
	 * ```typescript
	 * const graphqlType = User.getSchema('graphql');
	 * // "type User {\n\tid: Float!\n\tname: String!\n\tcreatedAt: DateTime!\n\tbalance: String!\n}"
	 * ```
	 */
	static getSchema(
		type: import('@/core/types/schema-types').IQSchemaType
	): any {
		const {
			JsonSchemaGenerator,
			ZodSchemaGenerator,
			MongoSchemaGenerator,
			TypeScriptSchemaGenerator,
			GraphQLSchemaGenerator,
			OpenAPISchemaGenerator,
			AjvSchemaGenerator,
			// eslint-disable-next-line @typescript-eslint/no-require-imports
		} = require('@/core/services/schema-generators.service');

		const className = this.name;
		const decoratorConfig =
			Reflect.getMetadata(QUICK_TYPE_MAP_KEY, this) || {};

		// Get all properties from the prototype
		const properties =
			Object.keys(decoratorConfig).length > 0
				? Object.keys(decoratorConfig)
				: this._inferPropertiesFromSample();

		const config = {
			className,
			decoratorConfig,
			properties,
		};

		switch (type) {
			case 'json':
				return JsonSchemaGenerator.generate(config);
			case 'zod':
				return ZodSchemaGenerator.generate(config);
			case 'mongo':
				return MongoSchemaGenerator.generate(config);
			case 'typescript':
				return TypeScriptSchemaGenerator.generate(config);
			case 'graphql':
				return GraphQLSchemaGenerator.generate(config);
			case 'openapi':
				return OpenAPISchemaGenerator.generate(config);
			case 'ajv':
				return AjvSchemaGenerator.generate(config);
			default:
				throw new Error(`Unknown schema type: ${type}`);
		}
	}

	/**
	 * Generate schema with examples from instance values.
	 *
	 * For JSON/OpenAPI schemas, adds `example` fields with actual values from the instance.
	 *
	 * @param type - Schema type to generate
	 * @returns Generated schema with examples
	 *
	 * @example
	 * Generate JSON Schema with examples
	 * ```typescript
	 * const user = new User({
	 *   id: 42,
	 *   name: 'John Doe',
	 *   createdAt: '2024-01-01',
	 *   balance: '999999'
	 * });
	 *
	 * const schema = user.getSchema('json');
	 * // {
	 * //   ...
	 * //   properties: {
	 * //     id: { type: 'number', example: 42 },
	 * //     name: { type: 'string', example: 'John Doe' },
	 * //     createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
	 * //     balance: { type: 'string', pattern: '^-?\\d+$', example: '999999' }
	 * //   }
	 * // }
	 * ```
	 */
	getSchema(type: import('@/core/types/schema-types').IQSchemaType): any {
		const {
			JsonSchemaGenerator,
			// eslint-disable-next-line @typescript-eslint/no-require-imports
		} = require('@/core/services/schema-generators.service');

		const classSchema = (this.constructor as typeof QModel).getSchema(type);

		// For JSON/OpenAPI, add examples from instance
		if (type === 'json' || type === 'openapi') {
			return JsonSchemaGenerator.addExamples(classSchema, this);
		}

		return classSchema;
	}

	/**
	 * Infer properties from a sample instance when no metadata is available
	 * @internal
	 */
	private static _inferPropertiesFromSample(): string[] {
		try {
			// Create a minimal mock instance to discover properties
			const sampleData: Record<string, any> = {};
			const instance = new (this as any)(sampleData);

			// Get keys from __quickValues__ if populated
			if (instance[QUICK_VALUES_KEY]) {
				return Object.keys(instance[QUICK_VALUES_KEY]);
			}

			// Last resort: return empty array
			return [];
		} catch (_error) {
			// If instantiation fails, return empty
			return [];
		}
	}
}

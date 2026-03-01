// @quickmodel-rule-ignore: no-as-unknown — QModel is a metaprogramming framework;
// structural type bypasses for dynamic constructor dispatch, `this`-as-record,
// @quickmodel-rule-ignore: no-console — console.log appears only in @example JSDoc blocks to demonstrate usage.
// deepFreeze result narrowing, mixin pattern, and prototype mutation are unavoidable.
/**
 * QModel - Type-safe serialization and mock generation for TypeScript models
 *
 * SOLID Principles Applied:
 * - S (Single Responsibility): QModel orchestrates, delegates to specific services
 * - O (Open/Closed): Open for extension (new transformers), closed for modification
 * - L (Liskov Substitution): All transformers are interchangeable
 * - I (Interface Segregation): Specific interfaces (ISerializer, IDeserializer, etc.)
 * @see {@link QModel} — the main class exported from this module
 * @see {@link Quick} — class decorator required to activate type transformation
 */

import 'reflect-metadata';
import { Deserializer } from '@/core/services/deserializer.service';
import { Serializer } from '@/core/services/serializer.service';
import type { IQSerializationOptions } from '@/core/interfaces/serializer.interface';
import { ToInterfaceService } from '@/core/services/to-interface.service';
import type { QMockGenerator } from '@/core/services/mock-generator.service';
import { IntegrityService } from '@/core/services/integrity.service';
import type { QMockBuilder } from '@/core/services/mock-builder.service';
import {
	getSchemaGenerator,
	getAddExamplesFn,
	hasSchemaGenerators,
} from '@/core/helpers/schema-registry';
import {
	getMockGenSingleton,
	getMockBuilderCtor,
} from '@/core/helpers/mock-registry';
import type {
	IQModelInstance,
	IQModelInterface,
} from '@/core/interfaces/mock-types.interface';
import type {
	IQSerializedInterface,
	IQAliasedSerializedInterface,
	IQAliasInput,
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
import { QSENSITIVE_FIELDS_KEY } from '@/core/decorators/qsensitive.decorator';
import {
	QDEFAULT_FIELDS_KEY,
	QDEFAULT_VALUE_KEY,
	type IQDefaultDescriptor,
} from '@/core/decorators/qdefault.decorator';
import {
	collectReadonlyFields,
	ImmutableFieldError,
} from '@/core/decorators/qreadonly.decorator';
import {
	QTRANSFORM_FIELDS_KEY,
	QTRANSFORM_PIPELINE_KEY,
	type IQTransformFn,
} from '@/core/decorators/qtransform.decorator';
import { applyMigrations } from '@/core/decorators/qversion.decorator';
import {
	QModelCollection,
	type IQCollectionItem,
} from '@/core/models/quick-collection.model';
import { deepFreeze } from '@/core/helpers/transform-helpers';
import { QConfig } from '@/core/config/quick.config';
import { TraceLogger } from '@/core/helpers/trace-logger.helper';
import type { IQAdvancedOptions } from '@/core/interfaces/quick-options.interface';
import type { INoInfer } from '@/core/types/ts-polyfills.type';
import {
	formDataToPlainObject,
	plainObjectToFormData,
	type IFromFormDataOptions,
	type IToFormDataOptions,
} from '@/core/helpers/form-data.helpers';
import {
	blobToReadableStream,
	streamToBlob,
	pipeReadableToWritable,
	modelToMultipartStream,
	type IToReadableStreamOptions,
	type IToReadableStreamSingleField,
	type IToReadableStreamMultipart,
	type IQMultipartStream,
	type IFromStreamOptions,
	type IPipeStreamOptions,
} from '@/core/helpers/stream.helpers';
import { SchemaToModelService } from '@/core/services/schema-to-model.service';
import type {
	IFromSchemaFormat,
	IFromSchemaInput,
} from '@/core/types/schema-types';
import type {
	IQValidationReport,
	IQValidateOptions,
	IQValidateResult,
} from '@/core/types/validation-types';
import type { IQMHandle } from '@/core/interfaces/qm-handle.interface';

// ─── Performance: module-level metadata caches ────────────────────────────────
// Metadata is immutable after decorators run (class-definition time), so
// caching with WeakMap is always safe and transparent to callers.

/** Cached alias maps (property → alias) per class prototype. */
const _ALIAS_MAP_CACHE = new WeakMap<object, Map<string, string>>();

/** Whether a property has a user-defined accessor, per (class constructor, propertyKey). */
const _HAS_ACCESSOR_CACHE = new WeakMap<Function, Map<string, boolean>>();

/** @Quick typeMap + @QType list cached per class constructor. */
interface IQClassInitCache {
	typeMap: Record<string, unknown> | null;
	qTypes: string[] | null;
}
const _CLASS_INIT_CACHE = new WeakMap<Function, IQClassInitCache>();

/** Resolved transformer spec + options per (class constructor, propertyKey). */
interface IQSetterMeta {
	spec: unknown;
	options: unknown;
}
const _SETTER_META_CACHE = new WeakMap<Function, Map<string, IQSetterMeta>>();

/**
 * getSchema() result cache — keyed by class constructor, then by schema format.
 * Schema metadata is immutable after decorators run → safe to cache forever.
 *
 * @see {@link QModel.getSchema} — static method that populates this cache
 */
const _GET_SCHEMA_CACHE = new WeakMap<Function, Map<string, unknown>>();

/**
 * @internal Cached @QTransform field list per class constructor.
 *
 * Populated once on first construction, then reused on all subsequent constructions.
 * Eliminates the prototype chain walk + `Reflect.getOwnMetadata` calls that otherwise
 * execute on EVERY model construction even when no `@QTransform` decorators are present.
 *
 * Value is `readonly string[]` — empty frozen array for classes with no @QTransform fields.
 */
const _QTRANSFORM_FIELDS_CACHE = new WeakMap<Function, readonly string[]>();

/**
 * @internal Cached @QDefault field list per class constructor.
 *
 * Same rationale as `_QTRANSFORM_FIELDS_CACHE` — eliminates the per-construction
 * prototype chain walk for classes that never use `@QDefault`.
 *
 * Value is `readonly string[]` — empty frozen array for classes with no @QDefault fields.
 */
const _QDEFAULT_FIELDS_CACHE = new WeakMap<Function, readonly string[]>();

// Shared empty frozen array to avoid re-allocating per class with no @QTransform/@QDefault
const _EMPTY_FIELDS: readonly string[] = Object.freeze([]);
// ──────────────────────────────────────────────────────────────────────────────

// Validation report types are defined in a dedicated file so that
// qm-handle.interface.ts can import them without a circular dependency.
export type {
	IQValidationReport,
	IQValidateOptions,
	IQValidateResult,
} from '@/core/types/validation-types';

// Internal exports only (QType is implementation detail)
// Public API uses only @Quick() decorator
export { Quick } from '@/core/decorators/quick.decorator';
export type { IQImplements } from '@/core/interfaces/model.interface';

/**
 * Options allowed in a per-class `static config = QModel.configure({...})` declaration.
 *
 * Acts as a class-level override for specific `QConfig.defaults` settings, without
 * affecting the global `QConfig` or sibling model classes.
 *
 * @see {@link QModel.configure} — factory that produces this descriptor
 */
export type IQClassConfig = Partial<IQAdvancedOptions>;

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
 *
 * @see {@link QModel.createMany} — the method that returns this result
 * @see {@link IQCreateManyError} — the per-instance error type in `errors[]`
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
 * Syntax: `QModel<InterfaceType>` or `QModel<InterfaceType, AliasMap>`
 *
 * @template TInterface - The interface representing the IQSerialized JSON structure (e.g., `string` for dates)
 * @template TAliasMap - Optional literal map `{ propertyName: 'alias_key' }` that makes `serialize()` return
 *   alias keys instead of property names. Use together with `@Quick({}, { alias: {...} })` for full type safety.
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
 * // Both forms are equivalent:
 * const user = User.create({ id: '1', createdAt: '2024-01-01' });
 * const user2 = new User({ id: '2', createdAt: '2024-01-01' });
 * console.log(user.createdAt instanceof Date); // true
 * ```
 *
 * @example
 * **Type-safe alias keys in serialize() output**
 * ```typescript
 * interface IUser { firstName: string; lastName: string; }
 * type IUserAliases = { firstName: 'first_name'; lastName: 'last_name' };
 *
 * @Quick({}, { alias: { firstName: 'first_name', lastName: 'last_name' } })
 * class User extends QModel<IUser, IUserAliases> {
 *   declare firstName: string;
 *   declare lastName: string;
 * }
 *
 * const user = new User({ first_name: 'Alice', last_name: 'Smith' });
 * user.serialize().first_name; // ✅ typed correctly — IDE autocomplete works
 * user.serialize().last_name;  // ✅
 * ```
 * @see {@link Quick} — class decorator required before extending `QModel`
 * @see {@link QModel.create} — preferred factory method for creating instances
 * @see {@link QModel.serialize} — serialize an instance back to plain JSON
 */

/**
 * Pre-coerces a single URL string value to its expected JS primitive type.
 * Used internally by {@link QModel.fromURL}.
 *
 * Only converts the JS primitives that `URLSearchParams` always yields as strings:
 * `Number` → `Number(val)`, `Boolean` → `val === 'true'`, `BigInt` → `BigInt(val)`.
 * All other specs (`Date`, custom transformers, etc.) receive the raw string so their
 * own `deserialize()` logic runs normally via the constructor.
 *
 * @param val  - Raw string from `params.get()` / `params.getAll()`, or `null` when absent
 * @param spec - Transformer spec as stored in the `@Quick` type-map
 * @returns Coerced value ready for the QModel constructor
 */
function coerceUrlString(val: string | null, spec: unknown): unknown {
	if (val === null) return undefined;
	if (spec === Number) return Number(val);
	if (spec === Boolean) return val === 'true';
	if (spec === BigInt) {
		try {
			return BigInt(val);
		} catch {
			return val;
		}
	}
	return val;
}

export abstract class QModel<
	TInterface extends IQAnyRecord,
	TAliasMap extends Record<string, string> = Record<never, never>,
> {
	// SOLID - Dependency Inversion: Services injected as dependencies
	/** @internal Singleton deserializer used by all QModel instances. */
	private static readonly deserializer = new Deserializer();
	/** @internal Singleton serializer used by all QModel instances. */
	private static readonly serializer = new Serializer();
	/** @internal Singleton service that converts QModel instances to plain interface objects. */
	private static readonly toInterfaceService = new ToInterfaceService();
	/**
	 * @internal Lazy-initialized mock generator — resolved via mock-registry on first call.
	 * The registry is populated by importing `quickmodel/mock`.
	 * The full `quickmodel` entry imports it automatically; `quickmodel/core` does not.
	 */
	private static _mockGenInstance: QMockGenerator | undefined;

	/** @internal Returns the singleton QMockGenerator via the lazy mock-registry. */
	private static get _mockGen(): QMockGenerator {
		if (!QModel._mockGenInstance) {
			QModel._mockGenInstance = getMockGenSingleton();
		}
		return QModel._mockGenInstance;
	}

	/**
	 * @internal Lazy-initialized integrity/validation service.
	 * Defers construction of `IntegrityService` (and its 14+ transformer instances)
	 * until the first call to `.checkIntegrity()` or `.isValid()`.
	 * This reduces module startup cost for consumers who never validate integrity.
	 */
	private static _integrityInstance: IntegrityService | undefined;

	/** @internal Returns the singleton IntegrityService, creating it on first access. */
	private static get _validation(): IntegrityService {
		if (!QModel._integrityInstance) {
			QModel._integrityInstance = new IntegrityService();
		}
		return QModel._integrityInstance;
	}

	// Store initial state for change tracking and reset
	/** @internal Snapshot of the serialized constructor input; used by `isDirty()` and `reset()`. */
	private __initData?: IQSerializedInterface<TInterface>;

	/**
	 * Optional per-class configuration override.
	 *
	 * Assign the result of `QModel.configure({...})` here to override specific
	 * `QConfig.defaults` settings for this class only, without affecting siblings
	 * or the global configuration.
	 *
	 * @example
	 * ```typescript
	 * @Quick()
	 * class InternalDto extends QModel<IInternalDto> {
	 *   static override readonly config = QModel.configure({
	 *     unknownPropertyPolicy: 'keep',
	 *   });
	 * }
	 * ```
	 *
	 * @see {@link QModel.configure} — factory method that produces this value
	 */
	static readonly config?: IQClassConfig;

	/**
	 * Internal property storage for transformed values.
	 * Explicitly defined to avoid 'any' usage and dynamic assignment.
	 * @internal
	 */
	protected [QUICK_VALUES_KEY]: Record<string, unknown> = {};

	/**
	 * Factory method to create a model instance. Functionally identical to `new ModelClass(data)`.
	 *
	 * The main benefit over the constructor is **stricter type inference** — TypeScript will
	 * enforce that `data` matches `TInterface` exactly (no extra unknown properties at the
	 * call-site when `unknownPropertyPolicy: 'error'` is active).
	 *
	 * Use `declare` in your class to inform TypeScript of the transformed runtime types.
	 *
	 * @param data - Data strictly matching the model interface
	 * @returns Model instance with type-safe property access
	 *
	 * @see {@link QModel.constructor} — equivalent low-level form
	 * @see {@link QModel.createReadonly} — immutable variant
	 * @see {@link QModel.createMany} — batch variant
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
	 * // Both forms are completely equivalent:
	 * const post1 = Post.create({ id: 1, title: 'Hello', createdAt: '2026-01-10T00:00:00.000Z' });
	 * const post2 = new Post({ id: 2, title: 'World', createdAt: '2026-01-10T00:00:00.000Z' });
	 *
	 * post1.createdAt instanceof Date; // true
	 * post2.createdAt instanceof Date; // true
	 * ```
	 */
	static create<
		TClass extends QModel<any, any>,
		TInterface = TClass extends QModel<infer I, any> ? I : never,
		TAliasMap extends Record<string, string> = TClass extends QModel<
			any,
			infer A
		>
			? A
			: Record<never, never>,
		TResult = TClass,
	>(
		this: new (data: any) => TClass,
		data: INoInfer<IQAliasInput<TInterface, TAliasMap>>
	): TResult;

	static create(this: any, data: any): any {
		// Use generics to cast 'this' to the constructor type
		const Constructor = this;
		return new Constructor(data);
	}

	/**
	 * Produces a per-class configuration descriptor to be assigned to the
	 * `static readonly config` property of a `QModel` subclass.
	 *
	 * Class-level config overrides specific `QConfig.defaults` settings for that
	 * class only, without affecting sibling classes or the global configuration.
	 * If the same option is set both here and in the `@Quick()` second parameter,
	 * the `@Quick()` option takes precedence.
	 *
	 * @param opts - A subset of `IQAdvancedOptions` to apply to this class.
	 * @returns The options object (passed through; used as-is by the population service).
	 *
	 * @example
	 * ```typescript
	 * @Quick()
	 * class InternalDto extends QModel<IInternalDto> {
	 *   static override readonly config = QModel.configure({
	 *     unknownPropertyPolicy: 'keep',
	 *     coercionStrategy: 'strict',
	 *   });
	 *   declare id: string;
	 * }
	 * // InternalDto keeps unknown properties; other models are unaffected.
	 * ```
	 *
	 * @see {@link IQClassConfig} — the type returned by this method
	 * @see {@link QConfig} — global configuration singleton
	 */
	static configure(opts: IQClassConfig): IQClassConfig {
		return opts;
	}

	/**
	 * Creates a READ-ONLY (immutable) instance of the model.
	 * The instance and all nested properties will be recursively frozen.
	 *
	 * Equivalent to `Object.freeze(new Model(data))` but applied deeply — all
	 * nested objects are frozen recursively. Use this when you want compile-time
	 * and runtime guarantees that the instance cannot be mutated.
	 *
	 * @param data - Data to initialize the model
	 * @returns Deeply frozen model instance
	 *
	 * @see {@link QModel.create} — mutable variant (`new Model(data)` equivalent)
	 *
	 * @example
	 * ```typescript
	 * // createReadonly is equivalent to a deep-frozen `new User(data)`:
	 * const user = User.createReadonly({ name: 'John' });
	 * user.name = 'Jane'; // ❌ Throws TypeError in strict mode
	 *
	 * // For a mutable instance use `new` or `create`:
	 * const mutableUser = new User({ name: 'John' });
	 * mutableUser.name = 'Jane'; // ✅ OK
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
	 * @see {@link QModel.create} — single-instance variant
	 * @see {@link QModel.createReadonly} — single immutable instance
	 * @see {@link QModel.deserialize} — low-level single deserialization
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
		TClass extends QModel<any, any>,
		TInterface = TClass extends QModel<infer I, any> ? I : never,
		TAliasMap extends Record<string, string> = TClass extends QModel<
			any,
			infer A
		>
			? A
			: Record<never, never>,
		TResult = TClass,
	>(
		this: new (data: any) => TClass,
		data: INoInfer<IQAliasInput<TInterface, TAliasMap>>[],
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
	 * Creates a `QModelCollection<T>` from a raw data array.
	 *
	 * This is a static alias for `QModelCollection.from(Model, data)` that can be
	 * called directly on the subclass.
	 *
	 * @param data - Array of raw plain-object rows for this model.
	 * @returns A typed `QModelCollection` wrapping the instantiated models.
	 *
	 * @example
	 * ```typescript
	 * const users = UserModel.collection(rawRows);
	 * users.where(u => u.active).sortBy('name').paginate(1, 10);
	 * ```
	 *
	 * @see {@link QModelCollection.from} — underlying factory method
	 * @see {@link QModel.createMany} — similar but returns a plain array with error reporting
	 */
	static collection<TInst extends IQCollectionItem>(
		this: new (data: Record<string, unknown>) => TInst,
		data: Array<Record<string, unknown>>
	): QModelCollection<TInst> {
		return QModelCollection.from(this, data);
	}

	/**
	 * Creates a model instance from a `FormData` object.
	 *
	 * Converts the FormData entries into a plain object and passes it to the
	 * model constructor. File and Blob entries are resolved according to the
	 * `fileSource` option (default: `'auto'`).
	 *
	 * **Auto-detection tree (default `fileSource: 'auto'`):**
	 * - `File` instance → kept as `File`
	 * - `Blob` instance → kept as `Blob`
	 * - `string "data:..."` → decoded base64 → `Blob`
	 * - `string "https://..."` → string (URL reference)
	 * - Any other string → string as-is
	 *
	 * @param formData      - Source `FormData`
	 * @param options - Conversion options (fileSource, per-field overrides)
	 * @returns Model instance with type-safe property access
	 *
	 * @see {@link QModel.toFormData} — inverse: serialize a model instance back to FormData
	 *
	 * @example
	 * ```typescript
	 * // Default auto-detection
	 * const dto = UploadDto.fromFormData(formData);
	 *
	 * // Force all binary fields to be treated as references
	 * const dto = UploadDto.fromFormData(formData, { fileSource: 'reference' });
	 *
	 * // Per-field overrides
	 * const dto = UploadDto.fromFormData(formData, {
	 *   fields: { avatar: 'binary', document: 'reference' },
	 * });
	 * ```
	 *
	 * @group Serialization
	 */
	static fromFormData<TClass extends QModel<IQAnyRecord>>(
		this: new (data: any) => TClass,
		formData: FormData,
		options?: IFromFormDataOptions
	): TClass {
		const plain = formDataToPlainObject(formData, options);
		const Constructor = this;
		return new Constructor(plain);
	}

	/**
	 * Creates a model instance from a `URLSearchParams` object.
	 *
	 * Reads each key from `params` using the correct strategy:
	 * - Fields declared as **array specs** in `@Quick({ field: [Type] })` → `params.getAll(key)`
	 * - All other fields → `params.get(key)`
	 *
	 * After extraction, the plain object is passed to the normal constructor so all
	 * registered type coercions (`Number`, `Date`, `[Number]`, custom transformers…)
	 * are applied automatically.
	 *
	 * @param params - Source `URLSearchParams` (e.g. `new URL(req.url).searchParams`,
	 *   `request.nextUrl.searchParams`, or `new URLSearchParams(window.location.search)`)
	 * @returns Model instance with type-safe, coerced property access
	 *
	 * @see {@link QModel.fromFormData} — equivalent helper for `FormData`
	 * @see {@link Quick} — `@Quick({ field: [Type] })` marks array fields
	 *
	 * @example
	 * ```typescript
	 * // URL: /search?role=admin&age=25&tags=read&tags=write
	 *
	 * @Quick({ age: Number, tags: [String] })
	 * class SearchDto extends QModel<ISearch> {
	 *   declare role: string;
	 *   declare age: number;
	 *   declare tags: string[];
	 * }
	 *
	 * // Next.js App Router
	 * const dto = SearchDto.fromURL(request.nextUrl.searchParams);
	 * dto.age;  // 25  (number, not '25')
	 * dto.tags; // ['read', 'write']
	 *
	 * // Hono / Express
	 * const dto = SearchDto.fromURL(new URL(req.url).searchParams);
	 * ```
	 *
	 * @group Serialization
	 */
	static fromURL<TClass extends QModel<IQAnyRecord>>(
		this: new (data: any) => TClass,
		params: URLSearchParams
	): TClass {
		const Constructor = this as unknown as typeof QModel;
		const typeMap = (Reflect.getMetadata(QUICK_TYPE_MAP_KEY, Constructor) ??
			{}) as Record<string, unknown>;

		const plain: Record<string, unknown> = {};

		for (const key of new Set(params.keys())) {
			const spec = typeMap[key];
			if (Array.isArray(spec)) {
				plain[key] = params
					.getAll(key)
					.map((val) => coerceUrlString(val, spec[0]));
			} else {
				plain[key] = coerceUrlString(params.get(key), spec);
			}
		}

		return new (this as unknown as new (data: unknown) => TClass)(plain);
	}

	/**
	 * Returns the {@link IQMHandle} — a namespace object that groups all
	 * QuickModel infrastructure methods under a single `$qm` property.
	 *
	 * Using `$qm` keeps every other instance property available for
	 * user-defined domain data, eliminating reserved-word collisions with
	 * names like `copy`, `diff`, `validate`, `history`, etc.
	 *
	 * Root-level methods remain available alongside `$qm` for backward compatibility.
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ name: 'Alice', age: 30 });
	 *
	 * user.$qm.patch({ age: 31 });
	 * user.$qm.isDirty('age');          // true
	 * const clone = user.$qm.copy({ name: 'Bob' });
	 * const result = user.$qm.validate();
	 * ```
	 *
	 * @see {@link IQMHandle} — full API surface of this namespace handle
	 */
	get $qm(): IQMHandle<TInterface, TAliasMap, this> {
		const ref = this;
		return {
			serialize: (opt?) => ref.serialize(opt),
			toFormData: (opt?) => ref.toFormData(opt),
			toReadableStream: (opt) => {
				if ('multipart' in opt && opt.multipart) {
					return ref.toReadableStream(opt);
				}
				return ref.toReadableStream(opt);
			},
			isDirty: (fld?) => ref.isDirty(fld),
			getChanges: () => ref.getChanges(),
			patch: (dat) => ref.patch(dat),
			copy: (par?) => ref.copy(par),
			diff: (oth) => ref.diff(oth),
			equals: (oth) => ref.equals(oth),
			hasIntegrity: () => ref.hasIntegrity(),
			isValid: () => ref.isValid(),
			isValidAsync: (opt?) => ref.isValidAsync(opt),
			checkRules: () => ref.checkRules(),
			checkRulesAsync: (opt?) => ref.checkRulesAsync(opt),
			validationReport: () => ref.validationReport(),
			validationReportAsync: (opt?) => ref.validationReportAsync(opt),
			validate: (opt?) => {
				if (opt?.async === true) {
					return ref.validate({ ...opt, async: true as const });
				}
				return ref.validate(
					opt as IQValidateOptions & { async?: false }
				);
			},
		};
	}

	/**
	 * Builds a `FormData` from the model's current property values.
	 *
	 * Binary fields (`File`, `Blob`, `ArrayBuffer`, `Uint8Array`) are encoded
	 * according to the `fileMode` option (default: `'auto'` / `'binary'`).
	 *
	 * @param options - Conversion options (fileMode, per-field overrides)
	 * @returns `Promise<FormData>`
	 *
	 * @see {@link QModel.fromFormData} — inverse: parse a FormData into a model instance
	 *
	 * @example
	 * ```typescript
	 * // Default — preserve binaries
	 * const fd = await dto.toFormData();
	 *
	 * // Convert all binaries to base64 data:URIs
	 * const fd = await dto.toFormData({ fileMode: 'base64' });
	 *
	 * // Per-field overrides
	 * const fd = await dto.toFormData({ fields: { avatar: 'binary', doc: 'reference' } });
	 * ```
	 *
	 * @group Serialization
	 */
	async toFormData(options?: IToFormDataOptions): Promise<FormData> {
		// Resolve spoofMethod cascade: QConfig.defaults < decorator < call option
		const localOptions = Reflect.getMetadata(
			QUICK_OPTIONS_KEY,
			this.constructor
		) as IQAdvancedOptions | undefined;
		const globalDefaults = QConfig.get().defaults;
		const resolvedSpoofMethod =
			options?.spoofMethod ??
			localOptions?.spoofMethod ??
			globalDefaults?.spoofMethod;

		// Build a plain object from the model's current values.
		// Combine direct own keys (via getters/properties) with internal QUICK_VALUES_KEY storage.
		const plain: Record<string, unknown> = {};
		const values = this[QUICK_VALUES_KEY];

		// 1. Collect from QUICK_VALUES_KEY (transformed/stored values including File/Blob)
		for (const key of Object.keys(values)) {
			plain[key] = values[key];
		}

		// 2. Collect from own enumerable string keys (may include non-transformed string fields)
		for (const key of Object.keys(this as object)) {
			if (key !== QUICK_VALUES_KEY && !(key in plain)) {
				plain[key] = (this as Record<string, unknown>)[key];
			}
		}

		return plainObjectToFormData(plain, {
			...options,
			spoofMethod: resolvedSpoofMethod,
		});
	}

	/**
	 * Creates a `ReadableStream<Uint8Array>` from a binary field, or a full
	 * `multipart/form-data` stream from all model fields.
	 *
	 * **Single-field mode** (`{ field: 'video' }`):
	 * Emits the raw bytes of a single Blob/File field. The file is never fully
	 * in memory at once. Use for large binary uploads.
	 *
	 * **Multipart mode** (`{ multipart: true }`):
	 * Encodes every model field as an RFC 2046 `multipart/form-data` message.
	 * Binary fields are streamed lazily; text fields are inlined. The returned
	 * stream exposes a `boundary` property for the `Content-Type` header.
	 *
	 * @param options - `{ field }` for single-field or `{ multipart: true }` for full form
	 * @returns `ReadableStream<Uint8Array>` (single-field) or `IQMultipartStream` (multipart)
	 *
	 * @throws `Error` in single-field mode if the field is null/undefined or not a Blob/File
	 *
	 * @see {@link QModel.fromStream} — inverse: populate a field from a readable stream
	 * @see {@link QModel.pipeStream} — zero-copy pipe between streams
	 *
	 * @example Single-field
	 * ```typescript
	 * const stream = dto.toReadableStream({ field: 'video', chunkSize: 64 * 1024 });
	 * return new Response(stream, { headers: { 'Content-Type': dto.video.type } });
	 * ```
	 *
	 * @example Multipart
	 * ```typescript
	 * const stream = dto.toReadableStream({ multipart: true });
	 * await fetch('/upload', {
	 *   method: 'POST',
	 *   body: stream,
	 *   headers: { 'Content-Type': `multipart/form-data; boundary=${stream.boundary}` },
	 * });
	 * ```
	 *
	 * @group Serialization
	 */
	toReadableStream(options: IToReadableStreamMultipart): IQMultipartStream;
	toReadableStream(
		options: IToReadableStreamSingleField
	): ReadableStream<Uint8Array>;
	toReadableStream(
		options: IToReadableStreamOptions
	): ReadableStream<Uint8Array> | IQMultipartStream {
		// ── Multipart mode ──────────────────────────────────────────────────
		if ('multipart' in options && options.multipart) {
			const { boundary, chunkSize, onChunk } = options;
			const values = this[QUICK_VALUES_KEY];

			// Collect per-field fileModes from @QType({ fileMode }) decorators
			const classproto = Object.getPrototypeOf(this) as object;
			const qtypeFields = Reflect.getMetadata(
				QTYPES_METADATA_KEY,
				classproto
			) as Array<string | symbol> | undefined;
			let fieldFileModes: Record<string, string> | null = null;
			if (qtypeFields?.length) {
				for (const fieldKey of qtypeFields) {
					const fMode = Reflect.getMetadata(
						'qtype:fileMode',
						classproto,
						fieldKey
					) as string | undefined;
					if (fMode) {
						if (fieldFileModes === null) fieldFileModes = {};
						fieldFileModes[String(fieldKey)] = fMode;
					}
				}
			}

			return modelToMultipartStream({
				values,
				fieldFileModes,
				boundary,
				chunkSize,
				onChunk,
			});
		}

		// ── Single-field mode ────────────────────────────────────────────────
		const { field, chunkSize, onChunk } = options;
		const values = this[QUICK_VALUES_KEY];
		const val: unknown = values[field];

		if (val === null || val === undefined) {
			throw new Error(
				`[QModel.toReadableStream] Field "${field}" is null or undefined — ` +
					`cannot stream a null value.`
			);
		}

		if (!(val instanceof Blob)) {
			throw new Error(
				`[QModel.toReadableStream] Field "${field}" must be a Blob or File instance, ` +
					`got: ${typeof val}`
			);
		}

		return blobToReadableStream(val, chunkSize, onChunk);
	}

	/**
	 * Creates a model instance with a binary field populated from a `ReadableStream<Uint8Array>`.
	 *
	 * All stream chunks are accumulated into a single `Blob` and assigned to the
	 * specified field. Use when you need the full binary data in memory
	 * (e.g. after receiving a small upload).
	 *
	 * @param stream  - Source `ReadableStream<Uint8Array>`
	 * @param options - Must include `field` (name of the target binary field)
	 * @returns `Promise<TClass>` — model instance with the binary field set
	 *
	 * @throws `RangeError` if `maxBytes` is set and the stream exceeds it
	 *
	 * @see {@link QModel.toReadableStream} — inverse: stream out from a model field
	 * @see {@link QModel.pipeStream} — zero-copy alternative when accumulation is not needed
	 *
	 * @example
	 * ```typescript
	 * const dto = await UploadDto.fromStream(req.body, { field: 'video', maxBytes: 500 * 1024 * 1024 });
	 * // dto.video → Blob with all stream chunks
	 * ```
	 *
	 * @group Serialization
	 */
	static async fromStream<TClass extends QModel<IQAnyRecord>>(
		this: new (data: any) => TClass,
		stream: ReadableStream<Uint8Array>,
		options: IFromStreamOptions
	): Promise<TClass> {
		const { field, maxBytes, onProgress } = options;
		const blob = await streamToBlob(stream, {
			maxBytes,
			onProgress,
			mimeType: 'application/octet-stream',
		});
		const Constructor = this;
		return new Constructor({ [field]: blob as unknown });
	}

	/**
	 * Pipes all bytes from a `ReadableStream<Uint8Array>` to a `WritableStream<Uint8Array>`
	 * without accumulating anything in memory.
	 *
	 * `QModel` acts as a zero-copy conduit. Use for large files or server-side proxy uploads.
	 *
	 * @param src     - Source readable stream
	 * @param dst     - Destination writable stream
	 * @param options - Optional limits and progress callback
	 * @returns `Promise<void>` — resolves when all bytes have been piped
	 *
	 * @throws `RangeError` if `maxBytes` is set and the stream exceeds it
	 *
	 * @see {@link QModel.toReadableStream} — create a readable stream from a model field
	 * @see {@link QModel.fromStream} — accumulate a stream into a model field
	 *
	 * @example
	 * ```typescript
	 * await UploadDto.pipeStream(req.body, s3UploadStream, { maxBytes: 500 * 1024 * 1024 });
	 * ```
	 *
	 * @group Serialization
	 */
	static async pipeStream(
		src: ReadableStream<Uint8Array>,
		dst: WritableStream<Uint8Array>,
		options?: IPipeStreamOptions
	): Promise<void> {
		const { maxBytes, onProgress } = options ?? {};
		return pipeReadableToWritable(src, dst, { maxBytes, onProgress });
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

		const BuilderCtor = getMockBuilderCtor();
		return new BuilderCtor(
			ModelClass,
			QModel._mockGen
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
	 *   `isDirty()`, `getDirtyFields()`, `reset()`, `patch()`, `copy()`
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
			/**
			 * Local mixin class that fuses `QModel` initialization logic with an arbitrary
			 * external base class. Returned by `QModel.extends()` — not part of the public API.
			 *
			 * @internal
			 */
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
	/** @internal Holds the raw constructor input until `initialize()` completes. Removed (set to `undefined`) after hydration. */
	private readonly __tempData?: IQModelData<TInterface>;

	/**
	 * Constructs a new model instance from interface data or another instance.
	 * Automatically deserializes complex types (Date, BigInt, etc.) based on `@QType` decorators.
	 *
	 * `new Model(data)` and `Model.create(data)` are exactly equivalent — `create` is a
	 * typed wrapper that adds stricter inference at the call-site.
	 * Both respect `unknownPropertyPolicy` and all `@Quick` options.
	 *
	 * @param data - Either a plain interface object or another model instance (for cloning)
	 *
	 * @see {@link QModel.create} — preferred factory alias with stricter type inference
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
	 * // Equivalent using the factory:
	 * const user2 = User.create({ id: '2', name: 'Jane', createdAt: new Date() });
	 *
	 * // Clone from another instance
	 * const clonedUser = new User(user);
	 * ```
	 */
	constructor(
		data:
			| IQAliasInput<TInterface, TAliasMap>
			| IQModelData<TInterface>
			| QModel<TInterface>
	) {
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
		// OPT-9: Skip object copy when no @QAlias mappings exist.
		// populateInstance and initDataClone both handle prototype-pollution keys independently.
		let workData: Record<string, unknown>;
		if (_aliasMap.size === 0) {
			workData = data as unknown as Record<string, unknown>;
		} else {
			workData = {};
			for (const key in data) {
				if (
					key === '__proto__' ||
					key === 'constructor' ||
					key === 'prototype'
				)
					continue;
				workData[key] = (data as Record<string, unknown>)[key];
			}
			for (const [prop, alias] of _aliasMap) {
				if (alias in workData) {
					workData[prop] = workData[alias];
					delete workData[alias];
				}
			}
		}

		// @QVersion: Apply pending schema migrations before deserialization
		workData = applyMigrations(this.constructor, workData);

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
			} else if (
				value === null ||
				(typeof value !== 'object' && typeof value !== 'function')
			) {
				// Primitives (string, number, boolean, bigint, symbol) are immutable
				// — structuredClone is unnecessary and expensive for them.
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

		// OPT-10: Build propertyNames directly — eliminates the intermediate allKeys Set,
		// Array.from() + filter() allocations per construction.
		const propertyNames = new Set<string>();

		for (const key of Object.keys(deserialized)) {
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
				continue;
			}

			// Determine storage key - don't duplicate QUICK_PROPERTY_KEYS prefix
			let storageKey: string;
			let propertyKey: string;

			if (key.startsWith(QUICK_PROPERTY_KEYS)) {
				// Key is already a storage key, use as-is
				storageKey = key;
				propertyKey = key.slice(QUICK_PROPERTY_KEYS.length);
				// OPT-10: storage keys are NOT added to propertyNames (lazy getter uses unprefixed key)
			} else {
				// Regular property, add prefix for storage
				storageKey = `${QUICK_PROPERTY_KEYS}${key}`;
				propertyKey = key;
				// OPT-10: collect plain property names directly — no Array.from/filter needed
				propertyNames.add(propertyKey);
			}

			(this as Record<string, unknown>)[storageKey] = value;
			// Store in backup
			this[QUICK_VALUES_KEY][propertyKey] = value;
		}

		// Add keys from @Quick metadata to ensure smart setters work even for empty/missing properties
		// Results are cached per class — metadata is immutable after decorators run.
		const clsCtor = this.constructor;
		let clsInitCache = _CLASS_INIT_CACHE.get(clsCtor);
		if (!clsInitCache) {
			const rawTypeMap =
				(Reflect.getMetadata(QUICK_TYPE_MAP_KEY, clsCtor) as
					| Record<string, unknown>
					| undefined) ?? null;
			const rawQTypes: unknown =
				Reflect.getMetadata(QTYPES_METADATA_KEY, clsCtor.prototype) ??
				null;
			clsInitCache = {
				typeMap: rawTypeMap,
				qTypes: Array.isArray(rawQTypes)
					? (rawQTypes as unknown[]).map(String)
					: null,
			};
			_CLASS_INIT_CACHE.set(clsCtor, clsInitCache);
		}
		if (clsInitCache.typeMap) {
			for (const key of Object.keys(clsInitCache.typeMap)) {
				propertyNames.add(key);
			}
		}
		if (clsInitCache.qTypes) {
			for (const key of clsInitCache.qTypes) {
				propertyNames.add(key);
			}
		}

		// OPT-10: Pass Set directly — installLazyGetters now accepts Iterable<string>
		this.installLazyGetters(propertyNames);

		// @QTransform — apply post-deserialization field pipelines
		// OPT: Cache the field list per class constructor to avoid prototype-chain walk every construction.
		let _transformFields = _QTRANSFORM_FIELDS_CACHE.get(this.constructor);
		if (_transformFields === undefined) {
			const _collected: string[] = [];
			const _seen = new Set<string>();
			let _tProto: object | null = this.constructor.prototype as
				| object
				| null;
			while (_tProto !== null && _tProto !== Object.prototype) {
				const _ownTFields =
					(Reflect.getOwnMetadata(QTRANSFORM_FIELDS_KEY, _tProto) as
						| string[]
						| undefined) ?? [];
				for (const fld of _ownTFields) {
					if (!_seen.has(fld)) {
						_seen.add(fld);
						_collected.push(fld);
					}
				}
				_tProto = Object.getPrototypeOf(_tProto) as object | null;
			}
			_transformFields =
				_collected.length > 0 ? _collected : _EMPTY_FIELDS;
			_QTRANSFORM_FIELDS_CACHE.set(this.constructor, _transformFields);
		}

		if (_transformFields.length > 0) {
			const _tStorage = this[QUICK_VALUES_KEY];
			for (const fld of _transformFields) {
				// Collect the pipeline from closest prototype (most specific wins for override)
				const pipeline = Reflect.getMetadata(
					QTRANSFORM_PIPELINE_KEY,
					this.constructor.prototype,
					fld
				) as IQTransformFn<unknown>[] | undefined;
				if (!pipeline || pipeline.length === 0) continue;
				let val = _tStorage[fld];
				for (const tfn of pipeline) {
					val = tfn(val);
				}
				const _tStorageKey = `${QUICK_PROPERTY_KEYS}${fld}`;
				(this as Record<string, unknown>)[_tStorageKey] = val;
				_tStorage[fld] = val;
			}
		}

		// @QDefault — apply field defaults for any fields still undefined after deserialization
		// OPT: Cache the field list per class constructor to avoid prototype-chain walk every construction.
		let _defaultFields = _QDEFAULT_FIELDS_CACHE.get(this.constructor);
		if (_defaultFields === undefined) {
			const _collected: string[] = [];
			const _seen = new Set<string>();
			let _proto: object | null = this.constructor.prototype as
				| object
				| null;
			while (_proto !== null && _proto !== Object.prototype) {
				const _ownFields =
					(Reflect.getOwnMetadata(QDEFAULT_FIELDS_KEY, _proto) as
						| string[]
						| undefined) ?? [];
				for (const fld of _ownFields) {
					if (!_seen.has(fld)) {
						_seen.add(fld);
						_collected.push(fld);
					}
				}
				_proto = Object.getPrototypeOf(_proto) as object | null;
			}
			_defaultFields = _collected.length > 0 ? _collected : _EMPTY_FIELDS;
			_QDEFAULT_FIELDS_CACHE.set(this.constructor, _defaultFields);
		}

		if (_defaultFields.length > 0) {
			const storage = this[QUICK_VALUES_KEY];
			for (const fld of _defaultFields) {
				const cur = storage[fld];
				if (cur === undefined || cur === null) {
					const meta = Reflect.getMetadata(
						QDEFAULT_VALUE_KEY,
						this.constructor.prototype,
						fld
					) as IQDefaultDescriptor<unknown> | undefined;
					if (meta !== undefined) {
						const resolved =
							'factory' in meta
								? (meta.factory as () => unknown)()
								: meta.value;
						const storageKey = `${QUICK_PROPERTY_KEYS}${fld}`;
						(this as Record<string, unknown>)[storageKey] =
							resolved;
						storage[fld] = resolved;
						propertyNames.add(fld);
					}
				}
			}
		}

		// Trace construction lifecycle
		if (TraceLogger.isEnabled('info', this.constructor)) {
			TraceLogger.traceConstruction(
				this.constructor.name,
				this.constructor,
				propertyNames.size
			);
		}

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
	 *
	 * OPT: Result cached per (class, key) in `_HAS_ACCESSOR_CACHE`. The prototype chain
	 * is only traversed on the FIRST construction per class per property key; all subsequent
	 * constructions hit the cache in O(1). The cache is also shared with `installLazyGetters`
	 * so the work is paid at most once per (class, key) across both callers.
	 */
	private hasAccessor(key: string): boolean {
		const clsCon = this.constructor;
		let accessorCache = _HAS_ACCESSOR_CACHE.get(clsCon);
		if (!accessorCache) {
			accessorCache = new Map<string, boolean>();
			_HAS_ACCESSOR_CACHE.set(clsCon, accessorCache);
		}
		const cached = accessorCache.get(key);
		if (cached !== undefined) return cached;

		let current = Object.getPrototypeOf(this);
		while (current && current !== Object.prototype) {
			const descriptor = Object.getOwnPropertyDescriptor(current, key);
			if (descriptor && (descriptor.get || descriptor.set)) {
				const isGenerated = Reflect.getMetadata(
					'qtype:generated',
					current,
					key
				);
				if (!isGenerated) {
					accessorCache.set(key, true);
					return true;
				}
			}
			current = Object.getPrototypeOf(current);
		}
		accessorCache.set(key, false);
		return false;
	}

	/**
	 * Installs getters that retrieve values from backup storage if overwritten by Bun/compiler.
	 */
	private installLazyGetters(keys: Iterable<string>): void {
		for (const key of keys) {
			// 1. Check for existing own property descriptor (e.g. from @QType handled manually)
			const ownDescriptor = Object.getOwnPropertyDescriptor(this, key);
			if (ownDescriptor && ownDescriptor.get) {
				continue;
			}

			// 2. Check prototype chain for user-defined accessors (result cached per class)
			const clsCon = this.constructor;
			let accessorCache = _HAS_ACCESSOR_CACHE.get(clsCon);
			if (!accessorCache) {
				accessorCache = new Map<string, boolean>();
				_HAS_ACCESSOR_CACHE.set(clsCon, accessorCache);
			}
			if (!accessorCache.has(key)) {
				let computed = false;
				let proto = Object.getPrototypeOf(this);
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
							computed = true;
							break;
						}
					}
					proto = Object.getPrototypeOf(proto);
				}
				accessorCache.set(key, computed);
			}

			// If user defined a custom getter/setter, do NOT install smart setter
			if (accessorCache.get(key) === true) {
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
						let strictOptions: unknown = null;

						// Resolve transformer spec from per-class cache (hot path).
						// Metadata is immutable after decorators run, so caching is safe.
						const cls = this.constructor as Function;
						let clsSetterCache = _SETTER_META_CACHE.get(cls);
						if (!clsSetterCache) {
							clsSetterCache = new Map<string, IQSetterMeta>();
							_SETTER_META_CACHE.set(cls, clsSetterCache);
						}

						const cachedMeta = clsSetterCache.get(key);
						if (cachedMeta !== undefined) {
							// Already resolved for this (class, key)
							spec = cachedMeta.spec;
							strictOptions = cachedMeta.options;
						} else {
							// First time — resolve from metadata and cache
							// 1. Try @QType metadata first (Higher specificity)
							const fieldType = Reflect.getMetadata(
								'fieldType',
								this,
								key
							);
							const arrayElementClass = Reflect.getMetadata(
								'arrayElementClass',
								this,
								key
							);
							const designType = Reflect.getMetadata(
								'design:type',
								this,
								key
							);

							if (fieldType && fieldType !== 'array') {
								spec = fieldType;
							} else if (arrayElementClass) {
								if (
									fieldType === 'array' ||
									designType === Array
								) {
									spec = [arrayElementClass];
								} else {
									spec = arrayElementClass;
								}
							}

							// 2. Fallback to @Quick map (Class-level configuration)
							if (!spec) {
								const typeMap = Reflect.getMetadata(
									QUICK_TYPE_MAP_KEY,
									cls
								) as Record<string, unknown> | undefined;
								if (typeMap?.[key] !== undefined) {
									spec = typeMap[key];
								}
							}

							strictOptions = Reflect.getMetadata(
								QUICK_OPTIONS_KEY,
								cls
							);
							clsSetterCache.set(key, {
								spec,
								options: strictOptions,
							});
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
								if (
									(
										strictOptions as {
											strict?: boolean;
										} | null
									)?.strict
								) {
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
						const cls = this.constructor as Function;
						const cachedOpts = _SETTER_META_CACHE
							.get(cls)
							?.get(key)?.options;
						const strictOpts =
							cachedOpts !== undefined
								? cachedOpts
								: Reflect.getMetadata(QUICK_OPTIONS_KEY, cls);

						if (
							(strictOpts as { strict?: boolean } | null)?.strict
						) {
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
	 * @see {@link QModel.serialize} — JSON-safe form (converts Date → string, bigint → string, etc.)
	 * @see {@link QModel.toInterface} — original-input-format snapshot
	 * @see {@link QModel.toJSON} — JSON string shortcut
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

	/**
	 * Serializes the model instance to a plain interface object.
	 *
	 * Complex types (`Date`, `BigInt`, `Map`, `Set`, `RegExp`, …) are converted to
	 * JSON-serializable primitives according to each transformer's `serialize()` logic.
	 * `@QAlias` remapping is applied after serialization.
	 *
	 * **SOLID — Single Responsibility:** Delegates serialization to the `QSerializer` service.
	 *
	 * @param options - Optional `pick`/`omit` field list to filter the result.
	 * @returns The {@link IQAliasedSerializedInterface} snapshot with all complex types converted to primitives.
	 *
	 * @see {@link QModel.toJSON} for a JSON-string shortcut
	 * @see {@link QModel.toPlain} for a plain snapshot that keeps runtime types
	 * @see {@link QModel.toInterface} for the original-input-format snapshot
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ id: '1', name: 'John', createdAt: new Date() });
	 * const data = user.serialize();
	 * // { id: '1', name: 'John', createdAt: '2024-01-01T00:00:00.000Z' }
	 * ```
	 *
	 * @example With pick filter
	 * ```typescript
	 * const partial = user.serialize(undefined, { pick: ['id', 'name'] });
	 * // { id: '1', name: 'John' }
	 * ```
	 *
	 */
	serialize(
		options?: IQSerializationOptions
	): IQAliasedSerializedInterface<TInterface, TAliasMap>;
	serialize(
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): IQAliasedSerializedInterface<TInterface, TAliasMap>;
	serialize(
		seenOrOptions?: WeakSet<object> | IQSerializationOptions,
		options?: IQSerializationOptions
	): IQAliasedSerializedInterface<TInterface, TAliasMap> {
		const seen =
			seenOrOptions instanceof WeakSet ? seenOrOptions : undefined;
		const opts =
			seenOrOptions instanceof WeakSet
				? options
				: (seenOrOptions ?? options);
		type IModelAsRecord = Record<string, unknown>;
		const rawResult = QModel.serializer.serialize(
			this as unknown as IModelAsRecord,
			seen,
			opts
		);

		// @QSensitive: exclude sensitive fields unless includeSensitive: true
		if (!opts?.includeSensitive) {
			const sensitiveFields = Reflect.getOwnMetadata(
				QSENSITIVE_FIELDS_KEY,
				this.constructor.prototype as object
			) as string[] | undefined;
			if (sensitiveFields?.length) {
				for (const field of sensitiveFields) {
					delete rawResult[field];
				}
			}
		}

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
		if (opts?.pick) {
			const filtered = {} as IQAliasedSerializedInterface<
				TInterface,
				TAliasMap
			>;
			for (const key of opts.pick) {
				if (key in result) {
					(filtered as Record<string, unknown>)[key] = result[key];
				}
			}
			return filtered;
		}

		if (opts?.omit && opts.omit.length > 0) {
			const filtered: Record<string, unknown> = { ...result };
			for (const key of opts.omit) {
				delete filtered[key];
			}
			return filtered as IQAliasedSerializedInterface<
				TInterface,
				TAliasMap
			>;
		}

		return result as IQAliasedSerializedInterface<TInterface, TAliasMap>;
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
	 * @see {@link QModel.serialize} — plain object form (before JSON.stringify)
	 * @see {@link QModel.deserializeJson} — parse a JSON string back to a model instance
	 * @see {@link QModel.fromJSON} — alias for `deserializeJson`
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
	 * @see {@link QModel.hasIntegrity} — boolean shortcut (`checkIntegrity().length === 0`)
	 * @see {@link QModel.isValid} — also validates `@QRule` business rules
	 * @see {@link QModel.validationReport} — combined integrity + rules report
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
		return QModel._validation.checkIntegrity(
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
	 * @see {@link QModel.checkIntegrity} — transformer-level type safety (separate from rules)
	 * @see {@link QModel.isValid} — combined boolean (integrity + rules)
	 * @see {@link QModel.validationReport} — combined integrity + rules report
	 * @see {@link QModel.checkRulesAsync} — async version for predicates with I/O
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
	 *
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
	 * @see {@link QModel.checkIntegrity} — full error details array
	 * @see {@link QModel.isValid} — also validates `@QRule` business rules
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ age: 30, active: true });
	 * if (!user.hasIntegrity()) {
	 *   console.error('Type integrity violated');
	 * }
	 * ```
	 *
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
	 * @see {@link QModel.hasIntegrity} — transformer-level check only
	 * @see {@link QModel.checkRules} — business rules check only
	 * @see {@link QModel.validationReport} — full report with both integrity and rule errors
	 * @see {@link QModel.isValidAsync} — async version (supports async `@QRule` predicates)
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
	 *
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
	 * @see {@link QModel.isValid} — boolean shortcut for the same combined check
	 * @see {@link QModel.checkIntegrity} — transformer-level errors only
	 * @see {@link QModel.checkRules} — business rules errors only
	 * @see {@link QModel.validationReportAsync} — async version with async `@QRule` support
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
	 *
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
	 * @see {@link QModel.checkRules} — synchronous version (no async predicates)
	 * @see {@link QModel.isValidAsync} — combined boolean async (integrity + async rules)
	 * @see {@link QModel.validationReportAsync} — full async report
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
	 *
	 */
	async checkRulesAsync(
		options?: IQRulesAsyncOptions
	): Promise<IQRulesResult> {
		return qCheckRulesAsync(this, options);
	}

	/**
	 * Async version of `isValid()`. Returns `true` when both integrity and async rules pass.
	 *
	 * Equivalent to `hasIntegrity() && (await checkRulesAsync(options)).valid`.
	 *
	 * @param options - Optional timeout and mode settings forwarded to `checkRulesAsync()`.
	 * @returns `Promise<boolean>` — `true` when the instance passes all transformer-level
	 *   integrity checks **and** all async `@QRule` predicates.
	 *
	 * @see {@link QModel.isValid} for the synchronous version
	 * @see {@link QModel.validationReportAsync} for the full async report
	 *
	 * @example
	 * ```typescript
	 * if (!(await user.isValidAsync())) {
	 *   const report = await user.validationReportAsync();
	 *   console.log(report.integrity, report.rules.errors);
	 * }
	 * ```
	 *
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
	 * @param options - Optional execution settings (mode, timeoutMs, timeoutMessage).
	 * @returns `Promise<IQValidationReport>` — `{ valid, integrity, rules }`.
	 *
	 * @see {@link QModel.validationReport} for the synchronous version
	 * @see {@link QModel.isValidAsync} for a simple boolean shortcut
	 *
	 * @example
	 * ```typescript
	 * const report = await user.validationReportAsync({ timeoutMs: 300 });
	 * if (!report.valid) {
	 *   console.log('Integrity:', report.integrity);
	 *   console.log('Rules:', report.rules.errors);
	 * }
	 * ```
	 *
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
	 * Unified validation method that combines integrity checks and `@QRule` evaluation.
	 *
	 * - Called without options → runs `validationReport()` synchronously.
	 * - Called with `{ async: true }` → runs `validationReportAsync()` and returns a
	 *   `Promise<IQValidateResult>`.
	 * - Called with `{ groups: [...] }` → only evaluates rules for the listed groups.
	 *
	 * @param options - Optional settings. See {@link IQValidateOptions}.
	 * @returns `IQValidateResult` (sync) or `Promise<IQValidateResult>` when `async: true`.
	 *
	 * @see {@link QModel.validationReport} — underlying sync implementation
	 * @see {@link QModel.validationReportAsync} — underlying async implementation
	 *
	 * @example Sync
	 * ```typescript
	 * const result = user.validate();
	 * if (!result.valid) console.log(result.rules.errors);
	 * ```
	 *
	 * @example Async
	 * ```typescript
	 * const result = await user.validate({ async: true });
	 * ```
	 *
	 * @example Group filter
	 * ```typescript
	 * const result = user.validate({ groups: ['personal'] });
	 * ```
	 *
	 */
	validate(
		options: IQValidateOptions & { async: true }
	): Promise<IQValidateResult>;
	validate(
		options?: IQValidateOptions & { async?: false | undefined }
	): IQValidateResult;
	validate(
		options?: IQValidateOptions
	): IQValidateResult | Promise<IQValidateResult> {
		const integrity = this.checkIntegrity();

		if (options?.async === true) {
			// Async path
			const { groups, async: _async, ...asyncOpts } = options;
			if (groups !== undefined && groups.length > 0) {
				// Combine rules for each requested group
				return (async () => {
					const allErrors: IQRulesResult['errors'] = [];
					for (const grp of groups) {
						const res = await qCheckRulesAsync(this, {
							...asyncOpts,
							group: grp,
						});
						allErrors.push(...res.errors);
					}
					const combinedRules: IQRulesResult = {
						valid: allErrors.length === 0,
						errors: allErrors,
					};
					return {
						valid: integrity.length === 0 && combinedRules.valid,
						integrity,
						rules: combinedRules,
					};
				})();
			}
			return (async () => {
				const rules = await qCheckRulesAsync(this, asyncOpts);
				return {
					valid: integrity.length === 0 && rules.valid,
					integrity,
					rules,
				};
			})();
		}

		// Sync path
		const groups = options?.groups;
		if (groups !== undefined && groups.length > 0) {
			// Combine rules for each requested group
			const allErrors: IQRulesResult['errors'] = [];
			for (const grp of groups) {
				const res = qCheckRules(this, { group: grp });
				allErrors.push(...res.errors);
			}
			const combinedRules: IQRulesResult = {
				valid: allErrors.length === 0,
				errors: allErrors,
			};
			return {
				valid: integrity.length === 0 && combinedRules.valid,
				integrity,
				rules: combinedRules,
			};
		}

		const rules = this.checkRules();
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
	 * @see {@link QModel.getFormSchemaGrouped} — same schema organised by `@QGroup` sections
	 * @see {@link QModel.getFormSchema} — static variant (no instance required)
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
	 * @see {@link QModel.getFormSchemaGrouped} — same schema organised by `@QGroup` sections
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
	 * @returns Ordered array of `{ group, fields }` entries — see {@link IQFormSchemaGroup}.
	 *
	 * @see {@link QModel.getFormSchema} — flat (un-grouped) list
	 * @see {@link QModel.getFormSchemaGrouped} — static variant (no instance required)
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
	 *
	 * @returns Ordered array of `{ group, fields }` entries — see {@link IQFormSchemaGroup}.
	 *
	 * @see {@link QModel.getFormSchema} — flat (un-grouped) list
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
		const cached = _ALIAS_MAP_CACHE.get(startProto);
		if (cached) return cached;

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

		_ALIAS_MAP_CACHE.set(startProto, map);
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
	 * @see {@link QModel.fromJSON} — deserialize from a JSON string
	 * @see {@link QModel.deserializeJson} — alias for `fromJSON`
	 * @see {@link QModel.serialize} — serialize a model instance back to a plain object
	 * @see {@link QModel.create} — factory alias that wraps the constructor
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
	 * @throws {SyntaxError} If `json` is not valid JSON
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
	 * @throws {SyntaxError} If `json` is not valid JSON
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
	 * @see {@link QModel.toInterface} — current state in the same format
	 * @see {@link QModel.reset} — restore the instance to this initial state
	 * @see {@link QModel.isDirty} — check whether the current state diverges from this baseline
	 * @see {@link QModel.getChanges} — diff between current and initial state
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
	 * @see {@link QModel.isDirty} — per-field variant, also accepts no argument
	 * @see {@link QModel.getChanges} — returns the changed fields with their values
	 * @see {@link QModel.getChangedFields} — array of changed field names
	 * @see {@link QModel.reset} — revert all fields to initial state
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
	 * @see {@link QModel.hasChanges} — equivalent call for the no-argument case
	 * @see {@link QModel.getDirtyFields} — `Set<string>` of all changed field names
	 * @see {@link QModel.getChangedFields} — array of all changed field names
	 * @see {@link QModel.getChanges} — changed fields with their current values
	 * @see {@link QModel.reset} — revert all fields to initial state
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
	 *
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
	 * @see {@link QModel.getChangedFields} — same information as an array
	 * @see {@link QModel.getChanges} — changed fields with their current values
	 * @see {@link QModel.isDirty} — check a single field or any field
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
	 * @see {@link QModel.getChangedFields} for an array of changed field names
	 * @see {@link QModel.getDirtyFields} for a `Set<string>` of changed field names
	 * @see {@link QModel.patch} to apply partial updates
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
	 *
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
	 *
	 */
	patch(patch: Partial<IQModelData<TInterface>>): void {
		// @QReadonly guard — reject any patch that targets an immutable field
		if (patch !== undefined) {
			const roFields = collectReadonlyFields(
				this.constructor.prototype as object
			);
			if (roFields.length > 0) {
				for (const fld of roFields) {
					if (fld in patch) {
						throw new ImmutableFieldError(
							fld,
							(this.constructor as { name?: string }).name ??
								'QModel'
						);
					}
				}
			}
		}
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
	 * Returns a **new instance** that is an immutable copy of the current state,
	 * optionally overriding specific fields.
	 *
	 * - `copy()` — deep copy with identical data (new reference).
	 * - `copy({ key: value })` — new instance with partial fields overridden.
	 *
	 * The new instance has its initial state set to the copied data, so:
	 * - `isDirty()` returns `false`
	 * - `reset()` reverts to the copied state (not the original)
	 *
	 * All type transformations (Date, BigInt, Set, etc.) are applied.
	 *
	 * **Framework reactivity:** Because `copy()` always returns a new reference,
	 * it is safe to use with any signal / store / ref system:
	 * ```typescript
	 * // Angular
	 * userSignal.update(u => u.copy({ name: 'Bob' }))
	 * // Vue
	 * userRef.value = user.copy({ name: 'Bob' })
	 * // React
	 * setUser(user.copy({ name: 'Bob' }))
	 * // patch() batch + copy() to emit
	 * user.patch({ name: 'Bob', age: 31 })
	 * userSignal.set(user.copy())
	 * ```
	 *
	 * @param partial - Optional fields to override in the new instance
	 * @returns A new model instance
	 *
	 * @see {@link QModel.patch} — in-place mutation instead of a new instance
	 * @see {@link QModel.reset} — revert the current instance (no new object created)
	 * @see {@link QModel.equals} — compare two instances for deep equality
	 *
	 * @example
	 * ```typescript
	 * const user = new User({ name: 'John', age: 30 });
	 *
	 * const clone   = user.copy();                 // identical copy
	 * const updated = user.copy({ name: 'Jane' }); // copy with override
	 *
	 * user.name;     // 'John'  ← original unchanged
	 * updated.name;  // 'Jane'
	 * updated.age;   // 30      ← fields not in partial are preserved
	 * updated.isDirty(); // false
	 * ```
	 *
	 */
	copy(partial?: Partial<IQModelData<TInterface>>): this {
		// @QReadonly guard — reject copy() calls that include an immutable field
		if (partial !== undefined) {
			const roFields = collectReadonlyFields(
				this.constructor.prototype as object
			);
			if (roFields.length > 0) {
				for (const fld of roFields) {
					if (fld in partial) {
						throw new ImmutableFieldError(
							fld,
							(this.constructor as { name?: string }).name ??
								'QModel'
						);
					}
				}
			}
		}
		// Use deserialize() (Object.create) instead of new Constructor() to avoid
		// TypeScript property initializers (e.g. `id!: string` compiles to
		// `this.id = undefined`) overwriting QModel's lazy getters after construction.
		const Constructor = this
			.constructor as unknown as IModelConstructor<this>;
		// Include sensitive fields when cloning internally so the copy retains all data.
		const current = this.serialize({ includeSensitive: true });
		const data = partial ? { ...current, ...partial } : { ...current };
		const instance = Constructor.deserialize(
			data as unknown as IQModelData<IQAnyRecord>
		);
		// Inject __initData so isDirty() / reset() work correctly on the copy.
		// deserialize() bypasses the constructor so __initData is never set — we
		// set it here to the merged state so reset() reverts to this snapshot.
		Object.defineProperty(instance, '__initData', {
			value: { ...data },
			writable: false,
			enumerable: false,
			configurable: true,
		});
		return instance;
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
	 * @see {@link QModel.equals} — boolean equality shortcut (no diff detail)
	 * @see {@link QModel.getChanges} — diff against the construction baseline (not another instance)
	 * @see {@link QModel.serialize} — the serialized form used for comparison
	 *
	 * @example
	 * ```typescript
	 * const a = new User({ name: 'John', age: 30 });
	 * const b = new User({ name: 'Jane', age: 31 });
	 *
	 * a.diff(b);
	 * // { name: { before: 'John', after: 'Jane' }, age: { before: 30, after: 31 } }
	 * ```
	 *
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
	 * @see {@link QModel.diff} — field-by-field diff with before/after values
	 * @see {@link QModel.copy} — create an equal copy with a new reference
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
	 *
	 */
	equals(other: this): boolean {
		return Object.keys(this.diff(other)).length === 0;
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
	 * @see {@link QModel.getSchema} — instance variant that enriches the schema with actual example values
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
	static getSchema<
		T extends import('@/core/types/schema-types').IQSchemaType,
	>(type: T): import('@/core/types/schema-types').IQSchemaReturnType<T>;
	static getSchema(
		type: import('@/core/types/schema-types').IQSchemaType
	): unknown {
		// ── OPT: Per-class, per-format cache ─────────────────────────────────
		// Schema metadata is immutable after class definition (decorators ran).
		// Caching the result avoids: require(), Reflect.getMetadata(), object
		// allocation, switch dispatch — on every subsequent call.
		let classCache = _GET_SCHEMA_CACHE.get(this);
		if (!classCache) {
			classCache = new Map<string, unknown>();
			_GET_SCHEMA_CACHE.set(this, classCache);
		}
		const cached = classCache.get(type);
		if (cached !== undefined) return cached;

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

		const gen = getSchemaGenerator(type);
		if (!gen) {
			if (hasSchemaGenerators()) {
				throw new Error(
					`[QuickModel] Unknown schema type: '${String(type)}'. ` +
						`Registered formats: json, zod, mongo, typescript, graphql, openapi, ajv, prisma, valibot, yup, drizzle, typebox, effect-schema.`
				);
			}
			throw new Error(
				`[QuickModel] Schema generation is not available. ` +
					`Import 'quickmodel/schema' to enable getSchema():\n\n` +
					`  import 'quickmodel/schema';\n\n` +
					`If you are using the full 'quickmodel' package (not 'quickmodel/core'), ` +
					`this should have been registered automatically.`
			);
		}
		const result = gen(config);
		classCache.set(type, result);
		return result;
	}

	/**
	 * Generate schema with examples from instance values.
	 *
	 * For JSON/OpenAPI schemas, adds `example` fields with actual values from the instance.
	 *
	 * @param type - Schema type to generate
	 * @returns Generated schema with examples
	 *
	 * @see {@link QModel.getSchema} — static variant (no examples, returns raw schema)
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
	getSchema<T extends import('@/core/types/schema-types').IQSchemaType>(
		type: T
	): import('@/core/types/schema-types').IQSchemaReturnType<T>;
	getSchema(type: import('@/core/types/schema-types').IQSchemaType): unknown {
		// For JSON/OpenAPI, add examples from instance — call with narrowed literal so TS infers Record
		if (type === 'json' || type === 'openapi') {
			const classSchema = (this.constructor as typeof QModel).getSchema(
				type
			);
			const addExamples = getAddExamplesFn();
			if (
				addExamples &&
				typeof classSchema === 'object' &&
				classSchema !== null
			) {
				return addExamples(classSchema, this);
			}
			return classSchema;
		}

		return (this.constructor as typeof QModel).getSchema(type);
	}

	/**
	 * Converts a formal schema back into a QuickModel class definition (TypeScript source).
	 *
	 * This is the **inverse** of `QModel.getSchema()`:
	 * ```typescript
	 * // Forward: model → schema
	 * const json = User.getSchema('json');
	 *
	 * // Reverse: schema → model class source
	 * const code = QModel.fromSchema('json', json, 'User');
	 * ```
	 *
	 * Supported formats:
	 * - `'json'` — JSON Schema Draft-07 object
	 * - `'openapi'` — OpenAPI 3.0 component schema or full document
	 * - `'ajv'` — AJV-compatible JSON Schema (same structure as `'json'`)
	 * - `'typescript'` — TypeScript interface source string
	 *
	 * @param format - Schema format to parse.
	 * @param schema - The schema to convert (type depends on `format`).
	 * @param className - Optional class name override. Falls back to `schema.title` or `'GeneratedModel'`.
	 * @returns TypeScript source code string for a class extending `QModel`.
	 *
	 * @example
	 * ```typescript
	 * import 'quickmodel/schema'; // register schema generators first
	 *
	 * const jsonSchema = User.getSchema('json');
	 * const code = QModel.fromSchema('json', jsonSchema, 'User');
	 * // → complete TypeScript source for class User extends QModel<IUser>
	 * ```
	 *
	 * @see {@link SchemaToModelService} — service powering this method
	 * @see {@link QFromSchemaTool} — MCP tool wrapping this method
	 */
	static fromSchema<T extends IFromSchemaFormat>(
		format: T,
		schema: IFromSchemaInput<T>,
		className?: string
	): string {
		return SchemaToModelService.fromSchema(format, schema, className);
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

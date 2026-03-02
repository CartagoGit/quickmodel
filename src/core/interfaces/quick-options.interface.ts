/**
 * Advanced option types for the `@Quick()` decorator's second parameter.
 *
 * Exports helper types used to infer discriminator keys and constructors
 * from type-spec arrays, as well as the main `IQAdvancedOptions` interface
 * and the `IQDiscriminatorConfig` discriminated union.
 *
 * @module core/interfaces/quick-options.interface
 * @see {@link IQAdvancedOptions} — main options interface for the second `@Quick()` parameter
 * @see {@link IQDiscriminatorConfig} — discriminated union config for polymorphic fields
 * @see {@link Quick} — decorator that consumes these options
 */

import type {
	IQMockerFn,
	IQSerializerFn,
	IQTransformerFn,
} from './transform-options.interface';
import type {
	IQTraceVerbosity,
	IQTraceEvent,
	IQTraceEntry,
} from '../config/quick.config';
import { IQCaseOptions } from '../types/case.type';
import type { IQSpoofMethod } from '../types/form-data.type';
import type { IQHistoryConfig } from './history.interface';

/**
 * Extract constructor types from IQSpec or IQSpecs.
 *
 * This helper type extracts all constructor types from a spec definition,
 * which can be used to type discriminator functions properly.
 *
 * @example
 * ```typescript
 * type Spec1 = typeof Date;             // IQExtractConstructors<Spec1> = DateConstructor
 * type Spec2 = [typeof Date, typeof BigInt];  // IQExtractConstructors<Spec2> = DateConstructor | BigIntConstructor
 * type Spec3 = (v: any) => any;         // IQExtractConstructors<Spec3> = (v: any) => any (passthrough for functions)
 * type Spec4 = 'bigint';                // IQExtractConstructors<Spec4> = 'bigint' (passthrough for string literals)
 * ```
 */
export type IQExtractConstructors<TSpec> = TSpec extends readonly unknown[]
	? TSpec[number]
	: TSpec;

/**
 * Extract instance type from a constructor.
 *
 * @example
 * ```typescript
 * type Instance1 = IQExtractInstanceType<typeof Date>;  // Date
 * type Instance2 = IQExtractInstanceType<DateConstructor>;  // Date
 * ```
 * @see {@link IQExtractConstructors} — extract constructors from an IQSpec
 * @see {@link IQExtractIQModelInterface} — extract the model interface from a QModel constructor
 */
export type IQExtractInstanceType<T> = T extends new (
	...args: unknown[]
) => infer R
	? R
	: never;

/**
 * Convert a union to an intersection.
 *
 * @example
 * ```typescript
 * type Union = { a: string } | { b: number };
 * type Intersection = IUnionToIntersection<Union>;  // { a: string } & { b: number }
 * ```
 */
export type IUnionToIntersection<U> = (
	U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never;

/**
 * Extract common keys from all types in a union.
 *
 * Finds properties that exist in **all** union members — these are valid discriminator fields.
 * Uses a distributive conditional type to check each member of the union.
 *
 * @example
 * ```typescript
 * type IContent  = { type: 'content';  text: string; };
 * type IMetadata = { type: 'metadata'; tags: string[]; };
 *
 * type ICommon = IQExtractCommonKeys<IContent | IMetadata>;
 * //   ICommon = 'type'  ← the only key present in both union members
 * ``` *
 * @see {@link IQAdvancedOptions} — uses `IQExtractCommonKeys` to validate discriminator keys
 * @see {@link IQDiscriminatorConfig} — discriminator configuration that constrains the key type */
export type IQExtractCommonKeys<T> =
	// Get all possible keys from the union
	keyof T extends infer K
		? K extends keyof T
			? // Check if this key exists in ALL members of the union
				(
					T extends unknown
						? K extends keyof T
							? true
							: false
						: never
				) extends true
				? K
				: never
			: never
		: never;

/**
 * Extract the interface type from a QModel class.
 *
 * QModel classes extend `QModel<IInterface>`, this extracts the IInterface type.
 *
 * @example
 * ```typescript
 * class Content extends QModel<IContent> { ... }
 * type Interface = IQExtractIQModelInterface<Content>;  // IContent
 * ```
 * @see {@link QModel.$qToInterface} — the runtime method this mirrors at the type level
 * @see {@link IQExtractValidDiscriminatorKeys} — uses this to extract discriminator keys
 */
export type IQExtractIQModelInterface<T> = T extends { toInterface(): infer I }
	? I
	: T;

/**
 * Extract common keys from constructors in an IQSpec.
 *
 * For arrays of constructors, extracts keys that exist in all instance types.
 * For QModel classes, extracts keys from the interface type, not the class instance.
 * For single constructors, extracts all keys from the instance type.
 *
 * @example
 * ```typescript
 * // With QModel classes
 * class Content extends QModel<IContent> { ... }
 * class Metadata extends QModel<IMetadata> { ... }
 * type Keys1 = IQExtractValidDiscriminatorKeys<[typeof Content, typeof Metadata]>;  // 'type'
 *
 * // With regular constructors
 * type Keys2 = IQExtractValidDiscriminatorKeys<typeof Date>;  // keyof Date
 * ```
 */
export type IQExtractValidDiscriminatorKeys<TSpec> =
	TSpec extends readonly (new (...args: unknown[]) => unknown)[]
		? // Array of constructors → extract common keys from interface types
			IQExtractCommonKeys<
				IQExtractIQModelInterface<IQExtractInstanceType<TSpec[number]>>
			>
		: TSpec extends new (...args: unknown[]) => unknown
			? // Single constructor → all keys from interface type
				keyof IQExtractIQModelInterface<IQExtractInstanceType<TSpec>>
			: // Not a constructor → string (no validation)
				string;

/**
 * Type guard function for custom discriminator logic.
 *
 * Now properly typed to return only constructors that match the property's spec.
 *
 * @param data - Raw data object to check
 * @returns The constructor that matches the data type (must be one of the declared types)
 *
 * @see {@link IQDiscriminatorConfig} — used inside discriminator configuration
 * @see {@link IQAdvancedOptions} — parent interface that hosts discriminators
 *
 * **IMPORTANT**: Cannot return `undefined` unless explicitly declared in types.
 * - If `items: [Content, Metadata]` → Must return `Content` or `Metadata`
 * - If `items: [Content, Metadata, undefined]` → Can return `Content`, `Metadata`, or `undefined`
 *
 * @example
 * ```typescript
 * // ✅ CORRECT: Always returns one of the declared types
 * @Quick({ items: [Content, Metadata] }, {
 *   discriminators: {
 *     items: (data) => {
 *       if ('text' in data) return Content;
 *       if ('tags' in data) return Metadata;
 *       return Content;  // fallback - must be one of the declared types
 *     }
 *   }
 * })
 *
 * // ❌ WRONG: Cannot return undefined unless explicitly declared
 * @Quick({ items: [Content, Metadata] }, {
 *   discriminators: {
 *     items: (data) => {
 *       if ('text' in data) return Content;
 *       return undefined;  // ❌ Type error!
 *     }
 *   }
 * })
 *
 * // ✅ CORRECT: undefined is explicitly allowed
 * @Quick({ items: [Content, Metadata, undefined] }, {
 *   discriminators: {
 *     items: (data) => {
 *       if ('text' in data) return Content;
 *       return undefined;  // ✅ OK because undefined is in the type spec
 *     }
 *   }
 * })
 * ``` *
 * @see {@link IQDiscriminatorConfig} — uses this function type as a discriminator strategy
 * @see {@link IQAdvancedOptions} — the options object where this function is configured */
export type IQTypeGuardFunction<TConstructors> = (
	data: unknown
) => TConstructors;

/**
 * Discriminator configuration for a property with union types.
 *
 * Now properly typed to ensure:
 * - String discriminators are validated against common keys
 * - Discriminator functions return the correct types
 * - Object discriminators have proper field and mapping types
 *
 * **Simple form** - Just the field name (validated against common keys):
 * ```typescript
 * discriminators: {
 *   items: 'type'  // ✅ Only allows keys that exist in ALL types
 * }
 * ```
 *
 * **With explicit mapping**:
 * ```typescript
 * discriminators: {
 *   items: {
 *     field: 'type',  // ✅ Validated against common keys
 *     mapping: {
 *       'content': Content,
 *       'metadata': Metadata
 *     }
 *   }
 * }
 * ```
 *
 * **With custom function** (now with proper type inference):
 * ```typescript
 * discriminators: {
 *   items: (data) => 'text' in data ? Content : Metadata
 *   // TypeScript knows this must return Content | Metadata based on items: [Content, Metadata]
 * }
 * ```
 * @group Types
 *
 * @see {@link IQTypeGuardFunction} — function type used as a discriminator in this config
 * @see {@link IQAdvancedOptions} — options object that maps property names to IQDiscriminatorConfig
 */
export type IQDiscriminatorConfig<
	TConstructors = unknown,
	TValidKeys extends string = string,
> =
	| TValidKeys // Field name (validated against common keys)
	| IQTypeGuardFunction<TConstructors> // Custom function with proper typing
	| {
			/** Field name to use as discriminator (validated against common keys) */
			field: TValidKeys;
			/** Optional mapping from discriminator value to constructor */
			mapping?: Record<string, TConstructors>;
	  };

/**
 * Advanced options for @Quick() decorator (second parameter).
 *
 * Now with proper key inference from the typeMap.
 *
 * @template TTypeMap - The type map passed to @Quick() (first parameter)
 *
 * @see {@link Quick} — decorator that accepts these options as its second parameter
 * @see {@link IQDiscriminatorConfig} — discriminator configuration type
 * @see {@link IQTypeGuardFunction} — custom type guard function type
 *
 * @example
 * **Simple discriminator by field name**:
 * ```typescript
 * interface IContent { type: 'content'; text: string; }
 * interface IMetadata { type: 'metadata'; tags: string[]; }
 *
 * @Quick({
 *   items: [Content, Metadata]
 * }, {
 *   discriminators: {
 *     items: 'type'  // ✅ TypeScript knows 'items' is a valid key
 *   }
 * })
 * class Data extends QModel<IData> {
 *   declare items: (Content | Metadata)[];
 * }
 * ```
 *
 * @example
 * **With explicit mapping**:
 * ```typescript
 * @Quick({
 *   items: [Content, Metadata]
 * }, {
 *   discriminators: {
 *     items: {  // ✅ TypeScript knows 'items' is a valid key
 *       field: 'type',
 *       mapping: {
 *         'content': Content,    // ✅ Must be Content or Metadata
 *         'metadata': Metadata
 *       }
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * **With custom type guard function** (with proper type inference):
 * ```typescript
 * @Quick({
 *   items: [Content, Metadata]
 * }, {
 *   discriminators: {
 *     items: (data) => {
 *       // ✅ TypeScript knows this must return Content or Metadata
 *       if ('text' in data) return Content;
 *       if ('tags' in data) return Metadata;
 *       return Content;  // ✅ Fallback must also be Content or Metadata
 *     }
 *   }
 * })
 * ``` *
 * @see {@link Quick} — decorator that accepts an `IQAdvancedOptions` as its second argument
 * @see {@link IQDiscriminatorConfig} — discriminator configuration type used within this interface */

export interface IQAdvancedOptions<
	TTypeMap extends Record<string, unknown> = Record<string, unknown>,
> {
	/**
	 * Discriminator configuration for union type properties.
	 *
	 * Maps property names to their discriminator configuration.
	 * Keys are inferred from the typeMap, and discriminator functions
	 * are typed to return only the constructors declared in the typeMap.
	 * String discriminators are validated to be common keys across all types.
	 *
	 * - **string**: Field name to use as discriminator (validated against common keys)
	 * - **function**: Custom type guard function (properly typed)
	 * - **object**: Full configuration with field and mapping
	 */
	discriminators?: {
		[K in keyof TTypeMap]?: IQDiscriminatorConfig<
			IQExtractConstructors<TTypeMap[K]>,
			IQExtractValidDiscriminatorKeys<TTypeMap[K]> & string
		>;
	};

	/**
	 * Behavior when encountering properties in input data that are not defined in the model.
	 *
	 * - **keep** (default): Preserves extra properties.
	 * - **strip**: Silently removes extra properties.
	 * - **error**: Throws an error.
	 */
	unknownPropertyPolicy?: 'keep' | 'strip' | 'error';

	/**
	 * Automatically excludes properties starting with internal prefixes (default: `_`, `$`) from population.
	 *
	 * - `true`: Strips properties starting with `_` or `$` (or global configured prefixes).
	 * - `false`: Allows internal properties.
	 * - `string[]`: Strips properties starting with these specific prefixes (overrides global).
	 *
	 * Used to protect internal state from mass-assignment attacks.
	 */
	stripInternalIdentifiers?: boolean | string[];

	/**
	 * Date serialization strategy.
	 */
	dateStrategy?: 'iso' | 'timestamp' | 'native';

	/**
	 * HTTP method to spoof via a `_method` field appended as the first entry of
	 * the resulting `FormData` when calling `toFormData()`.
	 *
	 * Enables frameworks such as Laravel, Symfony, and Rails to receive `PUT`,
	 * `PATCH`, `DELETE`, WebDAV, and other non-`POST` methods through a standard
	 * `multipart/form-data` `POST` request.
	 *
	 * **Cascading precedence** (lowest → highest):
	 * `QConfig.defaults.spoofMethod` → `@Quick({}, { spoofMethod })` → `toFormData({ spoofMethod })`
	 *
	 * @see {@link IQSpoofMethod} for the full list of valid values
	 */
	spoofMethod?: IQSpoofMethod;

	/**
	 * Case transformation strategy for input (API -> Model) and output (Model -> API).
	 */
	transformCase?: IQCaseOptions;

	/**
	 * Strategy for reporting integrity errors.
	 *
	 * - **failFast**: Returns immediately on the first error encountered (optimized).
	 * - **accumulate** (default): Collects and returns all integrity errors.
	 */
	integrityErrorStrategy?: 'failFast' | 'accumulate';

	/**
	 * Key alias map for input remapping (API → model) and output remapping (model → API).
	 *
	 * Maps each model property name to its external alias key. During construction, alias keys
	 * in the input are automatically renamed to the property name. During `serialize()`, property
	 * names are renamed back to the alias keys in the output.
	 *
	 * **Type-safe alternative to `@QAlias`**: unlike `@QAlias`, the alias map provided here is
	 * visible to TypeScript at compile time when combined with the second generic of `QModel`.
	 * Pass the same map as `TAliasMap` to `QModel<TInterface, TAliasMap>` so that `serialize()`
	 * returns a correctly typed object with alias keys — enabling IDE autocomplete without casts.
	 *
	 * @example
	 * ```typescript
	 * type IUserAliases = { firstName: 'first_name'; lastName: 'last_name' };
	 *
	 * @Quick({}, { alias: { firstName: 'first_name', lastName: 'last_name' } })
	 * class User extends QModel<IUser, IUserAliases> {
	 *   declare firstName: string;
	 *   declare lastName: string;
	 * }
	 *
	 * const user = new User({ first_name: 'Alice', last_name: 'Smith' });
	 * user.firstName;             // 'Alice'
	 * user.$qSerialize().first_name; // 'Alice' — typed correctly ✅
	 * ```
	 */
	alias?: Record<string, string>;

	/**
	 * When to run integrity check.
	 *
	 * - **manual** (default): Check must be triggered explicitly via `.$qCheckIntegrity()`.
	 * - **construction**: Check runs automatically after population. Throws if it fails.
	 */
	validationTrigger?: 'manual' | 'construction';

	/**
	 * Enable internal debug logging for this model.
	 * Useful for troubleshooting transformation or validation issues.
	 */
	enableDebugLogs?: boolean;

	/**
	 * Per-model structured trace configuration.
	 *
	 * Overrides the global `QConfig.configure({ defaults: { trace: { ... } } })` setting
	 * for this specific model class only.
	 *
	 * @example
	 * ```typescript
	 * @Quick({ createdAt: Date }, {
	 *   trace: {
	 *     verbosity: 'verbose',
	 *     events: ['rule-fail', 'construction'],
	 *   }
	 * })
	 * class OrderModel extends QModel<IOrder> { ... }
	 * ```
	 */
	trace?: {
		/**
		 * Minimum verbosity level to emit for this model.
		 * Overrides the global `trace.verbosity`.
		 */
		verbosity?: IQTraceVerbosity;

		/**
		 * Filter which lifecycle events to trace for this model.
		 * When omitted, all events matching `verbosity` are traced.
		 */
		events?: IQTraceEvent[];

		/**
		 * Custom sink for trace entries from this model only.
		 * When provided, entries are forwarded here **instead of** `console`.
		 */
		sink?: (entry: IQTraceEntry) => void;
	};

	/**
	 * Include fields with undefined/null values in the serialized output.
	 *
	 * - **true**: `key: null` or `key: undefined` are included in JSON.
	 * - **false** (default): Keys with undefined values are omitted (standard JSON behavior for undefined).
	 */
	exposeUnsetFields?: boolean;

	/**
	 * String normalization options (per-model override).
	 */
	normalization?: {
		trimStrings?: boolean;
		emptyStringAsNull?: boolean;
	};

	/**
	 * Type coercion strategy (per-model override).
	 */
	coercionStrategy?: 'strict' | 'loose';

	/**
	 * If true, converts all `null` values to `undefined`.
	 */
	nullToUndefined?: boolean;

	/**
	 * Maximum allowed length for arrays during deserialization.
	 * Overrides the global default limit for this model.
	 *
	 * Used to mitigate DoS attacks via massive arrays.
	 *
	 * @default 10000 (configurable via global config)
	 */
	maxArrayLength?: number;

	/**
	 * Custom transformers for specific properties.
	 *
	 * Allows overriding the default deserialization logic for specific fields
	 * by providing a custom function that receives the raw value and returns the transformed value.
	 *
	 * @example
	 * ```typescript
	 * @Quick({
	 *   status: String // Normal string
	 * }, {
	 *   transformers: {
	 *     status: (val) => val.toUpperCase() // Custom transformation
	 *   }
	 * })
	 * ```
	 */
	transformers?: {
		[K in keyof TTypeMap]?: IQTransformerFn;
	};

	/**
	 * Custom serializers for specific properties.
	 *
	 * Allows defining the reverse transformation logic (Model -> Interface) for specific fields.
	 * Critical when using custom transformers that function as one-way mappings, or when
	 * the default serialization behavior needs to be overridden for specific fields.
	 *
	 * @example
	 * ```typescript
	 * @Quick({
	 *   date: Date
	 * }, {
	 *   transformers: {
	 *     // Deserialize: seconds -> Date
	 *     date: (val) => new Date(val * 1000)
	 *   },
	 *   serializers: {
	 *     // Serialize: Date -> seconds
	 *     date: (val: Date) => Math.floor(val.getTime() / 1000)
	 *   }
	 * })
	 * ```
	 */
	serializers?: {
		[K in keyof TTypeMap]?: IQSerializerFn;
	};

	/**
	 * Custom mock generators for specific properties.
	 *
	 * Allows defining how to generate mock data for specific fields.
	 * Critical when using custom transformers where the default mock generation
	 * (which infers from type) might produce invalid/incompatible data.
	 *
	 * @example
	 * ```typescript
	 * @Quick({
	 *   sku: (val) => `ITEM-${val}` // Custom transformer
	 * }, {
	 *   mockers: {
	 *     // Generate valid SKU base for the transformer
	 *     sku: () => faker.string.alphanumeric(8)
	 *   }
	 * })
	 * ```
	 */
	mockers?: {
		[K in keyof TTypeMap]?: IQMockerFn;
	};

	/**
	 * Configuration options passed to transformers.
	 *
	 * Allows configuring specific limits or behaviors for built-in transformers.
	 * e.g. maxBytes for ArrayBuffer, maxItems for TypedArray.
	 *
	 * @example
	 * ```typescript
	 * @Quick({
	 *   video: ArrayBuffer
	 * }, {
	 *   transformerOptions: {
	 *     video: { maxBytes: 5_000_000 } // Allow 5MB
	 *   }
	 * })
	 * ```
	 */
	transformerOptions?: {
		[K in keyof TTypeMap]?: Record<string, unknown>;
	};

	/**
	 * Fields to permanently exclude from serialization (`serialize()` / `toJSON()`).
	 *
	 * Useful for WeakMap/WeakSet properties, passwords, internal caches,
	 * or any field that should never appear in the output regardless of how the model is serialized.
	 *
	 * Unlike the runtime `omit` option (which is per-call), `excludeFields` is declared once
	 * in the decorator and is always applied automatically.
	 *
	 * **Deserialization is NOT affected** — the fields are still populated on the instance.
	 *
	 * @example
	 * ```typescript
	 * @Quick({ cache: WeakMap }, { excludeFields: ['cache'] })
	 * class Session extends QModel<ISession> {
	 *   declare id: string;
	 *   declare cache: WeakMap<object, any>; // runtime only — never in JSON
	 * }
	 *
	 * @Quick({}, { excludeFields: ['password', '_checksum'] })
	 * class User extends QModel<IUser> {
	 *   declare id: number;
	 *   declare password: string; // never serialized
	 * }
	 * ```
	 */
	excludeFields?: string[];

	/**
	 * Performance optimization settings.
	 */
	performance?: {
		/**
		 * Disables redundant runtime safety checks (like `Object.freeze`) when data source is trusted.
		 * Use with caution.
		 * @default false
		 */
		disableSafetyChecks?: boolean;
	};

	/**
	 * History trail configuration for this model class.
	 *
	 * When `enabled: true`, every `$qPatch()`, `$qCopy()`, and `$qFrom()` call
	 * records a chronological mutation log accessible via `instance.$qHistory`.
	 *
	 * The constructor is **not** recorded — only mutations are tracked.
	 * When disabled (the default), no overhead is incurred: `$qHistory` returns
	 * a no-op `NullHistoryHandle` and the internal array is never allocated.
	 *
	 * @example
	 * ```typescript
	 * @Quick({ name: 'string' }, { history: { enabled: true, maxEntries: 50 } })
	 * class Contract extends QModel<IContract> {
	 *   declare name: string;
	 * }
	 *
	 * const c = new Contract({ name: 'v1' });
	 * c.$qPatch({ name: 'v2' });
	 * c.$qHistory.value;
	 * // → [{ method: 'patch', at: Date, changes: { name: { from: 'v1', to: 'v2' } } }]
	 * ```
	 *
	 * @see {@link IQHistoryHandle} — the handle returned by `$qHistory`
	 * @see {@link IQHistoryEntry} — shape of each entry
	 */
	history?: IQHistoryClassConfig;
}

/**
 * Class-level history trail configuration (second parameter of `@Quick()`).
 *
 * @see {@link IQAdvancedOptions.history}
 */
export interface IQHistoryClassConfig extends IQHistoryConfig {
	/** When `true`, the history trail is enabled for this model class. Default: `false`. */
	enabled?: boolean;
}

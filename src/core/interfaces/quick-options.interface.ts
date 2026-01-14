import type {
	IQMockerFn,
	IQSerializerFn,
	IQTransformerFn,
} from './transform-options.interface';

/**
 * Options for @Quick() decorator to handle advanced scenarios.
 *
 * These options extend the basic transformation mapping with advanced features
 * like discriminated unions for polymorphic arrays.
 */

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
 * type Intersection = UnionToIntersection<Union>;  // { a: string } & { b: number }
 * ```
 */
export type UnionToIntersection<U> = (
	U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never;

/**
 * Extract common keys from all types in a union.
 *
 * This finds properties that exist in ALL types, which are valid discriminator fields.
 * Uses a distributive conditional type to check each member of the union.
 *
 * @example
 * ```typescript
 * type Content = { type: 'content'; text: string; };
 * type Metadata = { type: 'metadata'; tags: string[]; };
 *
 * type Common = IQExtractCommonKeys<T> =
 * ```
 */
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
 * ```
 */
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
 * ```
 */

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
	 * STRICT MODE configuration.
	 *
	 * Controls whether the deserializer should throw an error when encountering
	 * properties in the input data that are NOT defined in the model.
	 *
	 * - **false** (default): Flexible mode. Extra properties in input data are silently preserved in the instance.
	 *   Useful for partial models or when the backend sends more data than needed.
	 * - **true**: Strict validations. Throws `QModelError` if input data contains ANY property
	 *   that is not explicitly declared in the model (via `@Quick`, `@QType`, or class property).
	 *
	 * @default false
	 * @deprecated Use `unknownPropertyPolicy: 'error'` instead.
	 *
	 * @example
	 * ```typescript
	 * // Strict: Rejects unexpected fields
	 * @Quick({}, { strict: true })
	 * class User extends QModel<IUser> { ... }
	 * ```
	 */
	strict?: boolean;

	/**
	 * Behavior when encountering properties in input data that are not defined in the model.
	 *
	 * - **keep** (default): Preserves extra properties.
	 * - **strip**: Silently removes extra properties.
	 * - **error**: Throws an error (Equivalent to `strict: true`).
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
     * Case transformation strategy for input (API -> Model) and output (Model -> API).
     */
    transformCase?: {
        in?: 'snake_case' | 'camelCase' | 'kebab-case' | 'PascalCase';
        out?: 'snake_case' | 'camelCase' | 'kebab-case' | 'PascalCase';
    };

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
}

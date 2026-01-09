/**
 * Options for @Quick() decorator to handle advanced scenarios.
 *
 * These options extend the basic transformation mapping with advanced features
 * like discriminated unions for polymorphic arrays.
 */

/**
 * Extract constructor types from ISpec or ISpecs.
 *
 * This helper type extracts all constructor types from a spec definition,
 * which can be used to type discriminator functions properly.
 *
 * @example
 * ```typescript
 * type Spec1 = typeof Date;             // ExtractConstructors<Spec1> = DateConstructor
 * type Spec2 = [typeof Date, typeof BigInt];  // ExtractConstructors<Spec2> = DateConstructor | BigIntConstructor
 * type Spec3 = (v: any) => any;         // ExtractConstructors<Spec3> = (v: any) => any (passthrough for functions)
 * type Spec4 = 'bigint';                // ExtractConstructors<Spec4> = 'bigint' (passthrough for string literals)
 * ```
 */
export type ExtractConstructors<TSpec> = TSpec extends readonly any[]
	? TSpec[number] // Array/tuple → union of all elements
	: TSpec; // Single value → passthrough

/**
 * Extract instance type from a constructor.
 *
 * @example
 * ```typescript
 * type Instance1 = ExtractInstanceType<typeof Date>;  // Date
 * type Instance2 = ExtractInstanceType<DateConstructor>;  // Date
 * ```
 */
export type ExtractInstanceType<T> = T extends new (...args: any[]) => infer R
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
	U extends any ? (k: U) => void : never
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
 * type Common = ExtractCommonKeys<Content | Metadata>;  // 'type'
 * ```
 */
export type ExtractCommonKeys<T> =
	// Get all possible keys from the union
	keyof T extends infer K
		? K extends keyof T
			? // Check if this key exists in ALL members of the union
				(
					T extends any ? (K extends keyof T ? true : false) : never
				) extends true
				? K
				: never
			: never
		: never;

/**
 * Extract the interface type from a QModel class.
 *
 * QModel classes extend QModel<IInterface>, this extracts the IInterface type.
 *
 * @example
 * ```typescript
 * class Content extends QModel<IContent> { ... }
 * type Interface = ExtractQModelInterface<Content>;  // IContent
 * ```
 */
export type ExtractQModelInterface<T> = T extends { toInterface(): infer I }
	? I
	: T;

/**
 * Extract common keys from constructors in an ISpec.
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
 * type Keys1 = ExtractValidDiscriminatorKeys<[typeof Content, typeof Metadata]>;  // 'type'
 *
 * // With regular constructors
 * type Keys2 = ExtractValidDiscriminatorKeys<typeof Date>;  // keyof Date
 * ```
 */
export type ExtractValidDiscriminatorKeys<TSpec> = TSpec extends readonly (new (
	...args: any[]
) => any)[]
	? // Array of constructors → extract common keys from interface types
		ExtractCommonKeys<
			ExtractQModelInterface<ExtractInstanceType<TSpec[number]>>
		>
	: TSpec extends new (...args: any[]) => any
		? // Single constructor → all keys from interface type
			keyof ExtractQModelInterface<ExtractInstanceType<TSpec>>
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
 * @example
 * ```typescript
 * // If items: [Content, Metadata], the function MUST return Content or Metadata
 * const guard: TypeGuardFunction<Content | Metadata> = (data) => {
 *   if ('text' in data) return Content;
 *   if ('tags' in data) return Metadata;
 *   return Content;  // fallback - still must be one of the declared types
 * };
 * ```
 */
export type TypeGuardFunction<TConstructors> = (
	data: any
) => TConstructors | undefined;

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
 */
export type DiscriminatorConfig<
	TConstructors = any,
	TValidKeys extends string = string,
> =
	| TValidKeys // Field name (validated against common keys)
	| TypeGuardFunction<TConstructors> // Custom function with proper typing
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
export interface IQuickAdvancedOptions<
	TTypeMap extends Record<string, any> = Record<string, any>,
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
		[K in keyof TTypeMap]?: DiscriminatorConfig<
			ExtractConstructors<TTypeMap[K]>,
			ExtractValidDiscriminatorKeys<TTypeMap[K]> & string
		>;
	};
}

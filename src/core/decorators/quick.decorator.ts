import { IQAnyRecord } from './../interfaces/model.interface';
import type { IQImplements } from '../interfaces/model.interface';
import { QConfig } from '../config/quick.config';
/**
 * @Quick() class decorator for automatic property registration.
 *
 * This decorator automatically prepares all properties of a class for serialization,
 * eliminating the need for manual decoration of each property. It uses TypeScript's
 * design:type metadata to detect property types and applies the appropriate
 * transformations.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles automatic property registration
 * - Open/Closed: Extends property decoration functionality without modifying it
 * - Don't Repeat Yourself: Eliminates repetitive decorators
 *
 * @example
 * **Without @Quick()** (verbose):
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() declare id: string;
 *   @QType() declare name: string;
 *   @QType() declare email: string;
 *   @QType() declare age: number;
 *   @QType() declare createdAt: Date;
 * }
 * ```
 *
 * @example
 * **With @Quick()** (concise):
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   declare id: string;
 *   declare name: string;
 *   declare email: string;
 *   declare age: number;
 *   declare createdAt: Date;
 * }
 * ```
 *
 * @example
 * **Special types need explicit mapping**:
 * ```typescript
 * @Quick({
 *   balance: BigInt,
 *   pattern: RegExp,
 *   createdAt: Date,
 *   metadata: Map
 * })
 * class Account extends QModel<IAccount> {
 *   declare id: string;
 *   declare balance: bigint;
 *   declare pattern: RegExp;
 *   declare createdAt: Date;
 *   declare metadata: Map<string, unknown>;
 * }
 * ```
 *
 * @example
 * **Mix with @QType() for specific control**:
 * ```typescript
 * @Quick()
 * class Product extends QModel<IProduct> {
 *   declare id: string;           // Auto from @Quick()
 *   declare name: string;         // Auto from @Quick()
 *
 *   @QType(Category)       // Explicit for nested model
 *   declare category: Category;
 *
 *   @QType(Tag)           // Explicit for array of models
 *   declare tags: Tag[];
 * }
 * ```
 */

import 'reflect-metadata';
import { QType } from './qtype.decorator';
import type { IQAdvancedOptions } from '../interfaces/quick-options.interface';
import {
	QUICK_DECORATOR_KEY,
	QUICK_TYPE_MAP_KEY,
	QUICK_DESIGN_TYPES_KEY,
	QUICK_DISCRIMINATORS_KEY,
	QUICK_OPTIONS_KEY,
	FORCE_HYDRATION_KEY,
} from '../constants/metadata-keys';
import type { IQOptions } from '../interfaces/quick.interface';

// Re-export common types for backward compatibility or direct usage
export type { IQOptions } from '../interfaces/quick.interface';

/**
 * Class decorator that automatically applies @QType() to all properties.
 *
 * Properties are registered from the data passed to the constructor.
 *
 * **Property Modifiers (`!` vs `declare`)**:
 * - ✅ **`!` (Definite Assignment)**: Safe to use. `@Quick` wraps the constructor and handles initialization, preventing "undefined" overwrites.
 * - ✅ **`declare`**: Also safe to use.
 *
 * **No automatic detection** - All special types must be explicitly declared:
 * - Date, BigInt, RegExp, Map, Set, etc. MUST be specified in type mapping
 * - Without explicit declaration, values are used as-is with TypeScript metadata only
 *
 * @group Decorators
 * Syntax: `@Quick(typeMap)`
 * @param typeMap REQUIRED mapping for Set, Map, custom classes, and transformers
 * @returns A class decorator function
 *
 * @example
 * **✅ Type mapping with constructors:**
 * ```typescript
 * @Quick({
 *   createdAt: Date,
 *   balance: BigInt,
 *   tags: Set,
 *   metadata: Map,
 *   posts: Post
 * })
 * class User extends QModel<IUser> {
 *   declare id: number;
 *   declare createdAt: Date;          // Explicitly mapped
 *   declare balance: bigint;          // Explicitly mapped
 *   declare tags: Set<string>;        // Explicitly mapped
 *   declare metadata: Map<string, any>; // Explicitly mapped
 * }
 * ```
 *
 * @example
 * **✅ String literals for basic types (autocomplete):**
 * ```typescript
 * @Quick({
 *   value: 'bigint',    // ← IDE autocomplete!
 *   date: 'date',       // ← IDE autocomplete!
 *   pattern: 'regexp',  // ← IDE autocomplete!
 *   tags: 'set',        // ← IDE autocomplete!
 *   flags: 'map'        // ← IDE autocomplete!
 * })
 * class Account extends QModel<IAccount> {
 *   declare value: bigint;
 *   declare date: Date;
 *   declare pattern: RegExp;
 *   declare tags: Set<string>;
 *   declare flags: Map<string, boolean>;
 * }
 * ```
 *
 * @example
 * **✅ Direct functions (maximum flexibility):**
 * ```typescript
 * @Quick({
 *   // Direct Math methods
 *   price: (v) => Math.round(v * 100) / 100,       // Round to 2 decimals
 *   count: Math.floor,                              // Floor
 *   percentage: (v) => Math.min(100, Math.max(0, v)), // Clamp 0-100
 *
 *   // String transformations
 *   name: (s) => s.trim().toUpperCase(),            // Trim and uppercase
 *   slug: (s) => s.toLowerCase().replace(/\s+/g, '-'), // Slugify
 *
 *   // Encoding/Decoding
 *   encoded: (s) => Buffer.from(s).toString('base64'),  // Base64 encode
 *   decoded: (s) => Buffer.from(s, 'base64').toString(), // Base64 decode
 *
 *   // JSON
 *   metadata: JSON.parse,                           // Parse JSON string
 *
 *   // Business logic custom
 *   tax: (price) => price * 0.21,                   // Calcula IVA 21%
 *   total: (p) => (p * 1.21) * 0.9                 // Precio + IVA - 10% desc
 * })
 * class Product extends QModel<IProduct> {
 *   declare price: number;
 *   declare count: number;
 *   declare percentage: number;
 *   declare name: string;
 *   declare slug: string;
 *   declare encoded: string;
 *   declare decoded: string;
 *   declare metadata: any;
 *   declare tax: number;
 *   declare discounted: number;
 * }
 * ```
 *
 * @example
 * **✅ Array element types:**
 * ```typescript
 * @Quick({ dates: [Date, undefined, null] })
 * class User extends QModel<IUser> {
 *   dates?: (Date | undefined | null)[]; // Transforms strings to Date, preserves undefined/null
 * }
 * ```
 *
 * @example
 * **✅ Custom transformer functions:**
 * ```typescript
 * @Quick({
 *   dates: (arr) => arr.map(d => d ? new Date(d) : d),
 *   custom: (value) => ({ ...value, transformed: true })
 * })
 * class User extends QModel<IUser> {
 *   dates?: (Date | undefined | null)[];
 *   custom!: any;
 * }
 * ```
 *
 * @example
 * **✅ Dot notation for nested properties:**
 * ```typescript
 * // Option 1: Decorate nested class (recommended for reusable models)
 * @Quick({ price: BigInt, createdAt: Date })
 * class Product extends QModel<IProduct> {
 *   price!: bigint;
 *   createdAt!: Date;
 * }
 *
 * @Quick({ product: Product, addedAt: Date })
 * class CartItem extends QModel<ICartItem> {
 *   product!: Product;  // Product already has transformations
 *   addedAt!: Date;
 * }
 *
 * // Option 2: Use dot notation (useful for third-party or context-specific transforms)
 * @Quick({
 *   product: Product,
 *   'product.price': BigInt,      // Nested transformation
 *   'product.createdAt': Date,    // Nested transformation
 *   addedAt: Date
 * })
 * class CartItem extends QModel<ICartItem> {
 *   product!: Product;  // All transformations in one place
 *   addedAt!: Date;
 * }
 * ```
 *
 * @example
 * **✅ Math functions and string literals with parameters:**
 * ```typescript
 * @Quick({
 *   price: 'round.2',              // Round to 2 decimals
 *   discount: Math.abs,            // Math.abs function directly
 *   total: (v) => Math.round(v * 100) / 100,  // Custom precision
 *   encoded: 'base64.encode',      // Base64 encoding
 *   slug: 'slugify',               // Convert to URL slug
 *   hash: 'sha256'                 // SHA-256 hash
 * })
 * class Product extends QModel<IProduct> {
 *   price!: number;
 *   discount!: number;
 *   total!: number;
 *   encoded!: string;
 *   slug!: string;
 *   hash!: string;
 * }
 * ```
 *
 * @example
 * **✅ Works with both declare and ! syntax:**
 * ```typescript
 * @Quick({ tags: Set })
 * class User extends QModel<IUser> {
 *   id!: number;         // ✅ Works
 *   tags!: Set<string>;  // ✅ Works with type mapping
 * }
 * ```
 *
 * @example
 * **✅ Union types with discriminators (ADVANCED):**
 *
 * When you have arrays that can contain different model types, use discriminators
 * to tell QuickModel how to distinguish between them at runtime.
 *
 * ```typescript
 * // Backend interfaces
 * interface IContent {
 *   type: 'content';  // Discriminator field
 *   text: string;
 * }
 *
 * interface IMetadata {
 *   type: 'metadata';  // Discriminator field
 *   tags: string[];
 * }
 *
 * // Model classes
 * class Content extends QModel<IContent> { ... }
 * class Metadata extends QModel<IMetadata> { ... }
 *
 * // Use discriminator to handle union types
 * @Quick({
 *   items: [Content, Metadata],  // Declare ALL possible types
 * }, {
 *   discriminators: {
 *     // Option 1: String discriminator (field name)
 *     // Matches field value with constructor name (case-insensitive)
 *     items: 'type'  // Uses data.type to determine Content vs Metadata
 *   }
 * })
 * class Data extends QModel<IData> {
 *   declare items: (Content | Metadata)[];
 * }
 *
 * // Runtime: data.type === 'content' → instantiates Content
 * //         data.type === 'metadata' → instantiates Metadata
 * ```
 *
 * @example
 * **✅ Union types with custom type guard function:**
 *
 * For complex discrimination logic, use a custom function.
 *
 * **CRITICAL**: The function MUST return one of the types declared in the array.
 * If you declare 5 types, every code path must return one of those 5 types.
 *
 * ```typescript
 * @Quick({
 *   items: [Content, Metadata],  // 2 types declared
 * }, {
 *   discriminators: {
 *     // Custom function: MUST return Content or Metadata (the declared types)
 *     items: (data) => {
 *       // Check data structure to determine type
 *       if ('text' in data) return Content;
 *       if ('tags' in data) return Metadata;
 *
 *       // Fallback: return first type (Content)
 *       // NEVER return undefined - always return one of the declared types
 *       return Content;
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * **✅ Union types with 5+ types:**
 *
 * If you declare multiple types, EVERY branch must return one of them.
 *
 * ```typescript
 * @Quick({
 *   // Declare ALL 5 possible types
 *   items: [TypeA, TypeB, TypeC, TypeD, TypeE],
 * }, {
 *   discriminators: {
 *     items: (data) => {
 *       // Each branch MUST return one of the 5 declared types
 *       if (data.kind === 'a') return TypeA;
 *       if (data.kind === 'b') return TypeB;
 *       if (data.kind === 'c') return TypeC;
 *       if (data.kind === 'd') return TypeD;
 *       if (data.kind === 'e') return TypeE;
 *
 *       // Fallback: MUST be one of the declared types
 *       return TypeA;  // Default to first type
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * **✅ Union types with object configuration:**
 *
 * For explicit mapping between discriminator values and types.
 *
 * ```typescript
 * @Quick({
 *   items: [Content, Metadata],
 * }, {
 *   discriminators: {
 *     items: {
 *       field: 'type',  // Field name to check
 *       mapping: {
 *         'content': Content,    // Explicit mapping
 *         'metadata': Metadata
 *       }
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * **✅ Customizing Transformers, Serializers & Mockers:**
 *
 * For full control over the lifecycle of your data.
 *
 * ```typescript
 * @Quick({
 *   // Define base types
 *   sku: (val: any) => `ITEM-${val}`, // Inline transformer (fallback to String for mocks)
 *   timestamp: Date
 * }, {
 *   // 1. TRANSFORMERS (Input -> Model)
 *   // Override default deserialization logic
 *   transformers: {
 *     // Convert seconds -> Date object
 *     timestamp: (val: number) => new Date(val * 1000)
 *   },
 *
 *   // 2. SERIALIZERS (Model -> Output)
 *   // Override default serialization logic (toInterface)
 *   serializers: {
 *     // Convert Date object -> seconds
 *     timestamp: (val: Date) => Math.floor(val.getTime() / 1000)
 *   },
 *
 *   // 3. MOCKERS (Tests -> Model)
 *   // Define how to generate fake data for this field
 *   // Critical for custom transformers where automatic inference fails
 *   mockers: {
 *     // Generate '1234' so transformer produces 'ITEM-1234'
 *     sku: () => faker.string.alphanumeric(4)
 *   }
 * })
 * class Product extends QModel<IProduct> {
 *   declare sku: string;
 *   declare timestamp: Date;
 * }
 * ```
 *
 * @remarks
 * **Why Set/Map need type mapping:**
 *
 * The backend sends both as arrays:
 * - `tags: ["a", "b"]` → Array or Set? Cannot determine
 * - `metadata: [["k", "v"]]` → Array or Map? Cannot determine
 *
 * Without explicit type mapping, the decorator cannot know the developer's intent.
 * All special types MUST be explicitly declared - no automatic detection.
 *
 * **Discriminators for union types:**
 *
 * JavaScript has no runtime type information. When an array can contain different
 * types (union types), you MUST provide a discriminator to determine the correct
 * type at runtime:
 *
 * - **String discriminator**: Field name whose value matches constructor name
 * - **Function discriminator**: Custom logic returning the correct constructor
 * - **Object discriminator**: Explicit field + mapping configuration
 *
 * Without discriminators, QuickModel uses the first type in the array as fallback.
 *
 * @see {@link QType} for per-property decoration (supports TypeScript metadata for `!` syntax)
 * @see {@link IQAdvancedOptions} for discriminator configuration
 */
export function Quick<
	TExtendedTypes extends IQAnyRecord = IQAnyRecord,
	TTypeMap extends IQOptions = IQOptions,
>(
	typeMap?: IQImplements<TTypeMap, TExtendedTypes>,
	advancedOptions?: IQAdvancedOptions<TTypeMap>
): ClassDecorator {
	// SAFETY CHECK: Detect common misconfiguration where options are passed as first argument
	if (
		typeMap &&
		'unknownPropertyPolicy' in typeMap &&
		typeof (typeMap as any).unknownPropertyPolicy === 'string'
	) {
		throw new Error(
			`[QuickModel] Misconfiguration detected: 'unknownPropertyPolicy: ${(typeMap as any).unknownPropertyPolicy}' found in type map. ` +
				`Did you mean to pass options as the second argument? \n` +
				`Correct usage: @Quick({ /* types */ }, { unknownPropertyPolicy: 'error' })`
		);
	}

	return function <T extends Function>(target: T): T {
		// Mark class as using @Quick() for auto-registration
		Reflect.defineMetadata(QUICK_DECORATOR_KEY, true, target);

		// Auto-detect argument confusion: @Quick({ dateStrategy: '...' })
		// If typeMap has keys that look like options (dateStrategy, strict, etc)
		// AND it doesn't have valid transformers... we might be in trouble.
		// For now, let's just properly merge defaults.

		// Merge global defaults
		const globalDefaults = QConfig.get().defaults;
		// Merge passed advancedOptions
		let mergedOptions = { ...globalDefaults, ...advancedOptions };

		// Handle case where options are passed as first argument (typeMap)
		// Only if typeMap is provided AND advancedOptions is undefined
		if (typeMap && !advancedOptions) {
			// Check if it has ACTUAL type mappings (keys that are property names)
			// This is ambiguous if a property name matches an option key.
			// Assumption: if 'dateStrategy' is present, it's likely an option object IF the value is a string 'iso'|'native'|'timestamp'

			if (
				'dateStrategy' in typeMap &&
				typeof (typeMap as any).dateStrategy === 'string' &&
				['iso', 'timestamp', 'native'].includes(
					(typeMap as any).dateStrategy
				)
			) {
				// It IS an option object passed as first arg
				mergedOptions = { ...mergedOptions, ...(typeMap as any) };
				// Do NOT register 'dateStrategy' as a property type!
				delete (typeMap as any).dateStrategy;
			}
		}

		// Store options (strict mode, etc)
		if (Object.keys(mergedOptions).length > 0) {
			Reflect.defineMetadata(QUICK_OPTIONS_KEY, mergedOptions, target);
		}

		// Store type map if provided
		if (typeMap) {
			Reflect.defineMetadata(QUICK_TYPE_MAP_KEY, typeMap, target);

			// 🔥 REGISTER PROPERTIES IMMEDIATELY (not on first instantiation)
			// This eliminates race conditions and makes behavior predictable
			for (const [propertyKey, mappedType] of Object.entries(typeMap)) {
				// Check if property already has metadata registered locally (e.g., from @QType())
				// use getOwnMetadata to allow overriding inherited properties
				const existingFieldType = Reflect.getOwnMetadata(
					'fieldType',
					target.prototype,
					propertyKey
				);
				const existingArrayClass = Reflect.getOwnMetadata(
					'arrayElementClass',
					target.prototype,
					propertyKey
				);

				if (
					existingFieldType !== undefined ||
					existingArrayClass !== undefined
				) {
					// Property already registered, skip
					continue;
				}

				// Register the property using QType decorator
				// Type assertion: IQSpec | IQSpecs is compatible with QType parameter
				const decorator = QType(
					mappedType as Parameters<typeof QType>[0]
				);
				decorator(target.prototype, propertyKey);
			}
		}

		// Store ALL advanced options (strict, etc.)
		if (advancedOptions) {
			Reflect.defineMetadata(QUICK_OPTIONS_KEY, advancedOptions, target);
		}

		// Store discriminators separately for fast direct lookup via QUICK_DISCRIMINATORS_KEY,
		// in addition to being stored inside advancedOptions above.
		// Both keys coexist intentionally: some lookup paths use the full options object
		// while others (e.g. polymorphic population) access discriminators directly.
		if (advancedOptions?.discriminators) {
			Reflect.defineMetadata(
				QUICK_DISCRIMINATORS_KEY,
				advancedOptions.discriminators,
				target
			);
		}

		// CRITICAL: Capture design:type metadata NOW before TypeScript field initialization overwrites it
		// This metadata is emitted by TypeScript at compile time but only for properties with decorators
		// Since we're a class decorator applying property decorators dynamically, we need to capture
		// the original design:type metadata and store it for later use
		const designTypeCache: Record<string, unknown> = {};
		const proto = target.prototype;

		// Scan all properties in the prototype chain to capture design:type metadata
		let current = proto;
		while (current && current !== Object.prototype) {
			const descriptors = Object.getOwnPropertyDescriptors(current);
			for (const propertyKey of Object.keys(descriptors)) {
				// Skip already processed properties
				if (propertyKey in designTypeCache) continue;

				// Try to get design:type metadata (emitted by TypeScript for decorated properties)
				const designType = Reflect.getMetadata(
					'design:type',
					current,
					propertyKey
				);
				if (designType) {
					designTypeCache[propertyKey] = designType;
				}
			}
			current = Object.getPrototypeOf(current);
		}

		// Store the captured design:type metadata for later use
		if (Object.keys(designTypeCache).length > 0) {
			Reflect.defineMetadata(
				QUICK_DESIGN_TYPES_KEY,
				designTypeCache,
				target
			);
		}

		// Add static method for creating instances (used by deserializer)
		// This allows us to bypass the field initialization problem with `!`
		// Properties are already registered by the decorator, so we just create the instance
		(target as unknown as Record<string, Function>).__createQuickInstance =
			function (_data: Record<string, unknown>) {
				// Create instance without calling constructor
				const instance = Object.create(target.prototype);

				// Properties are already registered by the decorator
				// Just return the instance for the deserializer to populate
				return instance;
			};

		// Wrap constructor to handle TypeScript field initialization shadowing
		const originalConstructor = target;

		const wrappedConstructor: Function = function (
			this: Record<string, unknown>,
			...args: unknown[]
		) {
			// Simply call the original constructor - allows both child and QModel constructors to execute normally
			// FIX: Use new.target to propagate inheritance chain correctly (e.g. when Child extends Parent decorated with @Quick)
			const targetConstructor = new.target || wrappedConstructor;
			const instance = Reflect.construct(
				originalConstructor,
				args,
				targetConstructor
			);

			// CRITICAL: Re-install getters/setters AFTER construction to override TypeScript's property initialization

			// Re-install getters/setters to ensure they are not shadowed by property initializers

			// Check ALL properties in the instance, not just those in quickTypeMap
			const instanceKeys = Object.keys(instance);
			for (const propertyKey of instanceKeys) {
				// Skip internal properties
				if (propertyKey.startsWith('__')) continue;

				// Check if property has a getter in the prototype (from @QType)
				const protoDescriptor = Object.getOwnPropertyDescriptor(
					originalConstructor.prototype,
					propertyKey
				);
				if (protoDescriptor && protoDescriptor.get) {
					// Check if instance has a real property shadowing the getter
					const instanceDescriptor = Object.getOwnPropertyDescriptor(
						instance,
						propertyKey
					);
					if (instanceDescriptor && !instanceDescriptor.get) {
						// Capture the value from the shadowing property (likely a default value)
						const defaultValue = instance[propertyKey];

						// Instance has a real property (from TypeScript initialization), remove it
						// The getter from prototype will take over
						delete instance[propertyKey];

						// Restore default value if it wasn't provided in constructor data
						// We check __initData to see if the key was present in the input
						const initData = instance.__initData || {};

						if (
							!Object.prototype.hasOwnProperty.call(
								initData,
								propertyKey
							)
						) {
							// Value was NOT in constructor data, so this is a valid default value
							// Restore it via the setter (which updates __quickValues__)
							instance[propertyKey] = defaultValue;
						}
					}
				}
			}

			// Restore values that may have been overwritten by property initializers
			// When using `class User extends QModel { name = 'Default' }`, the property initializer
			// runs after QModel initialization, overwriting the deserialized data.
			// This method compares the backup storage (from data) with the current value (from default)
			// and restores the backup if they differ.
			if (typeof instance[FORCE_HYDRATION_KEY] === 'function') {
				instance[FORCE_HYDRATION_KEY]();
			}

			return instance;
		};
		// Copy prototype and static members
		wrappedConstructor.prototype = originalConstructor.prototype;
		Object.setPrototypeOf(wrappedConstructor, originalConstructor);

		for (const key of Object.getOwnPropertyNames(originalConstructor)) {
			if (key !== 'prototype' && key !== 'length' && key !== 'name') {
				const descriptor = Object.getOwnPropertyDescriptor(
					originalConstructor,
					key
				);
				if (descriptor) {
					Object.defineProperty(wrappedConstructor, key, descriptor);
				}
			}
		}

		Object.defineProperty(wrappedConstructor, 'name', {
			value: originalConstructor.name,
			writable: false,
			configurable: true,
		});

		// Copy metadata from original to wrapped constructor
		// This is CRITICAL because reflect-metadata stores metadata by object identity
		const keysToCopy = [
			QUICK_DISCRIMINATORS_KEY,
			QUICK_TYPE_MAP_KEY,
			QUICK_DESIGN_TYPES_KEY,
			QUICK_DECORATOR_KEY,
			QUICK_OPTIONS_KEY,
		];

		for (const key of keysToCopy) {
			const value = Reflect.getMetadata(key, originalConstructor);
			if (value !== undefined) {
				Reflect.defineMetadata(key, value, wrappedConstructor);
			}
		}

		return wrappedConstructor as T;
	};
}

/**
 * Checks if a class is decorated with @Quick()
 * @internal
 */
export function isQuickDecorated(constructor: Function): boolean {
	return Reflect.getMetadata(QUICK_DECORATOR_KEY, constructor) === true;
}

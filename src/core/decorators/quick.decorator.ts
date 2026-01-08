/**
 * @Quick() class decorator for automatic property registration.
 *
 * This decorator automatically applies @QType() to all properties of a class,
 * eliminating the need for manual decoration of each property. It uses TypeScript's
 * design:type metadata to detect property types and applies the appropriate
 * transformations.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles automatic property registration
 * - Open/Closed: Extends QType functionality without modifying it
 * - Don't Repeat Yourself: Eliminates repetitive @QType() decorators
 *
 * @example
 * **Without @Quick()** (verbose):
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() id!: string;
 *   @QType() name!: string;
 *   @QType() email!: string;
 *   @QType() age!: number;
 *   @QType() createdAt!: Date;
 * }
 * ```
 *
 * @example
 * **With @Quick()** (concise):
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   id!: string;
 *   name!: string;
 *   email!: string;
 *   age!: number;
 *   createdAt!: Date;
 * }
 * ```
 *
 * @example
 * **Special types still work**:
 * ```typescript
 * @Quick()
 * class Account extends QModel<IAccount> {
 *   id!: string;
 *   balance!: bigint;      // Auto-detected
 *   pattern!: RegExp;      // Auto-detected
 *   createdAt!: Date;      // Auto-detected
 *   metadata!: Map<string, any>;  // Auto-detected
 * }
 * ```
 *
 * @example
 * **Mix with @QType() for specific control**:
 * ```typescript
 * @Quick()
 * class Product extends QModel<IProduct> {
 *   id!: string;           // Auto from @Quick()
 *   name!: string;         // Auto from @Quick()
 *
 *   @QType(Category)       // Explicit for nested model
 *   category!: Category;
 *
 *   @QType(Tag)           // Explicit for array of models
 *   tags!: Tag[];
 * }
 * ```
 */

import 'reflect-metadata';
import { QType } from './qtype.decorator';
import { ModelDeserializer } from '../services/model-deserializer.service';
import type { IQTypeAlias } from '../interfaces/qtype-symbols.interface';


const QUICK_DECORATOR_KEY = '__quickModel__';
const QUICK_TYPE_MAP_KEY = '__quickTypeMap__';

/**
 * Constructor type for class-based type mapping
 */
type IConstructor<T = any> = new (...args: any[]) => T;

/**
 * Transformer function that converts a value
 */
type ITransformerFunction = (value: any) => any;

/**
 * All supported type specifications for @Quick() decorator
 * 
 * Supports:
 * - String literals: 'bigint', 'date', 'regexp', 'map', 'set', etc. (type conversions)
 * - Constructors: Date, RegExp, Map, Set, BigInt, Symbol, custom classes
 * - Transformer functions: (value) => transformed value (arrow or regular functions)
 */
export type ISpec = 
  | IQTypeAlias          // String literals like 'bigint', 'date', 'regexp'
  | IConstructor         // Constructors like Date, RegExp, Map, custom classes
  | ITransformerFunction;

/**
 * All supported type specifications for @Quick() decorator for arrays
 * 
 * Supports:
 * - String literals: 'bigint', 'date', 'regexp', 'map', 'set', etc. (type conversions)
 * - Constructors: Date, RegExp, Map, Set, BigInt, Symbol, custom classes
 * - Transformer functions: (value) => transformed value (arrow or regular functions)
 * - Array with element type: [Date, undefined, null]
 */
export type ISpecs = ISpec[] // Array of any Spec

/**
 * Options for @Quick() decorator to specify property types explicitly
 * 
 * @example
 * ```typescript
 * @Quick({ 
 *   value: 'bigint',           // String literal (autocomplete)
 *   date: Date,                // Constructor
 *   pattern: 'regexp',         // String literal
 *   tags: Set,                 // Constructor
 *   custom: (v) => v * 2       // Transformer function
 * })
 * ```
 */
export interface IQuickOptions {
  [propertyName: string]: ISpec | ISpecs;
}

/**
 * Class decorator that automatically applies @QType() to all properties.
 *
 * Properties are registered from the data passed to the constructor.
 *
 * **Auto-detection (ONLY for unambiguous types):**
 * - **Date**: Automatically detected from ISO 8601 strings
 * - **BigInt**: Automatically detected from numeric strings with 15+ digits
 * - **Set/Map**: MUST be specified in type mapping (cannot be distinguished from arrays)
 *
 * @param typeMap REQUIRED mapping for Set, Map, custom classes, and transformers
 * @returns A class decorator function
 *
 * @example
 * **✅ Type mapping with constructors:**
 * ```typescript
 * @Quick({ tags: Set, metadata: Map, posts: Post })
 * class User extends QModel<IUser> {
 *   declare id: number;
 *   declare date: Date;              // Auto-detected from ISO string
 *   declare tags: Set<string>;        // NEEDS type mapping
 *   declare metadata: Map<string, any>; // NEEDS type mapping
 * }
 * ```
 * 
 * @example
 * **✅ String literals para tipos básicos (autocomplete):**
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
 * **✅ Funciones directas (máxima flexibilidad):**
 * ```typescript
 * @Quick({ 
 *   // Math methods directos
 *   price: (v) => Math.round(v * 100) / 100,       // Redondea a 2 decimales
 *   count: Math.floor,                              // Redondeo hacia abajo
 *   percentage: (v) => Math.min(100, Math.max(0, v)), // Clamp 0-100
 *   
 *   // String transformations
 *   name: (s) => s.trim().toUpperCase(),            // Limpia y mayúsculas
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
 * @remarks
 * **Why Set/Map need type mapping:**
 *
 * The backend sends both as arrays:
 * - `tags: ["a", "b"]` → Array or Set? Cannot determine
 * - `metadata: [["k", "v"]]` → Array or Map? Cannot determine
 *
 * Without explicit type mapping, the decorator cannot know the developer's intent.
 * This is a design decision for robustness over "magic" heuristics.
 *
 * @see {@link QType} for per-property decoration (supports TypeScript metadata for `!` syntax)
 */
export function Quick(typeMap?: IQuickOptions): ClassDecorator {
	return function <T extends Function>(target: T): any {
		// Mark class as using @Quick() for auto-registration
		Reflect.defineMetadata(QUICK_DECORATOR_KEY, true, target);

		// Store type map if provided
		if (typeMap) {
			Reflect.defineMetadata(QUICK_TYPE_MAP_KEY, typeMap, target);
		}

		// Add static method for creating instances (used by deserializer)
		// This allows us to bypass the field initialization problem with `!`
		(target as any).__createQuickInstance = function (data: any) {
			// Create instance without calling constructor
			const instance = Object.create(target.prototype);

			// Note: This doesn't work with `!` syntax due to TypeScript field initialization
			// TypeScript generates code that redefines properties AFTER constructor completes
			// This method is useful for declare syntax or programmatic instance creation

			// Register properties if not already done
			const typeMap =
				Reflect.getMetadata(QUICK_TYPE_MAP_KEY, target) || {};
			const properties = Object.keys(data);

			for (const propertyKey of properties) {
				const existingFieldType = Reflect.getMetadata(
					'fieldType',
					target.prototype,
					propertyKey
				);
				const existingArrayClass = Reflect.getMetadata(
					'arrayElementClass',
					target.prototype,
					propertyKey
				);

				if (
					existingFieldType !== undefined ||
					existingArrayClass !== undefined
				) {
					continue;
				}

				const mappedType = typeMap[propertyKey];
				if (mappedType) {
					Reflect.defineMetadata(
						'design:type',
						mappedType,
						target.prototype,
						propertyKey
					);
				

				const decorator = QType();
				decorator(target.prototype, propertyKey);
			}

			return instance;
		};

		// Wrap constructor to register properties on first instantiation
		const originalConstructor = target;
		let propertiesRegistered = false;

		const wrappedConstructor: any = function (this: any, ...args: any[]) {
			const data = args[0];

			// Register properties BEFORE calling constructor (only once, on first instantiation)
			if (!propertiesRegistered && data && typeof data === 'object' && !Array.isArray(data)) {
				// Get the type map directly - it's the object passed to @Quick()
				// Example: @Quick({ posts: Post, tags: Set })
				const typeMap =
					Reflect.getMetadata(
						QUICK_TYPE_MAP_KEY,
						originalConstructor
					) || {};
				
				// Combine properties from data AND typeMap
				// This ensures we process properties even if they're not in the current data
				const allProperties = new Set([
					...Object.keys(data),
					...Object.keys(typeMap)
				]);

				for (const propertyKey of allProperties) {
					const existingFieldType = Reflect.getMetadata(
						'fieldType',
						originalConstructor.prototype,
						propertyKey
					);
					const existingArrayClass = Reflect.getMetadata(
						'arrayElementClass',
						originalConstructor.prototype,
						propertyKey
					);

					if (
						existingFieldType !== undefined ||
						existingArrayClass !== undefined
					) {
						continue;
					}

				const mappedType = typeMap[propertyKey];
				if (mappedType) {
					// Simply pass to QType - it handles everything
					const decorator = QType(mappedType);
					decorator(originalConstructor.prototype, propertyKey);
				} else {
					// No type mapping - use TypeScript metadata as-is
					const decorator = QType();
					decorator(originalConstructor.prototype, propertyKey);
				}
			}
		}

		// Post-construction hook: Delete shadowing properties
				// These properties are not in the data from backend but have values in the class
				// Create a temporary instance to capture default values
				try {
					const dummyInstance = Reflect.construct(
						originalConstructor,
						[{}],
						originalConstructor
					);
					for (const key of Object.keys(dummyInstance)) {
						// Skip if already registered from data
						if (Array.from(allProperties).includes(key)) continue;
						// Skip internal properties
						if (key.startsWith('__')) continue;

						// Apply @QType() to preserve the default value
						const decorator = QType();
						decorator(originalConstructor.prototype, key);

						// Store the default value in the prototype
						Object.defineProperty(
							originalConstructor.prototype,
						`__quickmodel_default_${key}`,
							{
								value: dummyInstance[key],
								writable: false,
								enumerable: false,
								configurable: false,
							}
						);
					}
				} catch (e) {
					// If creating dummy instance fails, just continue
				}
				
				propertiesRegistered = true;
			}

			// Simply call the original constructor - allows both child and QModel constructors to execute normally
			const instance = Reflect.construct(
				originalConstructor,
				args,
				wrappedConstructor
			);
			
			// CRITICAL: Re-install getters/setters AFTER construction to override TypeScript's property initialization
			// This fixes the issue where `property!: Type` creates a real property that shadows the getter
			const typeMap = Reflect.getMetadata(QUICK_TYPE_MAP_KEY, originalConstructor) || {};
			for (const propertyKey of Object.keys(typeMap)) {
				// Check if property has a getter in the prototype (from @QType)
				const protoDescriptor = Object.getOwnPropertyDescriptor(originalConstructor.prototype, propertyKey);
				if (protoDescriptor && protoDescriptor.get) {
					// Check if instance has a real property shadowing the getter
					const instanceDescriptor = Object.getOwnPropertyDescriptor(instance, propertyKey);
					if (instanceDescriptor && !instanceDescriptor.get) {
						// Instance has a real property (from TypeScript initialization), remove it
						// The getter from prototype will take over
						delete instance[propertyKey];
					}
				}
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

		return wrappedConstructor as any;
	};
}

/**
 * Checks if a class is decorated with @Quick()
 * @internal
 */
export function isQuickDecorated(constructor: Function): boolean {
	return Reflect.getMetadata(QUICK_DECORATOR_KEY, constructor) === true;
}

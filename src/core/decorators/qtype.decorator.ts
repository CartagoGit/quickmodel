/**
 * Universal @QType() decorator for QModel properties.
 *
 * This decorator marks properties that need automatic serialization/deserialization
 * with type transformation support. It's the cornerstone of QuickModel's type-safe
 * data transformation system.
 *
 * SOLID Principles Applied:
 * - Open/Closed: Allows marking fields without modifying QModel core
 * - Interface Segregation: Provides multiple ways to specify field types
 * - Dependency Inversion: Works with abstract transformer registry
 */

import 'reflect-metadata';
import { QUICK_PROPERTY_KEYS } from '../constants/metadata-keys';

/**
 * Available field types as string literals with IntelliSense support.
 * Allows using @QType('regexp'), @QType('bigint'), etc. with autocomplete.
 *
 * These string literals provide a convenient alternative to symbol-based type hints.
 *
 * @example
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType('bigint') balance!: bigint;
 *   @QType('regexp') pattern!: RegExp;
 *   @QType('int8array') bytes!: Int8Array;
 * }
 * ```
 */
export type QTypeString =
	// Primitives
	| 'string'
	| 'number'
	| 'boolean'
	// Special types with constructors
	| 'date'
	| 'regexp'
	| 'error'
	| 'url'
	| 'urlsearchparams'
	// Special types without usable constructor
	| 'bigint'
	| 'symbol'
	// Collections
	| 'map'
	| 'set'
	// Buffers
	| 'arraybuffer'
	| 'dataview'
	// TypedArrays
	| 'int8array'
	| 'uint8array'
	| 'int16array'
	| 'uint16array'
	| 'int32array'
	| 'uint32array'
	| 'float32array'
	| 'float64array'
	| 'bigint64array'
	| 'biguint64array';

/**
 * Metadata key symbol for storing the list of properties decorated with @QType().
 * Used internally by QModel to track which properties need serialization/deserialization.
 *
 * @internal
 */
export const QTYPES_METADATA_KEY = Symbol('quickmodel:qtypes');

/**
 * Property decorator for marking QModel fields with automatic type handling.
 *
 * The @QType() decorator supports multiple usage patterns:
 *
 * **WITHOUT arguments** (`@QType()`):
 * - Copies the value as-is without transformation
 * - Protects properties from TypeScript field initialization when using `!` or `?`
 * - Equivalent to `declare` but works with `!` syntax
 *
 * **WITH type argument** (`@QType(Type)`):
 * - Transforms the value to the specified type
 * - Supports: String literals, Native constructors, Q-Symbols, Model classes
 *
 * @group Decorators
 * @decorator `@QType(typeOrClass)`
 * @template T - The property type
 * @param typeOrClass - Optional: Constructor, Symbol, or String literal for the field type
 * @returns A property decorator function that registers the field with appropriate metadata
 *
 * @example
 * **No transformation** (copy as-is with protection):
 * ```typescript
 * class User extends QModel<IUser> {
 *   // Option 1: Use declare (no decorator needed)
 *   declare id: number;
 *   declare name: string;
 *
 *   // Option 2: Use @QType() without args (allows ! or ?)
 *   @QType() id!: number;
 *   @QType() name!: string;
 *   @QType() email?: string;
 * }
 * ```
 *
 * @example
 * **String literals** (with IntelliSense):
 * ```typescript
 * class Account extends QModel<IAccount> {
 *   @QType('bigint') balance!: bigint;
 *   @QType('symbol') id!: symbol;
 *   @QType('regexp') pattern!: RegExp;
 *   @QType('int8array') bytes!: Int8Array;
 *   @QType('map') metadata!: Map<string, any>;
 * }
 * ```
 *
 * @example
 * **Native constructors**:
 * ```typescript
 * class Binary extends QModel<IBinary> {
 *   @QType(RegExp) pattern!: RegExp;
 *   @QType(Error) lastError!: Error;
 *   @QType(Int8Array) bytes!: Int8Array;
 *   @QType(ArrayBuffer) buffer!: ArrayBuffer;
 * }
 * ```
 *
 * @example
 * **Q-Symbol based**:
 * ```typescript
 * class Account extends QModel<IAccount> {
 *   @QType(QBigInt) balance!: bigint;
 *   @QType(QSymbol) id!: symbol;
 *   @QType(QRegExp) pattern!: RegExp;
 *   @QType(QInt8Array) data!: Int8Array;
 * }
 * ```
 *
 * @example
 * **Nested models**:
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType(Address) address!: Address;      // Single nested model
 *   @QType([Vehicle]) vehicles!: Vehicle[]; // Array of models - explicit syntax
 * }
 * ```
 *
 */
export function QType<T>(
	typeOrClass?:
		| (new (data: any) => T)
		| symbol
		| QTypeString
		| BigIntConstructor
		| SymbolConstructor
		| SetConstructor
		| MapConstructor
		| DateConstructor
		| BooleanConstructor
		| NumberConstructor
		| StringConstructor
		| PromiseConstructor
		| Array<any> // Support array syntax: [Type], [[Type]], etc.
): PropertyDecorator {
	return function (target: any, propertyKey: string | symbol): void {
		// Register the property in the fields list
		const existingFields =
			(Reflect.getMetadata(QTYPES_METADATA_KEY, target) as Array<string | symbol>) || [];
		if (!existingFields.includes(propertyKey)) {
			const newFields = [...existingFields, propertyKey];
			Reflect.defineMetadata(QTYPES_METADATA_KEY, newFields, target);
		}

		// ALWAYS create getter/setter to prevent TypeScript from shadowing with real properties
		// Check if getter/setter already exists
		const existingDescriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
		if (!existingDescriptor || (!existingDescriptor.get && !existingDescriptor.set)) {
			const storageKey = `${QUICK_PROPERTY_KEYS}${String(propertyKey)}`;

			// Define getter/setter
			Object.defineProperty(target, propertyKey, {
				get(this: any) {
					return this[storageKey];
				},
				set(this: any, value: any) {
					this[storageKey] = value;
				},
				enumerable: true,
				configurable: true,
			});
		}

		// If no typeOrClass provided, we're done (no transformation metadata needed)
		if (!typeOrClass) {
			return;
		}

		// Check for array syntax: [Type] means array of Type
		// Recursive syntax: [[Type]] = Type[][], [[[Type]]] = Type[][][], etc.
		if (Array.isArray(typeOrClass)) {
			if (typeOrClass.length === 1) {
				const elementType = typeOrClass[0];
				
				// Check if it's nested array syntax: [[Type]], [[[Type]]], etc.
				if (Array.isArray(elementType)) {
					// Recursive case: [[Type]] → Type[][]
					// Extract the deepest type and count nesting levels
					let currentLevel = elementType;
					let nestingDepth = 1; // We're already at depth 1 from outer array
					let deepestType = elementType;
					
					// Traverse nested arrays to find the actual type
					while (Array.isArray(currentLevel) && currentLevel.length === 1) {
						nestingDepth++;
						deepestType = currentLevel[0];
						currentLevel = currentLevel[0];
					}
					
					// Set design:type to Array (for the outermost level)
					Reflect.defineMetadata('design:type', Array, target, propertyKey);
					
					// Register the actual element type (not the nested array)
					Reflect.defineMetadata('arrayElementClass', deepestType, target, propertyKey);
					
					// Store nesting depth for deserializer to handle
					Reflect.defineMetadata('arrayNestingDepth', nestingDepth, target, propertyKey);
					
					return;
				}
				
				// Simple array: [Date], [Post], [BigInt], etc.
				// Set design:type to Array
				Reflect.defineMetadata('design:type', Array, target, propertyKey);
				
				// Register the element type as arrayElementClass
				Reflect.defineMetadata('arrayElementClass', elementType, target, propertyKey);
				
				// Set nesting depth to 1 for simple arrays
				Reflect.defineMetadata('arrayNestingDepth', 1, target, propertyKey);
				return;
			} else if (typeOrClass.length > 1) {
				// Union type array: [Content, Metadata], [Date, BigInt], etc.
				// Store ALL types for discriminator to choose from
				
				Reflect.defineMetadata('design:type', Array, target, propertyKey);
				
				// Store first type as arrayElementClass for backward compatibility
				Reflect.defineMetadata('arrayElementClass', typeOrClass[0], target, propertyKey);
				
				// Store ALL types in arrayElementTypes for union type discrimination
				Reflect.defineMetadata('arrayElementTypes', typeOrClass, target, propertyKey);
				
				Reflect.defineMetadata('arrayNestingDepth', 1, target, propertyKey);
				return;
			}
		}

		if (typeof typeOrClass === 'string') {
			// String literal ('bigint', 'regexp', 'int8array', etc.)
			Reflect.defineMetadata('fieldType', typeOrClass, target, propertyKey);
		} else if (typeOrClass === BigInt) {
			// Special case for BigInt (not a constructor, but a factory function)
			Reflect.defineMetadata('fieldType', 'bigint', target, propertyKey);
		} else if (typeOrClass === Date) {
			// Special case for Date
			Reflect.defineMetadata('fieldType', 'date', target, propertyKey);
		} else if (typeOrClass === Boolean) {
			// Special case for Boolean constructor
			Reflect.defineMetadata('fieldType', 'boolean', target, propertyKey);
		} else if (typeOrClass === Number) {
			// Special case for Number constructor
			Reflect.defineMetadata('fieldType', 'number', target, propertyKey);
		} else if (typeOrClass === String) {
			// Special case for String constructor
			Reflect.defineMetadata('fieldType', 'string', target, propertyKey);
		} else if (typeOrClass === Set) {
			// Special case for Set - store as string for transformer lookup
			Reflect.defineMetadata('fieldType', 'set', target, propertyKey);
		} else if (typeOrClass === Map) {
			// Special case for Map - store as string for transformer lookup
			Reflect.defineMetadata('fieldType', 'map', target, propertyKey);
		} else if (typeOrClass === WeakMap) {
			// Special case for WeakMap
			Reflect.defineMetadata('fieldType', 'weakmap', target, propertyKey);
		} else if (typeOrClass === WeakSet) {
			// Special case for WeakSet
			Reflect.defineMetadata('fieldType', 'weakset', target, propertyKey);
		} else if (typeOrClass === Promise) {
			// Special case for Promise
			Reflect.defineMetadata('fieldType', 'promise', target, propertyKey);
		} else if (typeOrClass && typeof typeOrClass === 'function') {
			// Check if it's a Math method (Math.round, Math.floor, etc.)
			const mathMethods = [
				Math.round,
				Math.floor,
				Math.ceil,
				Math.trunc,
				Math.abs,
				Math.sign,
				Math.sqrt,
				Math.cbrt,
				Math.exp,
				Math.log,
				Math.log10,
				Math.log2,
				Math.sin,
				Math.cos,
				Math.tan,
				Math.asin,
				Math.acos,
				Math.atan,
			];

			if (mathMethods.includes(typeOrClass as any)) {
				// It's a Math method - store as transformer
				Reflect.defineMetadata('fieldTransformer', typeOrClass, target, propertyKey);
				return;
			}

			// Check if it's an arrow function or regular function transformer
			const funcStr = typeOrClass.toString();
			if (funcStr.includes('=>') || funcStr.startsWith('function')) {
				// It's a transformer function - store the function itself
				Reflect.defineMetadata('fieldTransformer', typeOrClass, target, propertyKey);
				return;
			}

			// Check if it's a registered native constructor (RegExp, Error, URL, etc.)
			type INativeConstructor =
				| typeof RegExp
				| typeof Error
				| typeof URL
				| typeof URLSearchParams
				| typeof Int8Array
				| typeof Uint8Array
				| typeof Uint8ClampedArray
				| typeof Int16Array
				| typeof Uint16Array
				| typeof Int32Array
				| typeof Uint32Array
				| typeof Float32Array
				| typeof Float64Array
				| typeof BigInt64Array
				| typeof BigUint64Array
				| typeof ArrayBuffer
				| typeof DataView
				| typeof Set
				| typeof Map;

			const nativeConstructors: INativeConstructor[] = [
				RegExp,
				Error,
				URL,
				URLSearchParams,
				Int8Array,
				Uint8Array,
				Uint8ClampedArray,
				Int16Array,
				Uint16Array,
				Int32Array,
				Uint32Array,
				Float32Array,
				Float64Array,
				BigInt64Array,
				BigUint64Array,
				ArrayBuffer,
				DataView,
				Set,
				Map,
			];

			const isNativeConstructor = nativeConstructors.some((ctor) => ctor === typeOrClass);

			if (isNativeConstructor) {
				// Store as fieldType using the constructor directly
				Reflect.defineMetadata('fieldType', typeOrClass, target, propertyKey);
			} else {
				// Check if it's a constructor (has prototype property) vs a plain function
				const hasPrototype =
					typeOrClass.prototype && typeOrClass.prototype.constructor === typeOrClass;

				if (hasPrototype) {
					// It's a custom model class - for NESTED MODELS only (single object)
					// Arrays MUST use explicit [Type] syntax
					
					// Check if design:type is Array (meaning user declared it as array)
					const existingDesignType = Reflect.getMetadata('design:type', target, propertyKey);
					
					if (existingDesignType === Array) {
						// User declared property as Array but used @QType(Type) instead of @QType([Type])
						// This is WRONG - arrays require explicit syntax
						// DO NOT register arrayElementClass - let it fail silently (no transformation)
						console.warn(
							`⚠️ @QType(${typeOrClass.name}) on array property '${String(propertyKey)}' - ` +
							`use @QType([${typeOrClass.name}]) for arrays`
						);
					} else {
						// It's a nested model (single object, not array)
						Reflect.defineMetadata('arrayElementClass', typeOrClass, target, propertyKey);
						// Set design:type to the class for nested models
						Reflect.defineMetadata('design:type', typeOrClass, target, propertyKey);
					}
				} else {
					// It's a transformer function (Math.round, btoa, arrow function, etc.)
					// Examples: Math.round, Math.floor, btoa, atob, JSON.parse, (v) => v * 2
					Reflect.defineMetadata('fieldTransformer', typeOrClass, target, propertyKey);
				}
			}
		}
	};
}

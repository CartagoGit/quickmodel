/**
 * @fileoverview Universal \@QType() decorator for QModel properties.
 *
 * ## Decorator modes
 *
 * \@QType supports two compilation modes transparently — no configuration needed:
 *
 * **Legacy mode** (`experimentalDecorators: true`)
 * The inner function is called immediately at class-definition time with
 * `(target: object, propertyKey: string | symbol)` where `target` is the
 * class prototype. Metadata is registered synchronously.
 *
 * **TC39 mode** (`experimentalDecorators` absent or `false`)
 * The inner function is called with `(undefined, ClassFieldDecoratorContext)`.
 * Because the prototype is not accessible at decoration time, a
 * `context.addInitializer` callback is registered. That callback fires on the
 * **first instance creation** (before `QModel.initialize()` reads the metadata),
 * ensuring the metadata is always available in time.
 * A `createTC39Guard()` WeakSet prevents duplicate registration on subsequent
 * instantiations of the same class.
 *
 * SOLID Principles Applied:
 * - Open/Closed: Allows marking fields without modifying QModel core
 * - Interface Segregation: Provides multiple ways to specify field types
 * - Dependency Inversion: Works with abstract transformer registry
 */

import 'reflect-metadata';
import { QUICK_PROPERTY_KEYS } from '../constants/metadata-keys';
import { NATIVE_TYPE_MAP } from '../constants/native-types';
import { createTC39Guard } from './qrule-tc39-registry';
import type { IQTypeOptions } from '../interfaces/qtype-options.interface';
import type { IQSpec } from '../interfaces/quick.interface';
import type { IClassFieldDecoratorCtx } from '../types/ts-polyfills.type';

// ---------------------------------------------------------------------------
// TC39 field-decorator context helpers
// ---------------------------------------------------------------------------

/** @internal Minimal shape of a TC39 ClassFieldDecoratorContext. */
interface ITC39FieldContext {
	readonly kind: 'field';
	readonly name: string | symbol;
	readonly static: boolean;
	readonly private: boolean;
	addInitializer(initializer: (this: unknown) => void): void;
}

/**
 * Returns `true` when `keyOrContext` is a TC39 `ClassFieldDecoratorContext`.
 * @internal
 */
function isTC39Context(
	keyOrContext: string | symbol | object
): keyOrContext is ITC39FieldContext {
	return (
		typeof keyOrContext === 'object' &&
		keyOrContext !== null &&
		'kind' in keyOrContext &&
		(keyOrContext as Record<string, unknown>)['kind'] === 'field'
	);
}

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
 * - **IMPORTANT**: When used WITHOUT `@Quick` on the class, you **MUST** use `declare` (e.g. `declare name: string`).
 *   Using `!` (e.g. `name!: string`) will cause TypeScript to emit an initializer that overwrites the decorator's logic.
 *
 * **WITH type argument** (`@QType(Type)`):
 * - Transforms the value to the specified type
 * - Supports: String literals, Native constructors, Q-Symbols, Model classes
 *
 * **WITH type and options** (`@QType(Type, options)`):
 * - Allows defining custom `transformer`, `serializer`, and `mocker` for this specific property
 * - Useful for complex types that default transformers can't handle properly
 *
 * @group Decorators
 * Syntax: `@QType(typeOrClass, options?)`
 * @template T - The property type
 * @param typeOrClass - Optional: Constructor, Symbol, or String literal for the field type
 * @param options - Optional: Object with custom `transformer`, `serializer`, and `mocker`
 * @returns A property decorator function that registers the field with appropriate metadata
 *
 * @example
 * **No transformation** (copy as-is):
 * ```typescript
 * class User extends QModel<IUser> {
 *   // Option 1: Use declare (no decorator needed)
 *   declare id: number;
 *   declare name: string;
 *
 *   // Option 2: Use @QType() for explicit metadata
 *   @QType() declare email: string;
 * }
 * ```
 *
 * @example
 * **Type transformation** (converts values):
 * ```typescript
 * class Account extends QModel<IAccount> {
 *   // String/Number -> BigInt
 *   @QType(BigInt) declare balance: bigint;
 *
 *   // String -> Date
 *   @QType(Date) declare createdAt: Date;
 *
 *   // String -> RegExp
 *   @QType(RegExp) declare pattern: RegExp;
 * }
 * ```
 *
 * @example
 * **Nested Models & Collections**:
 * ```typescript
 * class User extends QModel<IUser> {
 *   // Nested model
 *   @QType(Address) declare address: Address;
 *
 *   // Array of models (MUST use array syntax)
 *   @QType([Post]) declare posts: Post[];
 *
 *   // Array of dates
 *   @QType([Date]) declare logDates: Date[];
 * }
 * ```
 *
 * @example
 * **Advanced Options (Custom Transformer/Serializer/Mocker)**:
 * ```typescript
 * class Event extends QModel<IEvent> {
 *   // Handle timestamp <-> Date conversion
 *   @QType(Date, {
 *     // Input (JSON -> Model): number -> Date
 *     transformer: (val: number) => new Date(val),
 *     // Output (Model -> JSON): Date -> number
 *     serializer: (date: Date) => date.getTime(),
 *     // Test (Mock -> Model): random Date
 *     mocker: () => new Date('2024-01-01')
 *   })
 *   declare timestamp: Date;
 * }
 * ```
 *
 * @example
 * **String literals** (with IntelliSense):
 * ```typescript
 * class Account extends QModel<IAccount> {
 *   @QType('bigint') declare balance: bigint;
 *   @QType('symbol') declare id: symbol;
 *   @QType('regexp') declare pattern: RegExp;
 *   @QType('int8array') declare bytes: Int8Array;
 *   @QType('map') declare metadata: Map<string, unknown>;
 * }
 * ```
 *
 * @example
 * **Native constructors**:
 * ```typescript
 * class Binary extends QModel<IBinary> {
 *   @QType(RegExp) declare pattern: RegExp;
 *   @QType(Error) declare lastError: Error;
 *   @QType(Int8Array) declare bytes: Int8Array;
 *   @QType(ArrayBuffer) declare buffer: ArrayBuffer;
 * }
 * ```
 *
 * @example
 * **Maps, Sets, and Weak Collections**:
 * ```typescript
 * class Collections extends QModel<ICollections> {
 *   @QType(Map) declare mapping: Map<string, string>;
 *   @QType(Set) declare uniqueValues: Set<number>;
 *   @QType(WeakMap) declare cache: WeakMap<object, unknown>;
 * }
 * ```
 *
 * @example
 * **Buffer & Binary Types**:
 * ```typescript
 * class BlobData extends QModel<IBlobData> {
 *   @QType(ArrayBuffer) declare raw: ArrayBuffer;
 *   @QType(Uint8Array) declare image: Uint8Array;
 *   @QType(Float32Array) declare weights: Float32Array;
 *   @QType(DataView) declare view: DataView;
 * }
 * ```
 *
 * @example
 * **Transformers and Functions**:
 * ```typescript
 * class Products extends QModel<IProduct> {
 *   // Round price to nearest integer
 *   @QType(Math.round) declare price: number;
 *
 *   // Custom transformer function
 *   @QType((val) => val.toUpperCase()) declare code: string;
 *
 *   // Parse JSON string
 *   @QType(JSON.parse) declare metadata: object;
 * }
 * ```
 *
 * @example
 * **Q-Symbol based**:
 * ```typescript
 * class Account extends QModel<IAccount> {
 *   @QType(QBigInt) declare balance: bigint;
 *   @QType(QSymbol) declare id: symbol;
 *   @QType(QRegExp) declare pattern: RegExp;
 *   @QType(QInt8Array) declare data: Int8Array;
 * }
 * ```
 *
 * @example
 * **Transformer Objects (Inline)**:
 * ```typescript
 * const MyTransformer = {
 *   serialize: (v) => v.toString(),
 *   deserialize: (v) => new Date(v)
 * };
 *
 * class Log extends QModel<ILog> {
 *   @QType(MyTransformer) declare timestamp: Date;
 * }
 * ```
 *
 * @remarks
 * **Why use @QType?**
 * TypeScript types are erased at runtime. Without this decorator (or @Quick), the library cannot know that `createdAt` should be transformed into a `Date` object, or that `balance` should be a `BigInt`.
 */

// ---------------------------------------------------------------------------
// Internal helper — shared by both legacy and TC39 paths
// ---------------------------------------------------------------------------

/**
 * Grouped type/options config passed to {@link applyQTypeMetadata}.
 * Bundling these two arguments keeps the function within the `max-params` limit.
 * @internal
 */
interface IQTypeApplyConfig {
	/** The type constructor, Q-Symbol, string literal, or transformer. */
	typeOrClass: IQSpec | Array<unknown> | undefined;
	/** Optional per-property transformer / serializer / mocker overrides. */
	options: IQTypeOptions | undefined;
}

/**
 * Applies all QType metadata and getter/setter to `proto` for `propertyKey`.
 *
 * Called by both decorator paths:
 * - **Legacy**: invoked directly from the `PropertyDecorator` callback.
 * - **TC39**: invoked inside `context.addInitializer`, deduped via
 *   `createTC39Guard()` so it runs exactly once per class prototype.
 *
 * @internal
 */
function applyQTypeMetadata(
	proto: object,
	propertyKey: string | symbol,
	config: IQTypeApplyConfig
): void {
	const { typeOrClass, options } = config;
	// Register the property in the fields list
	const existingFields =
		(Reflect.getMetadata(QTYPES_METADATA_KEY, proto) as Array<
			string | symbol
		>) || [];
	if (!existingFields.includes(propertyKey)) {
		const newFields = [...existingFields, propertyKey];
		Reflect.defineMetadata(QTYPES_METADATA_KEY, newFields, proto);
	}

	// Save advanced options if present
	if (options) {
		if (options.transformer) {
			Reflect.defineMetadata(
				'customTransformer',
				options.transformer,
				proto,
				propertyKey
			);
		}
		if (options.serializer) {
			Reflect.defineMetadata(
				'customSerializer',
				options.serializer,
				proto,
				propertyKey
			);
		}
		if (options.mocker) {
			Reflect.defineMetadata(
				'customMocker',
				options.mocker,
				proto,
				propertyKey
			);
		}
	}

	// ALWAYS create getter/setter to prevent TypeScript from shadowing with real properties

	// Check if getter/setter already exists
	const existingDescriptor = Object.getOwnPropertyDescriptor(
		proto,
		propertyKey
	);
	if (
		!existingDescriptor ||
		(!existingDescriptor.get && !existingDescriptor.set)
	) {
		const storageKey = `${QUICK_PROPERTY_KEYS}${String(propertyKey)}`;

		// Define getter/setter
		Object.defineProperty(proto, propertyKey, {
			get(this: Record<string, unknown>) {
				return this[storageKey];
			},
			set(this: Record<string, unknown>, value: unknown) {
				this[storageKey] = value;
			},
			enumerable: true,
			configurable: true,
		});

		// Mark as generated by QType so installLazyGetters knows it can override it
		Reflect.defineMetadata('qtype:generated', true, proto, propertyKey);
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
				while (
					Array.isArray(currentLevel) &&
					currentLevel.length === 1
				) {
					nestingDepth++;
					deepestType = currentLevel[0];
					currentLevel = currentLevel[0];
				}

				// Set design:type to Array (for the outermost level)
				Reflect.defineMetadata(
					'design:type',
					Array,
					proto,
					propertyKey
				);

				// Register the actual element type (not the nested array)
				Reflect.defineMetadata(
					'arrayElementClass',
					deepestType,
					proto,
					propertyKey
				);

				// Store nesting depth for deserializer to handle
				Reflect.defineMetadata(
					'arrayNestingDepth',
					nestingDepth,
					proto,
					propertyKey
				);

				return;
			}

			// Simple array: [Date], [Post], [BigInt], etc.
			// Set design:type to Array
			Reflect.defineMetadata('design:type', Array, proto, propertyKey);

			// Register the element type as arrayElementClass
			Reflect.defineMetadata(
				'arrayElementClass',
				elementType,
				proto,
				propertyKey
			);

			// Set nesting depth to 1 for simple arrays
			Reflect.defineMetadata('arrayNestingDepth', 1, proto, propertyKey);
			return;
		} else if (typeOrClass.length > 1) {
			// Union type array: [Content, Metadata], [Date, BigInt], etc.
			// Store ALL types for discriminator to choose from

			Reflect.defineMetadata('design:type', Array, proto, propertyKey);

			// Store first type as arrayElementClass for backward compatibility
			Reflect.defineMetadata(
				'arrayElementClass',
				typeOrClass[0],
				proto,
				propertyKey
			);

			// Store ALL types in arrayElementTypes for union type discrimination
			Reflect.defineMetadata(
				'arrayElementTypes',
				typeOrClass,
				proto,
				propertyKey
			);

			Reflect.defineMetadata('arrayNestingDepth', 1, proto, propertyKey);
			return;
		}
	}

	if (
		typeof typeOrClass === 'object' &&
		typeOrClass !== null &&
		!Array.isArray(typeOrClass) &&
		('serialize' in typeOrClass || 'deserialize' in typeOrClass)
	) {
		// Custom Transformer Object
		Reflect.defineMetadata('fieldType', typeOrClass, proto, propertyKey);
		return;
	}

	if (typeof typeOrClass === 'string') {
		// String literal ('bigint', 'regexp', 'int8array', etc.)
		Reflect.defineMetadata('fieldType', typeOrClass, proto, propertyKey);
	} else if (typeOrClass === Array) {
		// Special case for Array constructor (e.g. @QType(Array) or @Quick({ tags: Array }))
		// Treat as generic array
		Reflect.defineMetadata('fieldType', 'array', proto, propertyKey);
		Reflect.defineMetadata('design:type', Array, proto, propertyKey);
	} else if (typeOrClass === BigInt) {
		// Special case for BigInt (not a constructor, but a factory function)
		Reflect.defineMetadata('fieldType', 'bigint', proto, propertyKey);
	} else if (typeOrClass === Date) {
		// Special case for Date
		Reflect.defineMetadata('fieldType', 'date', proto, propertyKey);
	} else if (typeOrClass === Boolean) {
		// Special case for Boolean constructor
		Reflect.defineMetadata('fieldType', 'boolean', proto, propertyKey);
	} else if (typeOrClass === Number) {
		// Special case for Number constructor
		Reflect.defineMetadata('fieldType', 'number', proto, propertyKey);
	} else if (typeOrClass === String) {
		// Special case for String constructor
		Reflect.defineMetadata('fieldType', 'string', proto, propertyKey);
	} else if (typeOrClass === Set) {
		// Special case for Set - store as string for transformer lookup
		Reflect.defineMetadata('fieldType', 'set', proto, propertyKey);
	} else if (typeOrClass === Map) {
		// Special case for Map - store as string for transformer lookup
		Reflect.defineMetadata('fieldType', 'map', proto, propertyKey);
	} else if (typeOrClass === WeakMap) {
		// Special case for WeakMap
		Reflect.defineMetadata('fieldType', 'weakmap', proto, propertyKey);
	} else if (typeOrClass === WeakSet) {
		// Special case for WeakSet
		Reflect.defineMetadata('fieldType', 'weakset', proto, propertyKey);
	} else if (typeOrClass === Promise) {
		// Special case for Promise
		Reflect.defineMetadata('fieldType', 'promise', proto, propertyKey);
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

		if (mathMethods.includes(typeOrClass as (x: number) => number)) {
			// It's a Math method - store as transformer
			Reflect.defineMetadata(
				'customTransformer',
				typeOrClass,
				proto,
				propertyKey
			);
			return;
		}

		// CRITICAL: Check for wrapped constructors from @Quick() BEFORE checking funcStr
		// Wrapped constructors start with 'function' but should be treated as classes, not transformers
		const isQuickWrapped = '__createQuickInstance' in typeOrClass;

		if (isQuickWrapped) {
			// It's a wrapped constructor from @Quick() - treat as nested model
			Reflect.defineMetadata(
				'arrayElementClass',
				typeOrClass,
				proto,
				propertyKey
			);
			Reflect.defineMetadata(
				'design:type',
				typeOrClass,
				proto,
				propertyKey
			);
			return;
		}

		// Check if it's a registered native constructor (RegExp, Error, URL, etc.)
		// We MUST check this BEFORE checking for function transformers, because native constructors
		// are functions (e.g. RegExp.toString() starts with "function") but must be treated as types.
		if (NATIVE_TYPE_MAP.has(typeOrClass)) {
			Reflect.defineMetadata(
				'fieldType',
				NATIVE_TYPE_MAP.get(typeOrClass),
				proto,
				propertyKey
			);
			return;
		}

		// Check if it's an arrow function or regular function transformer
		const funcStr = typeOrClass.toString();
		if (funcStr.includes('=>') || funcStr.startsWith('function')) {
			// It's a transformer function - store the function itself
			Reflect.defineMetadata(
				'customTransformer',
				typeOrClass,
				proto,
				propertyKey
			);
			return;
		}

		// Check if it's a constructor (has prototype property) vs a plain function
		const hasPrototype =
			typeOrClass.prototype &&
			typeOrClass.prototype.constructor === typeOrClass;

		if (hasPrototype) {
			// It's a custom model class - for nested models (single object)
			// Arrays MUST use explicit [Type] syntax

			// For single type (NOT array syntax), register as nested model
			Reflect.defineMetadata(
				'arrayElementClass',
				typeOrClass,
				proto,
				propertyKey
			);
			Reflect.defineMetadata(
				'design:type',
				typeOrClass,
				proto,
				propertyKey
			);
		} else {
			// It's a transformer function (Math.round, btoa, arrow function, etc.)
			// Examples: Math.round, Math.floor, btoa, atob, JSON.parse, (v) => v * 2
			Reflect.defineMetadata(
				'customTransformer',
				typeOrClass,
				proto,
				propertyKey
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Public decorator factory
// ---------------------------------------------------------------------------

export function QType(
	typeOrClass?: IQSpec | Array<unknown>, // Support array syntax: [Type], [[Type]], etc.
	options?: IQTypeOptions
): {
	/**
	 * Legacy `PropertyDecorator` overload.
	 * Resolved by TypeScript when `experimentalDecorators: true` is active.
	 */
	(target: object, propertyKey: string | symbol): void;
	/**
	 * TC39 field decorator overload.
	 * Resolved by TypeScript 5+ when `experimentalDecorators` is absent/false.
	 * Metadata is registered via `addInitializer` (runs on first instance creation).
	 */
	<This, T>(
		target: undefined,
		context: IClassFieldDecoratorCtx<This, T>
	): void;
} {
	return function (
		targetOrUndefined: object | undefined,
		keyOrContext: string | symbol | ITC39FieldContext
	): void {
		// ── TC39 field-decorator path ──────────────────────────────────────
		// In TC39 mode the inner function receives (undefined, ClassFieldDecoratorContext).
		// We use addInitializer so that metadata is applied to the prototype on the
		// first instance creation (before QModel.initialize() reads it).
		if (targetOrUndefined === undefined && isTC39Context(keyOrContext)) {
			const context = keyOrContext;
			const fieldName = context.name;
			const guard = createTC39Guard();
			context.addInitializer(function (this: unknown) {
				const proto = Object.getPrototypeOf(this as object) as object;
				if (guard.hasAndMark(proto)) return;
				applyQTypeMetadata(proto, fieldName, { typeOrClass, options });
			});
			return;
		}

		// ── Legacy (experimentalDecorators) path ──────────────────────────
		applyQTypeMetadata(
			targetOrUndefined as object,
			keyOrContext as string | symbol,
			{ typeOrClass, options }
		);
	} as ReturnType<typeof QType>;
}

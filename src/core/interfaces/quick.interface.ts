import type { QAlias } from '../types/q-alias.type';

/**
 * Constructor type for class-based type mapping
 */
export type IConstructor<T = any> = new (...args: any[]) => T;

/**
 * Transformer function that converts a value
 */
export type ITransformerFunction = (value: unknown) => unknown;

/**
 * Native constructors and factories supported by QuickModel
 */
export type INativeFactory =
	| BigIntConstructor
	| SymbolConstructor
	| DateConstructor
	| RegExpConstructor
	| MapConstructor
	| SetConstructor
	| StringConstructor
	| NumberConstructor
	| BooleanConstructor
	| ArrayBufferConstructor
	| SharedArrayBufferConstructor
	| DataViewConstructor
	| ErrorConstructor
	| Int8ArrayConstructor
	| Uint8ArrayConstructor
	| Uint8ClampedArrayConstructor
	| Int16ArrayConstructor
	| Uint16ArrayConstructor
	| Int32ArrayConstructor
	| Uint32ArrayConstructor
	| Float32ArrayConstructor
	| Float64ArrayConstructor
	| { new (...args: any[]): URL; prototype: URL }
	| { new (...args: any[]): URLSearchParams; prototype: URLSearchParams }
	| { new (...args: any[]): TextEncoder; prototype: TextEncoder }
	| { new (...args: any[]): TextDecoder; prototype: TextDecoder };

/**
 * All supported type specifications for @Quick() decorator
 *
 * Supports:
 * - String literals: 'bigint', 'date', 'regexp', 'map', 'set', etc. (type conversions)
 * - Constructors: Date, RegExp, Map, Set, BigInt, Symbol, custom classes
 * - Transformer functions: (value) => transformed value (arrow or regular functions)
 * - Arrays: [Date], [[Date]], [[[Date]]] for nested arrays (up to 4 levels)
 * - Custom transformers
 */
export type ISpec =
	| QAlias // String literals like 'bigint', 'date', 'regexp'
	| IConstructor // Custom classes
	| INativeFactory // Built-in types (Date, BigInt, etc)
	| ITransformerFunction
	| ISpec[] // Array with element type like [Date], [[Date]], [[[Date]]]
	| (string & {}); // Allow any string (custom transformers) but preserve autocomplete for QAlias

/**
 * All supported type specifications for @Quick() decorator for arrays
 */
export type ISpecs = ISpec[]; // Array of any Spec

/**
 * Options for @Quick() decorator to specify property types explicitly
 *
 * Supports **dot notation** for nested property transformations.
 */
export interface QOptions {
	[propertyName: string]: ISpec | ISpecs;
}

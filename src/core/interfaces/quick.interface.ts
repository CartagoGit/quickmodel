import type { IQNativeConstructor } from '../constants/native-types';
import type { IQAlias } from '../types/q-alias.type';

/**
 * Constructor type for class-based type mapping
 */
export type IQConstructor<T = any> = new (...args: any[]) => T;

/**
 * Transformer function that converts a value
 */
export type IQTransformerFunction = (value: unknown) => unknown;

/**
 * Single type specification supported by QuickModel (without transformers).
 * Represents a type that can be transformed via class, native constructor, or alias.
 */
export type IQTypeSpec<T = any> =
	| IQConstructor<T>
	| IQNativeConstructor
	| IQAlias
	| symbol
	| PromiseConstructor;

/**
 * All supported type specifications for @Quick() and @QType() decorators.
 *
 * Supports:
 * - String literals: 'bigint', 'date', 'regexp', 'map', 'set', etc. (type conversions)
 * - Constructors: Date, RegExp, Map, Set, BigInt, Symbol, custom classes
 * - Transformer functions: (value) => transformed value (arrow or regular functions)
 * - Arrays: [Date], [[Date]], [[[Date]]] for nested arrays (up to 4 levels)
 * - Custom transformers
 */
export type IQSpec =
	| IQTypeSpec // Classes, natives, aliases
	| IQTransformerFunction // Custom transformer function
	| IQSpec[] // Array with element type like [Date], [[Date]]
	| (string & {}) // Allow any string (custom transformers) but preserve autocomplete for IQAlias
	| { deserialize: Function; serialize: Function }; // Custom transformer object

/**
 * All supported type specifications for @Quick() decorator for arrays
 */
export type IQSpecs = IQSpec[]; // Array of any Spec

/**
 * Options for @Quick() decorator to specify property types explicitly
 *
 * Supports **dot notation** for nested property transformations.
 */
export interface IQOptions {
	[propertyName: string]: IQSpec | IQSpecs;
}

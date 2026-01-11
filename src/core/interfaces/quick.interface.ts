import type { INativeConstructor } from '../constants/native-types';
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
 * Single type specification supported by QuickModel (without transformers).
 * Represents a type that can be transformed via class, native constructor, or alias.
 */
export type QTypeSpec<T = any> =
	| IConstructor<T>
	| INativeConstructor
	| QAlias
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
export type ISpec =
	| QTypeSpec // Classes, natives, aliases
	| ITransformerFunction // Custom transformer function
	| ISpec[] // Array with element type like [Date], [[Date]]
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

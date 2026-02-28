import type { IQNativeConstructor } from '../constants/native-types';
import type { IQAlias } from '../types/q-alias.type';

/**
 * Constructor type for class-based type mapping.
 *
 * Represents any newable class that QuickModel can recursively hydrate,
 * e.g. `class Address {}`. Passed directly to `@Quick()` / `@QType()`.
 *
 * @typeParam T - The type produced by the constructor.
 * @see {@link IQSpec} — union that includes this type among other forms
 * @see {@link Quick} — primary consumer: `@Quick({ field: MyClass })`
 */
export type IQConstructor<T = any> = new (...args: any[]) => T;

/**
 * A custom transformer function provided via `@Quick()` / `@QType()`.
 *
 * Can be a plain arrow function `(v) => new Date(v)` or any other callable.
 * QuickModel calls it as `fn(rawValue)` during deserialization.
 * @see {@link IQSpec} — full union that includes this function form
 * @see {@link IQTransformerFn} — stricter typed alias `(v: unknown) => unknown`
 */
export type IQTransformerFunction = Function;

/**
 * Single type specification for QuickModel **without** function transformers.
 *
 * Represents all the non-function options that can be passed as a type token
 * to `@Quick()` / `@QType()`:
 *
 * | option | example | effect |
 * |---|---|---|
 * | `IQConstructor<T>` | `class User {}` | Recursively hydrates nested model |
 * | `IQNativeConstructor` | `Date`, `RegExp`, `Map` | Routes to built-in transformer |
 * | `IQAlias` | `'date'`, `'bigint'` | Routes to alias transformer |
 * | `symbol` | `MY_TRANSFORMER` | Looks up in `QTransformerRegistry` |
 * | `PromiseConstructor` | `Promise` | Deferred/async placeholder |
 *
 * @typeParam T - The target runtime type.
 * @see {@link IQSpec} for the full union including functions and arrays
 * @see {@link QType} — property decorator that accepts `IQTypeSpec` as its first argument
 * @see {@link Quick} — class decorator that accepts a map of `IQTypeSpec` values
 */
export type IQTypeSpec<T = any> =
	| IQConstructor<T>
	| IQNativeConstructor
	| IQAlias
	| symbol
	| PromiseConstructor;

/**
 * Full set of type specifications accepted by `@Quick()` and `@QType()` decorators.
 *
 * | form | example | effect |
 * |---|---|---|
 * | `IQTypeSpec` | `Date`, `User`, `'bigint'` | Class / native / alias transformer |
 * | `IQTransformerFunction` | `(v) => new Date(v)` | Inline transformer function |
 * | `IQSpec[]` | `[Date]`, `[[Map]]` | Typed array (up to 4 nesting levels) |
 * | `string` | `'myCustomKey'` | Registry symbol-key lookup |
 * | `{ deserialize; serialize }` | custom object | Inline bi-directional transformer |
 * | `null` | `null` | Marks nullable union `[Date, null]` |
 * | `undefined` | `undefined` | Marks optional union |
 *
 * @see {@link IQTypeSpec} for the subset without functions
 * @see {@link IQOptions} for the decorator options shape
 */
export type IQSpec =
	| IQTypeSpec // Classes, natives, aliases
	| IQTransformerFunction // Custom transformer function
	| IQSpec[] // Array with element type like [Date], [[Date]]
	| (string & {}) // Allow any string (custom transformers) but preserve autocomplete for IQAlias
	| { deserialize: Function; serialize: Function } // Custom transformer object
	| null // Allow null in union types (e.g. [Date, null])
	| undefined; // Allow undefined in union types

/**
 * Ordered array of `IQSpec` entries used by the `@Quick()` array-form notation.
 *
 * @see {@link IQSpec} — the element type
 * @see {@link IQOptions} — map of property name → `IQSpec | IQSpecs`
 */
export type IQSpecs = IQSpec[]; // Array of any Spec

/**
 * Property-to-type-spec map passed to the `@Quick()` class decorator.
 *
 * Each key is a **property name** (optionally using dot notation for nested
 * paths) and each value is the type spec to apply during transformation.
 *
 * Supports **dot notation** for nested property transformations.
 *
 * @example
 * ```typescript
 * @Quick({ createdAt: Date, 'address.zip': Number })
 * class Order extends QModel<IOrder> { ... }
 * ```
 *
 * @see {@link IQSpec} for accepted value shapes
 * @see {@link Quick} — decorator that accepts this map as its first argument
 * @see {@link QModel.create} — the runtime counterpart that uses this configuration
 */
export interface IQOptions {
	[propertyName: string]: IQSpec | IQSpecs;
}

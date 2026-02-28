/**
 * Shared helper types for QModel model definitions.
 *
 * - `IQAnyRecord` — escape-hatch record type used internally to satisfy
 *   index-signature requirements in places where `any` is genuinely needed.
 * - `IModelConstructor<TModel>` — minimal constructor + static-method shape
 *   used to type-check model classes without importing the full `QModel` class.
 * - `IQTransform<T, Transforms>` — internal helper for partial type overrides.
 * - `IQImplements<TInterface, TTransforms>` — public helper that merges a
 *   base interface with its transformed-property overrides.
 *
 * @module core/interfaces/model.interface
 */

/**
 * Open record type whose values are `any`.
 * Used internally by QuickModel in the few places where an explicit `any`
 * index signature is required (e.g. Reflect metadata payloads).
 * Satisfies ESLint's `no-explicit-any` rule via indirection.
 */
export interface IQAnyRecord extends Record<string, any> {}

/**
 * Minimal shape of a concrete QModel class constructor.
 * Used to type-check static methods such as `deserialize` without pulling
 * in the full `QModel` base class.
 *
 * @template TModel - The model instance type produced by the constructor.
 */
export interface IModelConstructor<TModel> {
	new (data: any): TModel;
	deserialize(data: any): TModel;
}

/**
 * Quick transform helper — merges a base interface with overridden properties.
 *
 * @internal
 * @template T - Base interface (backend data structure)
 * @template Transforms - Object with only the properties that change types
 */
export type IQTransform<T, Transforms> = Omit<T, keyof Transforms> & Transforms;

/**
 * Helper type for defining type transformations in models.
 *
 * Allows you to specify which properties have different types in JSON (TInterface)
 * versus in memory (after transformation). This is essential for types like Date, BigInt,
 * RegExp, etc. that need serialization/deserialization.
 *
 * @group Types
 * Syntax: `IQImplements<TInterface, TTransform>`
 *
 * @template TInterface - Base model interface representing JSON structure
 * @template TTransforms - Object mapping property names to their transformed types
 *
 * @see {@link QModel} — the base class that performs the actual type transformation at runtime
 * @see {@link Quick} — decorator that maps each property to its transformer
 *
 * @example
 * Basic usage with type transformations
 * ```typescript
 * interface IUser {
 *   id: string;
 *   balance: string;      // In JSON: string
 *   createdAt: string;    // In JSON: ISO date string
 * }
 *
 * type UserTransforms = {
 *   balance: bigint;      // In memory: bigint
 *   createdAt: Date;      // In memory: Date object
 * };
 *
 * class User extends QModel<IUser, UserTransforms>
 *   implements IQImplements<IUser, UserTransforms> {
 *   declare id: string;
 *   declare balance: bigint;
 *   declare createdAt: Date;
 * }
 * ```
 *
 * @example
 * Multiple type transformations
 * ```typescript
 * interface IProduct {
 *   id: string;
 *   price: string;        // JSON: string
 *   regex: object;        // JSON: IQSerialized regex
 *   updated: string;      // JSON: ISO string
 * }
 *
 * type ProductTransforms = {
 *   price: bigint;
 *   regex: RegExp;
 *   updated: Date;
 * };
 *
 * class Product extends QModel<IProduct, ProductTransforms>
 *   implements IQImplements<IProduct, ProductTransforms> {
 *   declare id: string;
 *   declare price: bigint;
 *   declare regex: RegExp;
 *   declare updated: Date;
 * }
 * ```
 */
export type IQImplements<
	TInterface,
	TTransforms extends
		| Partial<Record<keyof TInterface, unknown>>
		| IQAnyRecord = {},
> = Omit<TInterface, keyof TTransforms> & TTransforms;

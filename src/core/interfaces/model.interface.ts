
/**
 * Public types for QModel models.
 *
 * This module provides helper types for defining type transformations
 * in model classes that extend QModel.
 * @module core/interfaces/model.interface
 * Really is used in multiple places to dodge eslint no-explicit-any
 * in several files where really is needed any type.
 */

export interface IQAnyRecord extends Record<string, any> {}

/**
 * Interface representing a concrete QModel constructor
 * Used to type-check static methods like deserialize locally
 */
export interface IModelConstructor<TModel> {
	new (data: any): TModel;
	deserialize(data: any): TModel;
}

/**
 * Quick transform helper - merges base interface with transformed properties.
 *
 * Use this with @Quick() decorator for simple type-safe transformations without
 * needing to define a separate transform interface.
 *
 * @template T - Base interface (backend data structure)
 * @template Transforms - Object with only the properties that change types
 *
 * @example
 * ```typescript
 * interface IUser {
 *   id: number;
 *   name: string;
 *   createdAt: string;  // Backend sends ISO string
 *   balance: string;    // Backend sends string
 * }
 *
 * @Quick()
 * class User extends QModel<IUser> implements IQTransform<IUser, {
 *   createdAt: Date;
 *   balance: bigint;
 * }> {
 *   declare id: number;
 *   declare name: string;
 *   declare createdAt: Date;
 *   declare balance: bigint;
 * }
 * ```
 * @group Types
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

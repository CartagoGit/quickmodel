/**
 * Public types for QModel models.
 * 
 * This module provides helper types for defining type transformations
 * in model classes that extend QModel.
 */

/**
 * Helper type for defining type transformations in models.
 * 
 * Allows you to specify which properties have different types in JSON (TInterface)
 * versus in memory (after transformation). This is essential for types like Date, BigInt,
 * RegExp, etc. that need serialization/deserialization.
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
 *   implements QInterface<IUser, UserTransforms> {
 *   @QType() id!: string;
 *   @QType(QBigInt) balance!: bigint;
 *   @QType() createdAt!: Date;
 * }
 * ```
 * 
 * @example
 * Multiple type transformations
 * ```typescript
 * interface IProduct {
 *   id: string;
 *   price: string;        // JSON: string
 *   regex: object;        // JSON: serialized regex
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
 *   implements QInterface<IProduct, ProductTransforms> {
 *   @QType() id!: string;
 *   @QType(QBigInt) price!: bigint;
 *   @QType(QRegExp) regex!: RegExp;
 *   @QType() updated!: Date;
 * }
 * ```
 */
export type QInterface<
  TInterface,
  TTransforms extends Partial<Record<keyof TInterface, unknown>> = {},
> = Omit<TInterface, keyof TTransforms> & TTransforms;

/** @deprecated Use QInterface instead */
export type QuickType<TInterface, TTransforms extends Partial<Record<keyof TInterface, unknown>> = {}> = QInterface<TInterface, TTransforms>;

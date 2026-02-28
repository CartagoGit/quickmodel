import type { QModel } from '@/core/models/quick.model';

/**
 * Extracts the instance type from a QModel class constructor.
 *
 * Given a QModel class constructor type (like `typeof User`), this utility type
 * extracts the actual instance type that will be created (`User`).
 *
 * This is useful for type-safe mock generation and factory patterns.
 *
 * @see {@link QModel.mock} — static method that returns a mock builder for the model
 * @see {@link IQModelInterface} — companion type that extracts the interface parameter
 *
 * @template T - The QModel class constructor type
 * @returns The instance type of the model
 *
 * @example
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() name!: string;
 * }
 *
 * type UserInstance = IQModelInstance<typeof User>; // User
 * const user: UserInstance = User.mock().random();
 * ```
 *
 * @see {@link QModel.mock} — returns a mock builder that yields `IQModelInstance<T>`
 */
export type IQModelInstance<T> = T extends abstract new (
	...args: any[]
) => infer R
	? R
	: never;

/**
 * Extracts the interface type from a QModel class constructor.
 *
 * Given a QModel class constructor type (like `typeof User`), this utility type
 * extracts the interface type parameter (`IUser`) that defines the model's structure.
 *
 * This is essential for type-safe data generation and transformation.
 *
 * @see {@link QModel.mock} — static method that returns a mock builder
 * @see {@link IQModelInstance} — companion type that extracts the instance type
 *
 * @template T - The QModel class constructor type
 * @returns The interface type used by the model
 *
 * @example
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() name!: string;
 * }
 *
 * type UserInterface = IQModelInterface<typeof User>; // IUser
 * const data: UserInterface = { name: 'John' };
 * ```
 *
 * @see {@link QModel.mock} — uses `IQModelInterface<T>` to type the generated data
 * @see {@link QMockGenerator} — generates mock data matching this interface shape
 */
export type IQModelInterface<T> =
	IQModelInstance<T> extends QModel<infer I> ? I : never;

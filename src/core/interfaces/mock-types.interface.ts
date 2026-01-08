import type { QModel } from '@/quick.model';

/**
 * Extracts the instance type from a QModel class constructor.
 * 
 * Given a QModel class constructor type (like `typeof User`), this utility type
 * extracts the actual instance type that will be created (`User`).
 * 
 * This is useful for type-safe mock generation and factory patterns.
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
 * type UserInstance = QModelInstance<typeof User>; // User
 * const user: UserInstance = User.mock().random();
 * ```
 */
export type QModelInstance<T> = T extends abstract new (
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
 * @template T - The QModel class constructor type
 * @returns The interface type used by the model
 * 
 * @example
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() name!: string;
 * }
 * 
 * type UserInterface = QModelInterface<typeof User>; // IUser
 * const data: UserInterface = { name: 'John' };
 * ```
 */
export type QModelInterface<T> = QModelInstance<T> extends QModel<infer I>
	? I
	: never;


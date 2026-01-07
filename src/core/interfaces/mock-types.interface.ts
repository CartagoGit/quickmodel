import type { QuickModel } from '../../quick.model';

/**
 * Extracts the instance type from a QuickModel class constructor.
 * 
 * @template T - The QuickModel class constructor type
 * @returns The instance type of the model (e.g., `User` from `typeof User`)
 * 
 * @example
 * ```typescript
 * type UserInstance = QuickModelInstance<typeof User>; // User
 * ```
 */
export type QuickModelInstance<T> = T extends abstract new (
	...args: any[]
) => infer R
	? R
	: never;

/**
 * Extracts the interface type from a QuickModel instance.
 * 
 * @template T - The QuickModel class constructor type
 * @returns The interface type used by the model (e.g., `IUser` from `typeof User`)
 * 
 * @example
 * ```typescript
 * type UserInterface = QuickModelInterface<typeof User>; // IUser
 * ```
 */
export type QuickModelInterface<T> = QuickModelInstance<T> extends QuickModel<
	infer I,
	any
>
	? I
	: never;

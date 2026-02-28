import 'reflect-metadata';
import { QCOMPUTED_METADATA_KEY } from '../constants/metadata-keys';

/**
 * Marks a getter as a **computed field** that will be included in
 * `serialize()` and `toJSON()` output.
 *
 * By default, prototype getters (computed properties) are **excluded** from
 * serialization to prevent accidental exposure of internal logic or
 * unintended output. Apply `@QComputed()` to opt-in a specific getter.
 *
 * @example
 * **Basic usage**
 * ```typescript
 * import { QModel, Quick, QComputed } from 'quickmodel';
 *
 * interface IUser {
 *   firstName: string;
 *   lastName: string;
 * }
 *
 * @Quick({ firstName: String, lastName: String })
 * class User extends QModel<IUser> {
 *   declare firstName: string;
 *   declare lastName: string;
 *
 *   @QComputed()
 *   get fullName(): string {
 *     return `${this.firstName} ${this.lastName}`;
 *   }
 * }
 *
 * const user = User.create({ firstName: 'Alice', lastName: 'Smith' });
 * user.serialize();
 * // { firstName: 'Alice', lastName: 'Smith', fullName: 'Alice Smith' }
 * ```
 *
 * @example
 * **Multiple computed fields**
 * ```typescript
 * @Quick({ firstName: String, lastName: String, birthYear: Number })
 * class User extends QModel<IUser> {
 *   declare firstName: string;
 *   declare lastName: string;
 *   declare birthYear: number;
 *
 *   @QComputed()
 *   get fullName(): string {
 *     return `${this.firstName} ${this.lastName}`;
 *   }
 *
 *   @QComputed()
 *   get age(): number {
 *     return new Date().getFullYear() - this.birthYear;
 *   }
 *
 *   // NOT decorated — excluded from serialization
 *   get initials(): string {
 *     return `${this.firstName[0]}.${this.lastName[0]}.`;
 *   }
 * }
 *
 * user.serialize();
 * // { firstName: 'Alice', lastName: 'Smith', birthYear: 1990, fullName: 'Alice Smith', age: 35 }
 * // Notice: 'initials' is NOT included
 * ```
 *
 * @group Decorators
 */
export function QComputed(): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		Reflect.defineMetadata(
			QCOMPUTED_METADATA_KEY,
			true,
			target,
			propertyKey as string
		);
	};
}

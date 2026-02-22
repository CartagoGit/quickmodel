import 'reflect-metadata';

/**
 * Metadata key for the alias name stored per-property.
 * @internal
 */
export const QALIAS_METADATA_KEY = '__qalias__';

/**
 * Metadata key for the ordered list of properties decorated with @QAlias.
 * @internal
 */
export const QALIAS_FIELDS_KEY = '__qalias_fields__';

/**
 * Maps a model property to an external key name used in `create()` input
 * and `serialize()` output.
 *
 * **Input remapping:** if the payload contains the alias key (e.g. `first_name`),
 * it is automatically renamed to the property name (`firstName`) before deserialization.
 *
 * **Output remapping:** `serialize()` / `toJSON()` emit the alias key instead of
 * the property name.
 *
 * @param alias - The external key name (e.g. `'first_name'`).
 *
 * @example
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   @QAlias('first_name')
 *   declare firstName: string;
 * }
 *
 * // Input: snake_case payload (e.g. from an API)
 * const user = User.create({ first_name: 'Alice', ... });
 * console.log(user.firstName); // 'Alice'
 *
 * // Output: alias keys
 * user.serialize(); // { first_name: 'Alice', ... }
 *
 * // Roundtrip
 * const copy = User.create(user.serialize());
 * copy.firstName === 'Alice'; // true
 * ```
 */
export function QAlias(alias: string): PropertyDecorator {
	return (target, propertyKey) => {
		const key = String(propertyKey);
		Reflect.defineMetadata(QALIAS_METADATA_KEY, alias, target, key);
		const existing: string[] =
			Reflect.getMetadata(QALIAS_FIELDS_KEY, target) ?? [];
		if (!existing.includes(key)) {
			Reflect.defineMetadata(
				QALIAS_FIELDS_KEY,
				[...existing, key],
				target
			);
		}
	};
}

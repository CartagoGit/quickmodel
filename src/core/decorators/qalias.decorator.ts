import 'reflect-metadata';

/**
 * Metadata key for the alias name stored per-property.
 *
 * @see {@link QAlias} — decorator that writes this key per property
 * @see {@link Serializer} — reads this key to emit alias names in output
 * @internal
 */
export const QALIAS_METADATA_KEY = '__qalias__';

/**
 * Metadata key for the ordered list of properties decorated with @QAlias.
 *
 * @see {@link QAlias} — decorator that pushes field names to this list
 * @see {@link Deserializer} — reads this list to remap input keys before deserialization
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
 * @see {@link Quick} — class-level alias configuration via `@Quick({}, { alias: {...} })` with full type-safety on `serialize()` return type
 * @see {@link QModel.serialize} — outputs the aliased key names
 * @see {@link QModel.create} — accepts the aliased key names as input
 *
 * @remarks
 * **TypeScript limitation:** due to `experimentalDecorators: true`, TypeScript cannot
 * propagate the alias mapping to the return type of `serialize()`. The IDE will show
 * the original property name (e.g. `firstName`) instead of the alias key (e.g. `first_name`).
 * At runtime the behaviour is correct.
 *
 * **Type-safe alternative:** use `@Quick({}, { alias: {...} })` combined with the second
 * generic on `QModel` to get correct IDE autocomplete on `serialize()` output:
 * ```typescript
 * type IUserAliases = { firstName: 'first_name'; lastName: 'last_name' };
 *
 * @Quick({}, { alias: { firstName: 'first_name', lastName: 'last_name' } })
 * class User extends QModel<IUser, IUserAliases> {
 *   declare firstName: string;
 *   declare lastName: string;
 * }
 *
 * user.serialize().first_name; // ✅ typed correctly
 * ```
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

import 'reflect-metadata';

/**
 * Metadata key applied by `@QSensitive()` to property declarations.
 *
 * Fields marked with this key are excluded from `serialize()` and `toJSON()`
 * output unless the caller passes `{ includeSensitive: true }`.
 *
 * @see {@link QSensitive} — decorator that writes this key
 * @see {@link QModel.serialize} — reads this key to filter output
 * @internal
 */
export const QSENSITIVE_METADATA_KEY = '__qSensitive__';

/**
 * Metadata key for the ordered list of property names decorated with `@QSensitive`.
 *
 * Stored on the class prototype as an array of field names. Used by `QModel.serialize()`
 * to quickly determine which fields to exclude.
 *
 * @see {@link QSensitive} — decorator that appends field names to this list
 * @see {@link QModel.serialize} — reads this list to skip sensitive fields
 * @internal
 */
export const QSENSITIVE_FIELDS_KEY = '__qSensitive_fields__';

/**
 * Marks a model property as sensitive.
 *
 * Sensitive fields are automatically excluded from `serialize()` and `toJSON()` output,
 * preventing accidental exposure of passwords, API keys, tokens, and other PII data.
 *
 * To include sensitive fields in the output, pass `{ includeSensitive: true }` to
 * `serialize()` or `toJSON()`. The fields remain fully accessible as instance
 * properties and are not affected by `toInterface()` or `checkRules()`.
 *
 * @example Basic usage — exclude password and token from serialized output
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   declare id: number;
 *   declare email: string;
 *
 *   @QSensitive()
 *   declare password: string;
 *
 *   @QSensitive()
 *   declare token: string;
 * }
 *
 * const user = new User({ id: 1, email: 'a@b.com', password: 'secret', token: 'tok' });
 * user.serialize();
 * // → { id: 1, email: 'a@b.com' }  ← password and token excluded
 *
 * user.serialize({ includeSensitive: true });
 * // → { id: 1, email: 'a@b.com', password: 'secret', token: 'tok' }
 *
 * user.password; // → 'secret'  ← still accessible as instance property
 * ```
 *
 * @see {@link QModel.serialize} — applies the sensitive filter
 * @see {@link IQSerializationOptions.includeSensitive} — override option
 */
export function QSensitive(): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		const key = String(propertyKey);

		// Mark the individual field
		Reflect.defineMetadata(QSENSITIVE_METADATA_KEY, true, target, key);

		// Append to the class-level list (avoiding duplicates)
		const existing: string[] =
			(Reflect.getOwnMetadata(QSENSITIVE_FIELDS_KEY, target) as
				| string[]
				| undefined) ?? [];
		if (!existing.includes(key)) {
			existing.push(key);
			Reflect.defineMetadata(QSENSITIVE_FIELDS_KEY, existing, target);
		}
	};
}

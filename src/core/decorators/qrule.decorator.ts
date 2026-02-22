import 'reflect-metadata';

/**
 * Metadata key for storing @QRule rules per property.
 * @internal
 */
export const QRULE_METADATA_KEY = '__qrule__';

/**
 * Metadata key for storing the list of properties decorated with @QRule.
 * @internal
 */
export const QRULE_FIELDS_KEY = '__qrule_fields__';

/**
 * A single business rule attached to a model property.
 */
export interface IQRule {
	/** Predicate that must return `true` for the rule to pass. */
	predicate: (value: unknown) => boolean;
	/**
	 * Error message when the rule fails.
	 * - `string`: static message (or i18n key for later translation, e.g. `e.message | translate`)
	 * - `() => string`: lazy message, evaluated at `checkRules()` call-time (useful for runtime i18n)
	 */
	message: string | (() => string);
}

/**
 * Result returned by `QModel.checkRules()`.
 */
export interface IQRulesResult {
	/** `true` when all business rules pass. */
	valid: boolean;
	/** Errors for every rule that failed. Empty array when `valid === true`. */
	errors: Array<{
		/** Name of the property that failed validation. */
		field: string;
		/** Resolved error message. */
		message: string;
		/** Current value of the property at validation time. */
		value: unknown;
	}>;
}

/**
 * Attaches a business-logic rule to a model property.
 *
 * Rules are checked by calling `model.checkRules()` — they are completely separate
 * from `checkIntegrity()`, which performs transformer-level type checks.
 *
 * Multiple `@QRule` decorators on the same property are all evaluated and
 * **all failures** are reported.
 *
 * The `message` parameter accepts either a string (static or i18n key) or a
 * lazy function evaluated at call-time, making it compatible with runtime i18n:
 *
 * ```typescript
 * // Static string (can also be used as Angular pipe key: `e.message | translate`)
 * @QRule((v) => (v as string).length >= 3, 'validation.name.min')
 *
 * // Lazy — resolved when checkRules() is called
 * @QRule((v) => (v as string).length >= 3, () => i18n.t('validation.name.min'))
 * ```
 *
 * @param predicate - Function receiving the current property value; must return `true` to pass.
 * @param message   - Error message (string) or lazy resolver `() => string`.
 *
 * @example
 * ```typescript
 * @Quick({ name: 'string', age: 'number' })
 * class User extends QModel<IUser> {
 *   @QRule((v) => (v as string).length >= 3, 'Name must be at least 3 characters')
 *   declare name: string;
 *
 *   @QRule((v) => (v as number) >= 0, 'Age cannot be negative')
 *   @QRule((v) => (v as number) <= 120, 'Age must be realistic')
 *   declare age: number;
 * }
 *
 * const user = new User({ name: 'Jo', age: -1 });
 * const result = user.checkRules();
 * // result.valid === false
 * // result.errors → [{ field: 'name', message: '…', value: 'Jo' }, { field: 'age', message: '…', value: -1 }]
 * ```
 */
export function QRule(
	predicate: (value: unknown) => boolean,
	message: string | (() => string)
): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		const key = String(propertyKey);

		// Append this rule to the existing list for this property
		const existing: IQRule[] =
			Reflect.getMetadata(QRULE_METADATA_KEY, target, key) ?? [];
		existing.push({ predicate, message });
		Reflect.defineMetadata(QRULE_METADATA_KEY, existing, target, key);

		// Track which fields have at least one @QRule on this class
		const fields: string[] =
			Reflect.getMetadata(QRULE_FIELDS_KEY, target) ?? [];
		if (!fields.includes(key)) {
			fields.push(key);
			Reflect.defineMetadata(QRULE_FIELDS_KEY, fields, target);
		}
	};
}

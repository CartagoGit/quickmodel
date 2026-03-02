import 'reflect-metadata';

/**
 * Metadata key for the ordered list of property names decorated with `@QReadonly`.
 *
 * Stored on the class prototype as a `string[]`. Read by `copy()` and `patch()`
 * before applying any partial — an error is thrown if the partial touches a readonly field.
 *
 * @see {@link QReadonly} — decorator that appends field names to this list
 * @see {@link QModel.$qCopy} — reads this list to guard against readonly mutation
 * @see {@link QModel.$qPatch} — reads this list to guard against readonly mutation
 * @internal
 */
export const QREADONLY_FIELDS_KEY = '__qReadonly_fields__';

/**
 * Error thrown when `copy()` or `patch()` tries to overwrite a `@QReadonly` field.
 *
 * @example
 * ```typescript
 * try {
 *   order.$qCopy({ id: 999 });
 * } catch (err) {
 *   if (err instanceof ImmutableFieldError) {
 *     console.error(err.field); // 'id'
 *   }
 * }
 * ```
 *
 * @see {@link QReadonly} — decorator that marks fields as immutable
 */
export class ImmutableFieldError extends Error {
	/** Name of the readonly field that was targeted. */
	readonly field: string;
	/** Name of the model class. */
	readonly modelName: string;

	constructor(field: string, modelName: string) {
		super(
			`[QuickModel] Attempted to mutate readonly field "${field}" on "${modelName}". ` +
				`Fields decorated with @QReadonly cannot be changed via copy() or patch().`
		);
		this.name = 'ImmutableFieldError';
		this.field = field;
		this.modelName = modelName;
	}
}

/**
 * Marks a model field as immutable after construction.
 *
 * Fields decorated with `@QReadonly` will throw an `ImmutableFieldError` if
 * they appear in the `partial` argument of `copy()` or `patch()`. The field
 * is still writable during the initial construction (`new Model(data)`) and
 * can be read freely at any point.
 *
 * @example Basic usage
 * ```typescript
 * @Quick()
 * class Order extends QModel<IOrder> {
 *   @QReadonly()
 *   declare id: number; // cannot be changed after construction
 *
 *   declare status: string;
 * }
 *
 * const order = new Order({ id: 1, status: 'pending' });
 * order.$qCopy({ status: 'shipped' }); // ✅ ok
 * order.$qCopy({ id: 999 });           // ❌ throws ImmutableFieldError
 * order.$qPatch({ id: 999 });          // ❌ throws ImmutableFieldError
 * ```
 *
 * @see {@link ImmutableFieldError} — error thrown on readonly violation
 * @see {@link QModel.$qCopy} — enforces @QReadonly
 * @see {@link QModel.$qPatch} — enforces @QReadonly
 */
export function QReadonly(): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		const key = String(propertyKey);

		const existing: string[] =
			(Reflect.getOwnMetadata(QREADONLY_FIELDS_KEY, target) as
				| string[]
				| undefined) ?? [];
		if (!existing.includes(key)) {
			existing.push(key);
			Reflect.defineMetadata(QREADONLY_FIELDS_KEY, existing, target);
		}
	};
}

/**
 * Collects all `@QReadonly`-decorated field names from the entire prototype
 * chain of `proto`, merging parent and child declarations.
 *
 * @param proto - Starting prototype (usually `instance.constructor.prototype`).
 * @returns Deduplicated array of readonly field names.
 * @internal
 */
export function collectReadonlyFields(proto: object): string[] {
	const fields: string[] = [];
	const seen = new Set<string>();
	let cur: object | null = proto;
	while (cur !== null && cur !== Object.prototype) {
		const own =
			(Reflect.getOwnMetadata(QREADONLY_FIELDS_KEY, cur) as
				| string[]
				| undefined) ?? [];
		for (const fld of own) {
			if (!seen.has(fld)) {
				seen.add(fld);
				fields.push(fld);
			}
		}
		cur = Object.getPrototypeOf(cur) as object | null;
	}
	return fields;
}

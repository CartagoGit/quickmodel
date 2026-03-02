import 'reflect-metadata';

/**
 * Metadata key storing the default value descriptor for a `@QDefault`-decorated field.
 *
 * The descriptor is `{ factory: () => T }` when a factory was provided,
 * or `{ value: T }` when a static value was provided.
 *
 * @see {@link QDefault} — decorator that writes this metadata
 * @see {@link QModel.initialize} — reads this metadata to apply defaults
 * @internal
 */
export const QDEFAULT_VALUE_KEY = '__qDefault_value__';

/**
 * Metadata key for the ordered list of property names decorated with `@QDefault`.
 *
 * Stored on the class prototype as a `string[]`. Read once during construction and
 * cached via the class-init cache in `QModel.initialize()`.
 *
 * @see {@link QDefault} — decorator that appends field names to this list
 * @see {@link QModel.initialize} — reads this list to apply defaults
 * @internal
 */
export const QDEFAULT_FIELDS_KEY = '__qDefault_fields__';

/**
 * Internal descriptor stored in metadata for each `@QDefault`-decorated field.
 * @internal
 */
export type IQDefaultDescriptor<T> = { factory: () => T } | { value: T };

/**
 * Declares a default value for a model field.
 *
 * The default is applied during construction **only when** the incoming value for
 * the field is `undefined` or `null`. It does **not** replace `false`, `0`, or `''`.
 *
 * Pass a **factory function** (`() => value`) when the default must be a fresh
 * instance per construction (arrays, objects, `Date`, etc.). Pass a **static value**
 * for primitives (`string`, `number`, `boolean`) that are safely shared.
 *
 * @param valueOrFactory - Static default value, or a zero-argument factory that
 *   produces the default value on each construction.
 *
 * @example Static primitive default
 * ```typescript
 * @Quick()
 * class OrderModel extends QModel<IOrder> {
 *   declare id: string;
 *
 *   @QDefault('pending')
 *   declare status: string;
 *
 *   @QDefault(0)
 *   declare retries: number;
 * }
 *
 * new OrderModel({ id: 'o1' }).status; // → 'pending'
 * new OrderModel({ id: 'o1', status: 'shipped' }).status; // → 'shipped'
 * ```
 *
 * @example Factory for reference types (array, Date, object)
 * ```typescript
 * @Quick({ createdAt: Date })
 * class EventModel extends QModel<IEvent> {
 *   @QDefault(() => [])
 *   declare tags: string[];
 *
 *   @QDefault(() => new Date())
 *   declare createdAt: Date;
 * }
 * // Each instance gets its own fresh array and Date — no shared state.
 * ```
 *
 * @see {@link QModel.$qCopy} — defaults are preserved through $qCopy() when not overridden
 */
export function QDefault<T>(valueOrFactory: T | (() => T)): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		const key = String(propertyKey);

		const descriptor: IQDefaultDescriptor<T> =
			typeof valueOrFactory === 'function'
				? { factory: valueOrFactory as () => T }
				: { value: valueOrFactory };

		Reflect.defineMetadata(QDEFAULT_VALUE_KEY, descriptor, target, key);

		const existing: string[] =
			(Reflect.getOwnMetadata(QDEFAULT_FIELDS_KEY, target) as
				| string[]
				| undefined) ?? [];
		if (!existing.includes(key)) {
			existing.push(key);
			Reflect.defineMetadata(QDEFAULT_FIELDS_KEY, existing, target);
		}
	};
}

import 'reflect-metadata';

/**
 * Metadata key for the ordered list of property names decorated with `@QTransform`.
 *
 * Stored on the class prototype as a `string[]`.
 *
 * @see {@link QTransform} — decorator that appends field names to this list
 * @see {@link QModel.initialize} — reads this list to apply transforms post-deserialization
 * @internal
 */
export const QTRANSFORM_FIELDS_KEY = '__qTransform_fields__';

/**
 * Metadata key for the ordered pipeline of transform functions on a specific field.
 *
 * Stored per `(prototype, fieldName)` as an array of functions. The array is ordered
 * from first-registered (bottom decorator in source) to last-registered (top decorator).
 *
 * @see {@link QTransform} — decorator that prepends functions to this list
 * @see {@link QModel.initialize} — reads and applies the pipeline
 * @internal
 */
export const QTRANSFORM_PIPELINE_KEY = '__qTransform_pipeline__';

/**
 * A transform function applied to a field value during model construction.
 *
 * Receives the current value (which may be the raw deserialized value or the
 * output of the previous transform in the chain) and returns the transformed value.
 *
 * @template T - Type of the field value.
 */
export type IQTransformFn<T = unknown> = (value: T) => T;

/**
 * Applies a post-deserialization transformation to a field value.
 *
 * The transform runs **after** type coercion (e.g. after a string is coerced
 * to `Date` via `@Quick({ field: Date })`), so the received value is already
 * the coerced type. Multiple `@QTransform` decorators can be stacked on the
 * same field — they execute from the **bottommost** decorator upwards, forming
 * a pipeline: `rawValue → fn1 → fn2 → fn3 → finalValue`.
 *
 * @param func - A pure function from the current field value to the transformed value.
 *
 * @example Single transform
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   @QTransform((val: string) => val.trim().toLowerCase())
 *   declare email: string;
 * }
 * new User({ email: '  Alice@Example.COM  ' }).email; // → 'alice@example.com'
 * ```
 *
 * @example Composing multiple transforms (order: trim → toLowerCase → replace)
 * ```typescript
 * @Quick()
 * class Product extends QModel<IProduct> {
 *   @QTransform((val: string) => val.replace(/\s+/g, '-'))
 *   @QTransform((val: string) => val.toLowerCase())
 *   @QTransform((val: string) => val.trim())   // ← executes first
 *   declare slug: string;
 * }
 * new Product({ slug: '  Hello World  ' }).slug; // → 'hello-world'
 * ```
 *
 * @see {@link IQTransformFn}
 */
export function QTransform<T>(func: IQTransformFn<T>): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		const key = String(propertyKey);

		// Build/extend the pipeline for this field.
		// Decorators run bottom-to-top, so push preserves bottom-first order.
		const existing: IQTransformFn<unknown>[] =
			(Reflect.getOwnMetadata(QTRANSFORM_PIPELINE_KEY, target, key) as
				| IQTransformFn<unknown>[]
				| undefined) ?? [];
		existing.push(func as IQTransformFn<unknown>);
		Reflect.defineMetadata(QTRANSFORM_PIPELINE_KEY, existing, target, key);

		// Register field name in the class-level list (avoid duplicates)
		const fields: string[] =
			(Reflect.getOwnMetadata(QTRANSFORM_FIELDS_KEY, target) as
				| string[]
				| undefined) ?? [];
		if (!fields.includes(key)) {
			fields.push(key);
			Reflect.defineMetadata(QTRANSFORM_FIELDS_KEY, fields, target);
		}
	};
}

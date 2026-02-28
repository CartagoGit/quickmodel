/**
 * @QField — decorator for defining form field metadata on model properties.
 *
 * Used together with `getFormSchema()` to generate form schema arrays
 * for Angular, React, or any other form library.
 *
 * @example
 * ```typescript
 * @Quick({ birthDate: Date })
 * class ProfileModel extends QModel<IProfile> {
 *   @QField({ widget: 'input', inputType: 'email', label: 'Email', required: true })
 *   declare email: string;
 *
 *   @QField({ widget: 'select', label: 'Role', options: ['admin', 'user'] })
 *   declare role: string;
 *
 *   @QField({ widget: 'datepicker', label: 'Birth date' })
 *   declare birthDate: Date;
 * }
 *
 * const schema = ProfileModel.getFormSchema();
 * // [{ field: 'email', widget: 'input', ... }, { field: 'role', widget: 'select', ... }, ...]
 * ```
 */
import 'reflect-metadata';

/** Metadata key for field-level form metadata. */
export const QFIELD_METADATA_KEY = Symbol('qfield:meta');

/** Metadata key for tracking all fields decorated with @QField on a class. */
export const QFIELD_FIELDS_KEY = Symbol('qfield:fields');

/**
 * Supported widget types for `@QField`.
 * Use `string & {}` to also allow custom widget names beyond this list.
 */
export type IQFieldWidget =
	| 'input'
	| 'textarea'
	| 'select'
	| 'checkbox'
	| 'radio'
	| 'datepicker'
	| 'number'
	| 'switch'
	| (string & {});

/**
 * Metadata stored per field via `@QField`.
 * Extend it with any extra key — all properties are accessible in `getFormSchema()`.
 */
export interface IQFieldMeta {
	/** Widget type used to render this field. */
	widget: IQFieldWidget;
	/** Human-readable label for the field. */
	label?: string;
	/** Placeholder text (for input/textarea). */
	placeholder?: string;
	/** Whether the field is required. */
	required?: boolean;
	/** Input type for `widget: 'input'` (e.g. 'text', 'email', 'password'). */
	inputType?: string;
	/** Options for `widget: 'select'` or `widget: 'radio'`. */
	options?: string[] | Array<{ value: unknown; label: string }>;
	/** Extra metadata — any additional properties are preserved as-is. */
	[key: string]: unknown;
}

/**
 * A single entry in the form schema returned by `getFormSchema()`.
 * Combines `IQFieldMeta` with the resolved field name.
 */
export interface IQFormSchemaEntry extends IQFieldMeta {
	/** The property name this entry corresponds to. */
	field: string;
}

/**
 * Decorates a model property with form field metadata for dynamic form generation.
 *
 * Use `QModel.getFormSchema()` to retrieve the full ordered schema array, or
 * `QModel.getFormSchemaGrouped()` to group fields by `@QGroup` sections.
 *
 * @param meta - Form field metadata for this property (widget type, label, options, etc.)
 * @returns A TypeScript property decorator.
 *
 * @see {@link QModel.getFormSchema} — retrieve the flat schema array
 * @see {@link QModel.getFormSchemaGrouped} — retrieve schema organized by `@QGroup` sections
 * @see {@link QGroup} — assign this field to a named form section
 * @see {@link IQFieldMeta} for the full metadata shape
 */
export function QField(meta: IQFieldMeta): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		const key = String(propertyKey);

		// Store the metadata for this specific field
		Reflect.defineMetadata(QFIELD_METADATA_KEY, meta, target, key);

		// Maintain ordered list of fields decorated with @QField
		const existing: string[] =
			Reflect.getMetadata(QFIELD_FIELDS_KEY, target) ?? [];
		if (!existing.includes(key)) {
			Reflect.defineMetadata(
				QFIELD_FIELDS_KEY,
				[...existing, key],
				target
			);
		}
	};
}

import 'reflect-metadata';
import type { IQFormSchemaEntry } from '@/core/decorators/qfield.decorator';

/**
 * Metadata key for storing the group name per-property.
 * @internal
 * @see {@link QGroup} — decorator that writes this key
 * @see {@link QGROUP_METADATA_KEY} — used by `getFormSchemaGrouped()` to read group assignments
 */
export const QGROUP_METADATA_KEY = '__qgroup__';

/**
 * A group entry returned by `getFormSchemaGrouped()`.
 * @see {@link QModel.getFormSchemaGrouped} — returns an array of these entries
 * @see {@link IQFormSchemaEntry} — the individual field entry shape within `fields`
 */
export interface IQFormSchemaGroup {
	/** Group name as passed to `@QGroup`. `undefined` for fields without a group. */
	group: string | undefined;
	/** Ordered list of schema entries belonging to this group. */
	fields: IQFormSchemaEntry[];
}

/**
 * Assigns a form section/group to a model property decorated with `@QField`.
 *
 * Use together with `@QField`. The group name appears as the `group` property
 * in each `IQFormSchemaEntry` and is used by `getFormSchemaGrouped()` to organize
 * entries into sections.
 *
 * @param groupName - Label for the form section (e.g. `'Personal Info'`).
 *
 * @see {@link QModel.getFormSchemaGrouped} — retrieve form schema organized by group
 * @see {@link QRule} — add validation rules that can also be filtered by group
 * @see {@link QField} — decorate a property with form metadata before grouping it
 * @see {@link qCheckRulesByGroup} — validate only rules belonging to a specific group
 * @see {@link IQFormSchemaGroup} — the shape of each group entry returned by `getFormSchemaGrouped()`
 *
 * @example
 * ```typescript
 * @Quick()
 * class ContactModel extends QModel<IContact> {
 *   @QField({ widget: 'input', label: 'First name' })
 *   @QGroup('Personal Info')
 *   declare firstName: string;
 *
 *   @QField({ widget: 'input', label: 'Street' })
 *   @QGroup('Address')
 *   declare street: string;
 *
 *   @QField({ widget: 'textarea', label: 'Bio' }) // no group
 *   declare bio: string;
 * }
 *
 * ContactModel.getFormSchemaGrouped();
 * // [
 * //   { group: 'Personal Info', fields: [{ field: 'firstName', ... }] },
 * //   { group: 'Address',       fields: [{ field: 'street', ... }] },
 * //   { group: undefined,       fields: [{ field: 'bio', ... }] },
 * // ]
 * ```
 */
export function QGroup(groupName: string): PropertyDecorator {
	return (target, propertyKey) => {
		Reflect.defineMetadata(
			QGROUP_METADATA_KEY,
			groupName,
			target,
			String(propertyKey)
		);
	};
}

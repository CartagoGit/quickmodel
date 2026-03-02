/**
 * @fileoverview `$qGetGroups` — reads the distinct `@QGroup` names declared
 * on the properties of any class instance decorated with `@QRule` / `@QGroup`.
 *
 * Works on **any class** — no need to extend `QModel`.
 *
 * @see {@link $qCheckRules} to run validation rules optionally filtered by group.
 * @see {@link $qCheckRulesByGroup} to get per-group `IQRulesResult` maps.
 * @module
 */

import 'reflect-metadata';
import { QRULE_FIELDS_KEY } from '@/core/decorators/qrule.decorator';
import { QGROUP_METADATA_KEY } from '@/core/decorators/qgroup.decorator';

/**
 * Returns the distinct `@QGroup` group names declared on the `@QRule`-decorated
 * properties of `instance`.
 *
 * Only fields that have **both** a `@QRule` and a `@QGroup` annotation contribute
 * to the result. Fields with `@QRule` but without `@QGroup` are excluded.
 *
 * The returned array preserves first-seen order (the order in which decorated
 * properties were registered) and contains no duplicates.
 *
 * @param instance - Any class instance decorated with `@QGroup` / `@QRule`.
 *                   Does not need to extend `QModel`.
 * @returns Sorted array of distinct group names. Empty array when no `@QGroup`
 *          annotations are present.
 * @see {@link $qCheckRulesByGroup} — validate rules group by group using the names returned here
 * @see {@link QGroup} — property decorator that registers a group name
 * @see {@link $qCheckRules} — run all validation rules without grouping
 *
 * @example
 * ```ts
 * const Groups = $qGroups('identity', 'security');
 *
 * class ProfileForm {
 *   @QRule((v: string) => v.length >= 2, 'Too short')
 *   @QGroup(Groups.identity)
 *   name = '';
 *
 *   @QRule((v: string) => v.length >= 8, 'Too short')
 *   @QGroup(Groups.security)
 *   password = '';
 *
 *   // ungrouped
 *   @QRule((v: string) => v.length > 0, 'Required')
 *   street = '';
 * }
 *
 * const form = new ProfileForm();
 * $qGetGroups(form); // ['identity', 'security']
 * ```
 */
export function $qGetGroups(instance: object): string[] {
	const proto = Object.getPrototypeOf(instance) as object;
	const fields: string[] = Reflect.getMetadata(QRULE_FIELDS_KEY, proto) ?? [];

	const seen = new Set<string>();
	const groups: string[] = [];

	for (const field of fields) {
		const group: string | undefined = Reflect.getMetadata(
			QGROUP_METADATA_KEY,
			proto,
			field
		);
		if (group !== undefined && !seen.has(group)) {
			seen.add(group);
			groups.push(group);
		}
	}

	return groups;
}

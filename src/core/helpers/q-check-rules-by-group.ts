/**
 * @fileoverview `qCheckRulesByGroup` — runs `@QRule` predicates grouped by
 * `@QGroup` name and returns a map of `IQRulesResult` per group.
 *
 * Only fields that carry **both** `@QRule` and `@QGroup` annotations are
 * included. Ungrouped fields (those with `@QRule` but without `@QGroup`) are
 * excluded from the map — use {@link qCheckRules} without a group filter to
 * evaluate all fields including ungrouped ones.
 *
 * @see {@link qGetGroups} to list available group names.
 * @see {@link qCheckRules} for filtering by a specific group.
 * @see {@link qCheckRulesByGroupAsync} for the async version.
 * @module
 */

import { qGetGroups } from './q-get-groups';
import { qCheckRules } from './q-check-rules';
import type { IQRulesResult } from '@/core/decorators/qrule.decorator';

/**
 * Runs `@QRule` predicates for each `@QGroup` declared on `instance` and
 * returns a `Record<groupName, IQRulesResult>`.
 *
 * Each entry in the returned record is equivalent to calling
 * `qCheckRules(instance, { group: groupName })` for that group.
 * Fields without a `@QGroup` annotation are **not** included in any entry.
 *
 * @param instance - Any class instance decorated with `@QRule` and `@QGroup`.
 *                   Does not need to extend `QModel`.
 * @returns A record mapping each group name to its `IQRulesResult`. Returns an
 *          empty object when no `@QGroup` annotations are present.
 *
 * @example
 * ```ts
 * import { QRule, QGroup } from 'quickmodel';
 * import { qGroups, qCheckRulesByGroup } from 'quickmodel/forms';
 *
 * const Groups = qGroups('identity', 'security');
 *
 * class ProfileForm {
 *   @QRule((v: string) => v.length >= 2, 'Too short')
 *   @QGroup(Groups.identity)
 *   name = '';
 *
 *   @QRule((v: string) => v.length >= 8, 'Too short')
 *   @QGroup(Groups.security)
 *   password = '';
 * }
 *
 * const form = new ProfileForm();
 * form.name = 'A';
 * form.password = 'Secret1!';
 *
 * const results = qCheckRulesByGroup(form);
 * // {
 * //   identity: { valid: false, errors: [{ field: 'name', ... }] },
 * //   security: { valid: true,  errors: [] },
 * // }
 *
 * // Use with qGroups for full autocomplete:
 * results[Groups.identity].valid; // false
 * results[Groups.security].valid; // true
 * ```
 */
export function qCheckRulesByGroup(
	instance: object
): Record<string, IQRulesResult> {
	const groups = qGetGroups(instance);
	const result: Record<string, IQRulesResult> = {};

	for (const group of groups) {
		result[group] = qCheckRules(instance, { group });
	}

	return result;
}

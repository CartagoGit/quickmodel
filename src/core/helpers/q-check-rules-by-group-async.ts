/**
 * @fileoverview `qCheckRulesByGroupAsync` — async counterpart of
 * {@link qCheckRulesByGroup}. Runs `@QRule` predicates (sync and async)
 * for each `@QGroup` declared on `instance` and returns a
 * `Promise<Record<groupName, IQRulesResult>>`.
 *
 * Only fields that carry **both** `@QRule` and `@QGroup` annotations are
 * included. Ungrouped fields (those with `@QRule` but without `@QGroup`) are
 * excluded from the map — use {@link qCheckRulesAsync} without a group filter
 * to evaluate all fields including ungrouped ones.
 *
 * @see {@link qCheckRulesByGroup} for the synchronous version.
 * @see {@link qGetGroups} to list available group names.
 * @see {@link qCheckRulesAsync} for filtering by a specific group with async support.
 * @module
 */

import { qGetGroups } from './q-get-groups';
import { qCheckRulesAsync } from './q-check-rules-async';
import type {
	IQRulesResult,
	IQRulesAsyncOptions,
} from '@/core/decorators/qrule.decorator';

/**
 * Runs `@QRule` predicates (sync and async) for each `@QGroup` declared on
 * `instance` and returns a `Promise<Record<groupName, IQRulesResult>>`.
 *
 * Each entry in the returned record is equivalent to calling
 * `qCheckRulesAsync(instance, { ...options, group: groupName })` for that group.
 * All groups are evaluated concurrently by default (same as `mode: 'parallel'`).
 * Fields without a `@QGroup` annotation are **not** included in any entry.
 *
 * @param instance - Any class instance decorated with `@QRule` and `@QGroup`.
 *                   Does not need to extend `QModel`.
 * @param options  - Optional async execution options (`timeoutMs`, `mode`,
 *                   `timeoutMessage`). The `group` field is not forwarded here
 *                   (each group is evaluated independently).
 * @returns `Promise<Record<string, IQRulesResult>>` — resolves to an empty
 *          object when no `@QGroup` annotations are present.
 * @see {@link qCheckRulesByGroup} — synchronous version
 * @see {@link qCheckRulesAsync} — evaluate a specific group or all rules asynchronously
 * @see {@link qGetGroups} — introspect group names on an instance
 *
 * @example
 * ```ts
 * import { QRule, QGroup } from 'quickmodel';
 * import { qGroups, qCheckRulesByGroupAsync } from 'quickmodel/forms';
 *
 * const Groups = qGroups('identity', 'security');
 *
 * class ProfileForm {
 *   @QRule(async (val: string) => checkNameAvailability(val), 'Name taken')
 *   @QGroup(Groups.identity)
 *   name = '';
 *
 *   @QRule(async (val: string) => checkPasswordStrength(val), 'Too weak')
 *   @QGroup(Groups.security)
 *   password = '';
 * }
 *
 * const form = new ProfileForm();
 * form.name = 'alice';
 * form.password = 'Secret1!';
 *
 * const results = await qCheckRulesByGroupAsync(form, { timeoutMs: 500 });
 * // {
 * //   identity: { valid: true,  errors: [] },
 * //   security: { valid: true,  errors: [] },
 * // }
 *
 * results[Groups.identity].valid; // true
 * results[Groups.security].valid; // true
 * ```
 *
 * @see {@link qCheckRulesByGroup} — synchronous variant of this function
 * @see {@link qCheckRulesAsync} — async check without group segmentation
 */
export async function qCheckRulesByGroupAsync(
	instance: object,
	options?: Omit<IQRulesAsyncOptions, 'mode'> & {
		mode?: IQRulesAsyncOptions['mode'];
	}
): Promise<Record<string, IQRulesResult>> {
	const groups = qGetGroups(instance);
	const result: Record<string, IQRulesResult> = {};

	await Promise.all(
		groups.map(async (grp) => {
			result[grp] = await qCheckRulesAsync(instance, {
				...options,
				group: grp,
			});
		})
	);

	return result;
}

/**
 * @fileoverview `$qCheckRules` — standalone validation function that evaluates
 * `@QRule` predicates on any class instance, with optional filtering by `@QGroup`.
 *
 * Works on **any class** — no need to extend `QModel`. This function mirrors
 * the synchronous `QModel.$qCheckRules()` method but is decoupled from the
 * model inheritance hierarchy, making it suitable for use in Angular components,
 * React hooks, Vue composables, or any plain class.
 *
 * @see {@link $qGetGroups} to list available group names on an instance.
 * @see {@link $qCheckRulesByGroup} for a per-group result map.
 * @see {@link $qCheckRulesAsync} for the async version (runs async predicates).
 * @module
 */

import 'reflect-metadata';
import {
	QRULE_FIELDS_KEY,
	QRULE_METADATA_KEY,
	type IQRule,
	type IQRulesResult,
} from '@/core/decorators/qrule.decorator';
import { QGROUP_METADATA_KEY } from '@/core/decorators/qgroup.decorator';
import { Logger } from '@/core/helpers/logger.helper';
import { TraceLogger } from '@/core/helpers/trace-logger.helper';
import { QConfig } from '@/core/config/quick.config';

/**
 * Tracks class#field pairs already warned about async predicates.
 * Avoids flooding the console when $qCheckRules() is called repeatedly.
 * @internal
 * @see {@link $qCheckRules} — the function that uses this set to suppress duplicates
 */
const _asyncWarnedKeys = new Set<string>();

/**
 * Options accepted by {@link $qCheckRules}.
 * @see {@link $qCheckRules} — function that accepts these options
 * @see {@link $qCheckRulesByGroup} — returns a per-group map instead
 */
export interface IQCheckRulesOptions {
	/**
	 * When provided, only properties decorated with `@QGroup(group)` are
	 * evaluated. Properties without `@QGroup` or belonging to a different
	 * group are skipped.
	 *
	 * When omitted, **all** properties decorated with `@QRule` are evaluated
	 * regardless of their group assignment.
	 */
	group?: string;
}

/**
 * Evaluates the synchronous `@QRule` predicates on `instance`.
 *
 * - Without `options.group` — validates **all** `@QRule`-decorated fields.
 * - With `options.group` — validates only fields that also carry
 *   `@QGroup(options.group)`.
 *
 * Async predicates (those that return a `Promise`) are **silently skipped**
 * on the synchronous path — they are treated as passing. Evaluate them with a
 * dedicated async helper when needed.
 *
 * @param instance - Any class instance decorated with `@QRule` (and optionally
 *                   `@QGroup`). Does not need to extend `QModel`.
 * @param options  - Optional filtering options.
 * @returns `IQRulesResult` with `valid` flag and `errors` array.
 * @see {@link $qCheckRulesAsync} — async version for predicates that return `Promise`
 * @see {@link $qCheckRulesByGroup} — returns a map per group instead of flattened
 * @see {@link $qGetGroups} — list group names available on an instance
 *
 * @example
 * ```ts
 * import { $qGroups, $qCheckRules } from 'quickmodel/forms';
 *
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
 * }
 *
 * const form = new ProfileForm();
 * form.name = 'A';
 * form.password = 'Secret1!';
 *
 * $qCheckRules(form);
 * // { valid: false, errors: [{ field: 'name', message: 'Too short', value: 'A' }] }
 *
 * $qCheckRules(form, { group: Groups.security });
 * // { valid: true, errors: [] }
 * ```
 */
export function $qCheckRules(
	instance: object,
	options?: IQCheckRulesOptions
): IQRulesResult {
	const proto = Object.getPrototypeOf(instance) as object;
	const className =
		(proto as { constructor?: { name?: string } }).constructor?.name ??
		'Unknown';
	const modelCtor = (proto as { constructor?: Function }).constructor;
	const fields: string[] = Reflect.getMetadata(QRULE_FIELDS_KEY, proto) ?? [];

	const errors: IQRulesResult['errors'] = [];

	for (const field of fields) {
		// Group filter: skip fields that do not belong to the requested group
		if (options?.group !== undefined) {
			const fieldGroup: string | undefined = Reflect.getMetadata(
				QGROUP_METADATA_KEY,
				proto,
				field
			);
			if (fieldGroup !== options.group) continue;
		}

		const rules: IQRule<unknown>[] =
			Reflect.getMetadata(QRULE_METADATA_KEY, proto, field) ?? [];
		const value = (instance as Record<string, unknown>)[field];

		for (const rule of rules) {
			let passes = false;
			let thrownErr: unknown = undefined;
			try {
				const result = rule.predicate(value);
				if (result instanceof Promise) {
					// Async predicates are skipped on the synchronous path — warn once per class#field.
					const warnKey = `${className}#${field}`;
					if (!_asyncWarnedKeys.has(warnKey)) {
						_asyncWarnedKeys.add(warnKey);
						Logger.warn(
							`$qCheckRules() skipped an async predicate on "${warnKey}". ` +
								`Async rules are never evaluated by the synchronous path. ` +
								`Use $qCheckRulesAsync() to evaluate them.`
						);
					}
					passes = true;
				} else {
					passes = result;
				}
			} catch (err) {
				thrownErr = err;
				passes = false;
			}

			const ruleMessage =
				typeof rule.message === 'function'
					? rule.message()
					: rule.message;

			if (thrownErr !== undefined) {
				TraceLogger.traceRule({
					event: 'rule-error',
					modelName: className,
					modelCtor,
					field,
					ruleMessage,
					value,
					err: thrownErr,
					ruleTrace: rule.options?.trace,
				});
				errors.push({
					field,
					message:
						QConfig.get().i18n?.resolver?.(ruleMessage) ??
						ruleMessage,
					value,
				});
			} else if (!passes) {
				TraceLogger.traceRule({
					event: 'rule-fail',
					modelName: className,
					modelCtor,
					field,
					ruleMessage,
					value,
					ruleTrace: rule.options?.trace,
				});
				errors.push({
					field,
					message:
						QConfig.get().i18n?.resolver?.(ruleMessage) ??
						ruleMessage,
					value,
				});
			} else {
				TraceLogger.traceRule({
					event: 'rule-pass',
					modelName: className,
					modelCtor,
					field,
					ruleMessage,
					value,
					ruleTrace: rule.options?.trace,
				});
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Clears the internal set of already-warned async-predicate keys.
 *
 * **For testing only.** Call this in `beforeEach` / `afterEach` to ensure
 * warning assertions are not affected by previous test runs.
 *
 * @internal
 * @see {@link $qCheckRules} — function that reads `_asyncWarnedKeys` for deduplication
 * @see {@link _asyncWarnedKeys} — the WeakSet-backed Set this function clears
 */
export function _resetAsyncWarnedKeys(): void {
	_asyncWarnedKeys.clear();
}

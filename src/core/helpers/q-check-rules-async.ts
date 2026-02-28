/**
 * @fileoverview `qCheckRulesAsync` — standalone async validation function that
 * evaluates `@QRule` predicates (sync and async) on any class instance, with
 * optional filtering by `@QGroup` and support for timeouts and execution modes.
 *
 * Works on **any class** — no need to extend `QModel`. This is the async
 * counterpart of {@link qCheckRules} and the standalone equivalent of
 * `QModel.checkRulesAsync()`.
 *
 * The `QModel.checkRulesAsync()` method delegates to this helper internally.
 *
 * @see {@link qCheckRules} for the synchronous version.
 * @see {@link qGetGroups} to list available group names on an instance.
 * @see {@link qCheckRulesByGroup} for a per-group result map (sync).
 * @module
 */

import 'reflect-metadata';
import {
	QRULE_FIELDS_KEY,
	QRULE_METADATA_KEY,
	type IQRule,
	type IQRulesResult,
	type IQRulesAsyncOptions,
} from '@/core/decorators/qrule.decorator';
import { QGROUP_METADATA_KEY } from '@/core/decorators/qgroup.decorator';
import { TraceLogger } from '@/core/helpers/trace-logger.helper';

/**
 * Options for {@link qCheckRulesAsync}. Extends {@link IQRulesAsyncOptions}
 * with an optional group filter.
 * @see {@link qCheckRulesAsync} — function that consumes these options
 * @see {@link IQCheckRulesOptions} — synchronous counterpart options
 */
export interface IQCheckRulesAsyncOptions extends IQRulesAsyncOptions {
	/**
	 * When provided, only properties decorated with `@QGroup(group)` are
	 * evaluated. Properties without `@QGroup` or belonging to a different
	 * group are skipped.
	 *
	 * When omitted, **all** `@QRule`-decorated fields are evaluated.
	 */
	group?: string;
}

/**
 * Evaluates all `@QRule` predicates (sync and async) on `instance`.
 *
 * - Without `options.group` — validates **all** `@QRule`-decorated fields.
 * - With `options.group` — validates only fields that also carry
 *   `@QGroup(options.group)`.
 * - With `options.timeoutMs` — each predicate is individually raced against a
 *   timer. Slow predicates fail with `timedOut: true`.
 * - With `options.mode: 'serial'` — predicates run sequentially.
 *   Default is `'parallel'` (all start simultaneously).
 *
 * @param instance - Any class instance decorated with `@QRule` (and optionally
 *                   `@QGroup`). Does not need to extend `QModel`.
 * @param options  - Optional async execution + filtering options.
 * @returns `Promise<IQRulesResult>`
 * @see {@link qCheckRules} — synchronous version
 * @see {@link qCheckRulesByGroupAsync} — returns a per-group map of async results
 * @see {@link qGetGroups} — list available group names on an instance
 *
 * @example
 * ```ts
 * import { QRule, QGroup } from 'quickmodel';
 * import { qGroups, qCheckRulesAsync } from 'quickmodel/forms';
 *
 * const Groups = qGroups('identity', 'security');
 *
 * class ProfileForm {
 *   @QRule(async (v: string) => checkNameAvailability(v), 'Name taken')
 *   @QGroup(Groups.identity)
 *   name = '';
 *
 *   @QRule(async (v: string) => checkPasswordStrength(v), 'Too weak')
 *   @QGroup(Groups.security)
 *   password = '';
 * }
 *
 * const form = new ProfileForm();
 * form.name = 'alice';
 * form.password = 'Secret1!';
 *
 * // All rules:
 * await qCheckRulesAsync(form);
 *
 * // Only identity group, with timeout:
 * await qCheckRulesAsync(form, { group: Groups.identity, timeoutMs: 500 });
 *
 * // Serial execution (predicates run one-by-one):
 * await qCheckRulesAsync(form, { mode: 'serial' });
 * ```
 *
 * @see {@link IQCheckRulesAsyncOptions} — options accepted by this function
 * @see {@link qCheckRules} — synchronous variant
 */
export async function qCheckRulesAsync(
	instance: object,
	options?: IQCheckRulesAsyncOptions
): Promise<IQRulesResult> {
	const proto = Object.getPrototypeOf(instance) as object;
	const className =
		(proto as { constructor?: { name?: string } }).constructor?.name ??
		'Unknown';
	const modelCtor = (proto as { constructor?: Function }).constructor;
	const fields: string[] = Reflect.getMetadata(QRULE_FIELDS_KEY, proto) ?? [];

	// Sentinel value that signals a timeout — unique per call to avoid cross-call collision
	const TIMED_OUT = Symbol('timed_out');

	type ITaskDescriptor = {
		field: string;
		value: unknown;
		message: string | (() => string);
		rule: IQRule<unknown>;
	};

	// Build the list of tasks, applying the group filter if requested
	const descriptors: ITaskDescriptor[] = [];

	for (const field of fields) {
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
			descriptors.push({ field, value, message: rule.message, rule });
		}
	}

	// ---------------------------------------------------------------------------
	// Helpers — shared between parallel and serial execution modes
	// ---------------------------------------------------------------------------

	/** Starts a single predicate, wrapping it with an optional per-predicate timeout. */
	const runPredicate = (
		descriptor: ITaskDescriptor
	): Promise<boolean | typeof TIMED_OUT> => {
		const predicatePromise: Promise<boolean> = Promise.resolve()
			.then(() => descriptor.rule.predicate(descriptor.value))
			.catch(() => false as boolean);

		return options?.timeoutMs !== undefined
			? Promise.race([
					predicatePromise,
					new Promise<typeof TIMED_OUT>((resolve) =>
						setTimeout(() => resolve(TIMED_OUT), options.timeoutMs)
					),
				])
			: predicatePromise;
	};

	/** Converts a settled outcome into an error entry (if it failed). */
	const collectError = (
		descriptor: ITaskDescriptor,
		result: boolean | typeof TIMED_OUT,
		errors: IQRulesResult['errors']
	): void => {
		const timedOut = result === TIMED_OUT;
		const passes = !timedOut && result === true;

		const rawMessage =
			typeof descriptor.message === 'function'
				? descriptor.message()
				: descriptor.message;
		const message = timedOut
			? typeof options?.timeoutMessage === 'function'
				? options.timeoutMessage()
				: (options?.timeoutMessage ?? rawMessage)
			: rawMessage;

		if (timedOut) {
			TraceLogger.traceRule({
				event: 'rule-timeout',
				modelName: className,
				modelCtor,
				field: descriptor.field,
				ruleMessage: rawMessage,
				value: descriptor.value,
				ruleTrace: descriptor.rule.options?.trace,
			});
		} else if (passes) {
			TraceLogger.traceRule({
				event: 'rule-pass',
				modelName: className,
				modelCtor,
				field: descriptor.field,
				ruleMessage: rawMessage,
				value: descriptor.value,
				ruleTrace: descriptor.rule.options?.trace,
			});
			return;
		} else {
			TraceLogger.traceRule({
				event: 'rule-fail',
				modelName: className,
				modelCtor,
				field: descriptor.field,
				ruleMessage: rawMessage,
				value: descriptor.value,
				ruleTrace: descriptor.rule.options?.trace,
			});
		}

		errors.push({
			field: descriptor.field,
			message,
			value: descriptor.value,
			...(timedOut ? { timedOut: true as const } : {}),
		});
	};

	// ---------------------------------------------------------------------------
	// Execution — parallel (default) or serial
	// ---------------------------------------------------------------------------

	const errors: IQRulesResult['errors'] = [];

	if (options?.mode === 'serial') {
		for (const descriptor of descriptors) {
			const result = await runPredicate(descriptor);
			collectError(descriptor, result, errors);
		}
	} else {
		// parallel (default)
		const results = await Promise.all(descriptors.map(runPredicate));
		for (let idx = 0; idx < descriptors.length; idx++) {
			collectError(descriptors[idx]!, results[idx]!, errors);
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * @fileoverview `$qCheckRulesAsync` — standalone async validation function that
 * evaluates `@QRule` predicates (sync and async) on any class instance, with
 * optional filtering by `@QGroup` / field name, and support for:
 *
 * - **Timeouts** (`timeoutMs` per predicate, `globalTimeoutMs` for the whole run)
 * - **Cancellation** via `AbortSignal`
 * - **Retry** on rejection / timeout (`retry`)
 * - **Result caching** (`@QRule(…, { cache })`)
 * - **In-flight deduplication** (`@QRule(…, { dedupe })`)
 *
 * Works on **any class** — no need to extend `QModel`. This is the async
 * counterpart of {@link $qCheckRules} and the standalone equivalent of
 * `instance.$qCheckRulesAsync()`.
 *
 * The `$qCheckRulesAsync()` instance method delegates to this helper internally.
 *
 * @see {@link $qCheckRules} for the synchronous version.
 * @see {@link $qGetGroups} to list available group names on an instance.
 * @see {@link $qCheckRulesByGroup} for a per-group result map (sync).
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
import { QConfig } from '@/core/config/quick.config';

// ─────────────────────────────────────────────────────────────────────────────
// Cache + dedupe state (module-level, keyed by rule object — GC-safe)
// ─────────────────────────────────────────────────────────────────────────────

/** @internal A single entry in the per-rule result cache. */
interface IRuleCacheEntry {
	/** The cached boolean result of the predicate. */
	result: boolean;
	/** Unix timestamp after which this entry is stale. `Infinity` = never expires. */
	expiresAt: number;
}

/**
 * Per-rule result cache. Key = serialized field value.
 * Only boolean results are cached; timeouts/rejections are excluded.
 * @internal
 */
const _ruleCache = new WeakMap<IQRule<unknown>, Map<string, IRuleCacheEntry>>();

/**
 * Per-rule in-flight deduplication map. Key = serialized field value.
 * Removed once the shared Promise settles.
 * @internal
 */
const _ruleInflight = new WeakMap<
	IQRule<unknown>,
	Map<string, Promise<boolean>>
>();

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Serialize a field value to a stable string key for cache/dedupe maps. */
function toCacheKey(value: unknown): string {
	try {
		return JSON.stringify(value) ?? 'null';
	} catch {
		return String(value);
	}
}

/** Resolve retry count + delay from the `retry` option. */
function resolveRetry(retryOpt: IQRulesAsyncOptions['retry']): {
	count: number;
	delayMs: number;
} {
	if (retryOpt === undefined) return { count: 0, delayMs: 0 };
	if (typeof retryOpt === 'number') return { count: retryOpt, delayMs: 0 };
	return { count: retryOpt.count, delayMs: retryOpt.delayMs ?? 0 };
}

/** Await `waitMs` milliseconds without blocking the event loop. */
function sleep(waitMs: number): Promise<void> {
	return new Promise<void>((res) => setTimeout(res, waitMs));
}

/**
 * Try to construct a `DOMException` with the given `message` and `name`.
 * Falls back to a plain `Error` if `DOMException` is unavailable (old envs).
 * @internal
 */
function makeDomError(message: string, errName: string): Error {
	try {
		return new DOMException(message, errName);
	} catch {
		const err = new Error(message);
		err.name = errName;
		return err;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Public interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for {@link $qCheckRulesAsync}. Extends {@link IQRulesAsyncOptions}
 * with optional group and field filters.
 * @see {@link $qCheckRulesAsync} — function that consumes these options
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
	/**
	 * When provided, only the rules attached to this specific field name are
	 * evaluated. Takes precedence over `group` when both are set.
	 *
	 * Useful for per-field validation in step-by-step forms where you want to
	 * re-validate a single input without re-running the entire model.
	 *
	 * @example
	 * ```typescript
	 * // Only validate the 'email' field:
	 * const result = await $qCheckRulesAsync(form, { field: 'email' });
	 * ```
	 */
	field?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates all `@QRule` predicates (sync and async) on `instance`.
 *
 * - Without `options.group` / `options.field` — validates **all** `@QRule`-decorated fields.
 * - With `options.group` — validates only fields that also carry `@QGroup(options.group)`.
 * - With `options.field` — validates only the rules attached to that specific property name.
 * - With `options.timeoutMs` — each predicate is individually raced against a timer.
 * - With `options.globalTimeoutMs` — the whole run is capped; rejects with `TimeoutError`.
 * - With `options.signal` — the run can be cancelled; rejects with `AbortError`.
 * - With `options.retry` — predicates that reject or time out are automatically retried.
 * - With `@QRule(…, { cache })` — boolean results are memoized by field value.
 * - With `@QRule(…, { dedupe })` — concurrent calls for the same value share one Promise.
 *
 * @param instance - Any class instance decorated with `@QRule` (and optionally `@QGroup`).
 * @param options  - Optional async execution + filtering options.
 * @returns `Promise<IQRulesResult>` — rejects with `DOMException` on abort / global timeout.
 * @see {@link $qCheckRules} — synchronous version
 * @see {@link $qCheckRulesByGroupAsync} — returns a per-group map of async results
 *
 * @example
 * ```ts
 * // All rules with 500 ms per-predicate timeout and 2 retries:
 * await $qCheckRulesAsync(form, { timeoutMs: 500, retry: 2 });
 *
 * // Cancel when the component unmounts:
 * await $qCheckRulesAsync(form, { signal: controller.signal });
 *
 * // Per-field validation (step-by-step form):
 * await $qCheckRulesAsync(form, { field: 'email' });
 * ```
 *
 * @see {@link IQCheckRulesAsyncOptions} — options accepted by this function
 * @see {@link $qCheckRules} — synchronous variant
 */
export async function $qCheckRulesAsync(
	instance: object,
	options?: IQCheckRulesAsyncOptions
): Promise<IQRulesResult> {
	const proto = Object.getPrototypeOf(instance) as object;
	const className =
		(proto as { constructor?: { name?: string } }).constructor?.name ??
		'Unknown';
	const modelCtor = (proto as { constructor?: Function }).constructor;

	// ── Abort / global-timeout setup ─────────────────────────────────────────
	// Merge the user-supplied signal with an optional global-timeout controller.
	// • signal abort   → DOMException('AbortError')
	// • globalTimeout  → DOMException('TimeoutError')

	const userSignal = options?.signal;
	let effectiveSignal: AbortSignal | undefined = userSignal;
	let globalTimerId: ReturnType<typeof setTimeout> | undefined;

	if (options?.globalTimeoutMs !== undefined) {
		const globalCtrl = new AbortController();
		const globalMs = options.globalTimeoutMs;
		globalTimerId = setTimeout(
			() =>
				globalCtrl.abort(
					makeDomError(
						'Global validation timeout exceeded',
						'TimeoutError'
					)
				),
			globalMs
		);
		if (userSignal) {
			userSignal.addEventListener(
				'abort',
				() => globalCtrl.abort(userSignal.reason),
				{ once: true }
			);
		}
		effectiveSignal = globalCtrl.signal;
	}

	/** Cleanup helper — must be called before every return/throw path. */
	const cleanup = (): void => {
		if (globalTimerId !== undefined) clearTimeout(globalTimerId);
	};

	/** Throw the appropriate DOMException for the active abort signal. */
	const throwAbort = (sig: AbortSignal): never => {
		cleanup();
		const reason: unknown = sig.reason;
		if (reason instanceof Error) throw reason;
		throw makeDomError('The operation was aborted.', 'AbortError');
	};

	// Early-exit if already aborted
	if (effectiveSignal?.aborted) throwAbort(effectiveSignal);

	// ── Build task descriptors ────────────────────────────────────────────────
	const fields: string[] = Reflect.getMetadata(QRULE_FIELDS_KEY, proto) ?? [];

	type ITaskDescriptor = {
		field: string;
		value: unknown;
		message: string | (() => string);
		rule: IQRule<unknown>;
	};

	const descriptors: ITaskDescriptor[] = [];

	for (const fld of fields) {
		// field filter takes priority over group filter
		if (options?.field !== undefined) {
			if (fld !== options.field) continue;
		} else if (options?.group !== undefined) {
			const fieldGroup: string | undefined = Reflect.getMetadata(
				QGROUP_METADATA_KEY,
				proto,
				fld
			);
			if (fieldGroup !== options.group) continue;
		}

		const rules: IQRule<unknown>[] =
			Reflect.getMetadata(QRULE_METADATA_KEY, proto, fld) ?? [];
		const value = (instance as Record<string, unknown>)[fld];

		for (const rule of rules) {
			descriptors.push({
				field: fld,
				value,
				message: rule.message,
				rule,
			});
		}
	}

	// ── Retry config ─────────────────────────────────────────────────────────
	const retryConfig = resolveRetry(options?.retry);

	// ── Sentinels ─────────────────────────────────────────────────────────────
	// Unique per-call to prevent cross-call Symbol collisions
	const TIMED_OUT = Symbol('timed_out');
	const REJECTED = Symbol('rejected');
	type IRunResult = boolean | typeof TIMED_OUT | typeof REJECTED;

	// ── Per-descriptor runner ─────────────────────────────────────────────────

	/**
	 * Run a single predicate with retry, timeout, cache, and dedupe support.
	 * Returns the boolean result or the TIMED_OUT sentinel.
	 */
	const runPredicate = async (
		descriptor: ITaskDescriptor
	): Promise<boolean | typeof TIMED_OUT> => {
		const { rule, value } = descriptor;
		const cacheKey = toCacheKey(value);

		// ── 1. Cache hit ──────────────────────────────────────────────────────
		const cacheOpt = rule.options?.cache;
		if (cacheOpt) {
			let cacheMap = _ruleCache.get(rule);
			if (!cacheMap) {
				cacheMap = new Map<string, IRuleCacheEntry>();
				_ruleCache.set(rule, cacheMap);
			}
			const entry = cacheMap.get(cacheKey);
			if (entry !== undefined && Date.now() < entry.expiresAt) {
				return entry.result;
			}
		}

		// ── 2. In-flight dedupe ───────────────────────────────────────────────
		if (rule.options?.dedupe) {
			let inflightMap = _ruleInflight.get(rule);
			if (!inflightMap) {
				inflightMap = new Map<string, Promise<boolean>>();
				_ruleInflight.set(rule, inflightMap);
			}
			const existing = inflightMap.get(cacheKey);
			if (existing !== undefined) {
				// Join the in-flight promise — may still timeout/fail, but shares the request
				return existing;
			}
		}

		// ── 3. Execute with retry loop ────────────────────────────────────────

		/** Execute the predicate once, racing against per-predicate timeout. */
		const executeOnce = (): Promise<IRunResult> => {
			if (effectiveSignal?.aborted) return Promise.resolve(REJECTED);

			const predicateP: Promise<IRunResult> = Promise.resolve()
				.then(() => rule.predicate(value))
				.catch((): typeof REJECTED => REJECTED);

			if (options?.timeoutMs === undefined) return predicateP;

			return Promise.race([
				predicateP,
				new Promise<typeof TIMED_OUT>((res) =>
					setTimeout(() => res(TIMED_OUT), options.timeoutMs)
				),
			]);
		};

		/** The core retry loop — returns boolean or TIMED_OUT after all attempts. */
		const runWithRetryLoop = async (): Promise<
			boolean | typeof TIMED_OUT
		> => {
			let result: IRunResult = REJECTED;
			const totalAttempts = retryConfig.count + 1;

			for (let attempt = 0; attempt < totalAttempts; attempt++) {
				// Check abort before each attempt
				if (effectiveSignal?.aborted) throwAbort(effectiveSignal);

				result = await executeOnce();

				// Definitive result — no retry needed
				if (result !== TIMED_OUT && result !== REJECTED) {
					return result;
				}

				const isLastAttempt = attempt === totalAttempts - 1;
				if (!isLastAttempt && retryConfig.delayMs > 0) {
					// Wait between retries — but honour the abort signal during the sleep
					if (effectiveSignal) {
						await Promise.race([
							sleep(retryConfig.delayMs),
							new Promise<never>((_, rej) =>
								effectiveSignal.addEventListener(
									'abort',
									() => {
										const sigReason =
											effectiveSignal.reason;
										rej(
											sigReason instanceof Error
												? sigReason
												: makeDomError(
														'Aborted during retry delay',
														'AbortError'
													)
										);
									},
									{ once: true }
								)
							),
						]);
					} else {
						await sleep(retryConfig.delayMs);
					}
				}
			}

			// REJECTED after all retries → treat as false (failed, not timed-out)
			return result === REJECTED ? false : result;
		};

		// ── 4. Register dedupe inflight promise ───────────────────────────────
		let resultPromise: Promise<boolean | typeof TIMED_OUT>;

		if (rule.options?.dedupe) {
			// The Promise returned from dedupe must resolve to `boolean` (not TIMED_OUT),
			// because inflight joiner consumers use it directly.
			// We wrap to make TIMED_OUT → false for the shared promise.
			const sharedP = runWithRetryLoop().then((res): boolean =>
				res === TIMED_OUT ? false : res
			);

			const inflightMap = _ruleInflight.get(rule)!;
			inflightMap.set(cacheKey, sharedP);
			const removeFromInflight = (): void => {
				const curr = _ruleInflight.get(rule);
				if (curr?.get(cacheKey) === sharedP) curr.delete(cacheKey);
			};
			void sharedP.then(removeFromInflight, removeFromInflight);
			resultPromise = sharedP;
		} else {
			resultPromise = runWithRetryLoop();
		}

		const finalResult = await resultPromise;

		// ── 5. Store in cache (boolean results only) ──────────────────────────
		if (cacheOpt && typeof finalResult === 'boolean') {
			let cacheMap = _ruleCache.get(rule);
			if (!cacheMap) {
				cacheMap = new Map<string, IRuleCacheEntry>();
				_ruleCache.set(rule, cacheMap);
			}
			const maxAge =
				typeof cacheOpt === 'object' && cacheOpt.maxAgeMs !== undefined
					? cacheOpt.maxAgeMs
					: Infinity;
			cacheMap.set(cacheKey, {
				result: finalResult,
				expiresAt: maxAge === Infinity ? Infinity : Date.now() + maxAge,
			});
		}

		return finalResult;
	};

	// ── Helpers — error collection ────────────────────────────────────────────

	/** Convert a settled outcome to an error entry (if it failed). */
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
			message: QConfig.get().i18n?.resolver?.(message) ?? message,
			value: descriptor.value,
			...(timedOut ? { timedOut: true as const } : {}),
		});
	};

	// ── Execution — parallel (default) or serial ──────────────────────────────

	const errors: IQRulesResult['errors'] = [];

	try {
		if (options?.mode === 'serial') {
			for (const descriptor of descriptors) {
				if (effectiveSignal?.aborted) throwAbort(effectiveSignal);
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
	} catch (err) {
		cleanup();
		throw err;
	}

	cleanup();

	// Final abort check (signal may have fired during the last predicate)
	if (effectiveSignal?.aborted) throwAbort(effectiveSignal);

	return { valid: errors.length === 0, errors };
}

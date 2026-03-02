import 'reflect-metadata';
import { createTC39Guard } from './qrule-tc39-registry';
import type { IClassFieldDecoratorCtx } from '../types/ts-polyfills.type';
import type {
	IQTraceVerbosity,
	IQTraceEvent,
	IQTraceEntry,
} from '../config/quick.config';

/**
 * Metadata key for storing @QRule rules per property.
 * @internal
 * @see {@link QRULE_FIELDS_KEY} — companion key listing decorated fields
 */
export const QRULE_METADATA_KEY = '__qrule__';

/**
 * Metadata key for storing the list of properties decorated with @QRule.
 * @internal
 * @see {@link QRULE_METADATA_KEY} — companion key with the actual rules
 */
export const QRULE_FIELDS_KEY = '__qrule_fields__';

/**
 * Options for the {@link QRule} decorator.
 * @see {@link QRule} — decorator that accepts these options
 * @see {@link IQRule} — generated rule that stores these options
 */
export interface IQRuleOptions {
	/**
	 * Per-rule trace override.
	 *
	 * Takes the **highest priority** in the resolution chain:
	 * per-rule > per-model (`@Quick` options) > global (`QConfig.configure`)
	 *
	 * Useful to silence a noisy rule, escalate a critical one, or route
	 * a specific rule's failures to a separate sink (e.g. a security audit log).
	 *
	 * @example
	 * ```typescript
	 * // Always trace failures for this rule, even if global is 'silent'
	 * @QRule((val: string) => val.length >= 8, 'Too short', {
	 *   trace: { verbosity: 'warn' }
	 * })
	 * declare password: string;
	 *
	 * // Route this rule exclusively to a security sink
	 * @QRule(isValidToken, 'Invalid token', {
	 *   trace: { verbosity: 'error', sink: securityLogger }
	 * })
	 * declare apiToken: string;
	 * ```
	 */
	trace?: {
		/** Override verbosity for this specific rule evaluation only. */
		verbosity?: IQTraceVerbosity;
		/** Filter which rule events to emit (e.g. only `rule-fail`, not `rule-pass`). */
		events?: IQTraceEvent[];
		/** Custom sink for this rule's trace entries — bypasses console and global sink. */
		sink?: (entry: IQTraceEntry) => void;
	};
	/**
	 * Enable result caching for this predicate.
	 *
	 * - `true` — the result is cached indefinitely (process lifetime).
	 * - `{ maxAgeMs }` — each cache entry expires after `maxAgeMs` milliseconds.
	 *
	 * Cache key = `JSON.stringify(fieldValue)`.
	 * Two different instances with the **same field value** share the same cached result,
	 * which is intentional (e.g. two forms checking the same email address).
	 *
	 * Only successful boolean results (`true`/`false`) are cached.
	 * Timed-out or rejected predicates are **not** cached, so they always re-run.
	 *
	 * @example
	 * ```typescript
	 * // Cache forever — useful for immutable lookups
	 * @QRule(async (v: string) => checkUsername(v), 'Username taken', { cache: true })
	 * declare username: string;
	 *
	 * // Cache with TTL — useful for data that can change
	 * @QRule(async (v: string) => checkEmailUnique(v), 'Email taken', { cache: { maxAgeMs: 5000 } })
	 * declare email: string;
	 * ```
	 */
	cache?: boolean | { maxAgeMs?: number };
	/**
	 * Deduplicate concurrent async invocations with the same field value.
	 *
	 * When `true`, if multiple `$qCheckRulesAsync()` calls are in-flight simultaneously
	 * for the same value, they all share the **same underlying `Promise`** instead of
	 * each launching an independent network/IO request.
	 *
	 * Once the shared promise settles, subsequent calls restart fresh.
	 *
	 * Particularly useful in reactive forms where the user triggers many re-validation
	 * cycles in rapid succession (e.g. `valueChanges` stream without `debounceTime`).
	 *
	 * @example
	 * ```typescript
	 * @QRule(async (v: string) => checkEmailUnique(v), 'Email taken', { dedupe: true })
	 * declare email: string;
	 * ```
	 */
	dedupe?: boolean;
}

/**
 * A single business rule attached to a model property.
 *
 * @typeParam T - Type of the property value this rule validates.
 * @see {@link IQRulesResult} — result type after evaluating collected rules
 * @see {@link QRule} — decorator that creates and attaches these rules
 */
export interface IQRule<T = unknown> {
	/**
	 * Predicate that must return `true` for the rule to pass.
	 * Can be synchronous or asynchronous.
	 * Use `$qCheckRulesAsync()` to evaluate async predicates.
	 */
	predicate: (value: T) => boolean | Promise<boolean>;
	/**
	 * Error message when the rule fails.
	 * - `string`: static message (or i18n key for later translation, e.g. `e.message | translate`)
	 * - `() => string`: lazy message, evaluated at `$qCheckRules()` call-time (useful for runtime i18n)
	 */
	message: string | (() => string);
	/** @internal Per-rule trace override stored from `@QRule(predicate, message, options)`. */
	options?: IQRuleOptions;
}

/**
 * Result returned by `QModel.$qCheckRules()`.
 *
 * @see {@link QModel.$qCheckRules} — synchronous evaluation
 * @see {@link QModel.$qCheckRulesAsync} — async evaluation
 * @see {@link IQValidationReport} — combined integrity + rules report
 */
export interface IQRulesResult {
	/** `true` when all business rules pass. */
	valid: boolean;
	/** Errors for every rule that failed. Empty array when `valid === true`. */
	errors: Array<{
		/** Name of the property that failed validation. */
		field: string;
		/** Resolved error message. */
		message: string;
		/** Current value of the property at validation time. */
		value: unknown;
		/**
		 * Present and `true` when the predicate did not resolve within `timeoutMs`.
		 * Only set by `$qCheckRulesAsync()` when the `timeoutMs` option is provided.
		 */
		timedOut?: true;
	}>;
}

/**
 * Options for `$qCheckRulesAsync()`, `$qIsValidAsync()` and `$qValidationReportAsync()`.
 *
 * @see {@link QModel.$qCheckRulesAsync}
 * @see {@link QModel.$qIsValidAsync}
 * @see {@link QModel.$qValidationReportAsync}
 */
export interface IQRulesAsyncOptions {
	/**
	 * Maximum time in milliseconds to wait for each async predicate.
	 * Predicates that do not resolve within this budget fail with `timedOut: true`.
	 * When omitted, predicates are awaited indefinitely.
	 */
	timeoutMs?: number;
	/**
	 * Message to use when a predicate times out.
	 * - `string`: static message.
	 * - `() => string`: lazy, evaluated at call-time (e.g. for runtime i18n).
	 *
	 * When omitted, the rule's own `message` is used.
	 */
	timeoutMessage?: string | (() => string);
	/**
	 * Execution mode for async predicates.
	 *
	 * - `'parallel'` *(default)*: all predicates start simultaneously via
	 *   `Promise.allSettled`. Total time ≈ `max(individual predicate times)`.
	 *   Best for independent remote/IO calls.
	 *
	 * - `'serial'`: predicates run one at a time, in field-declaration order.
	 *   Each predicate starts only after the previous one settles. Total time
	 *   ≈ `Σ(individual predicate times)`. Useful when predicates have
	 *   side-effects or must respect a strict order (e.g., check existence
	 *   before checking uniqueness).
	 */
	mode?: 'parallel' | 'serial';
	/**
	 * An `AbortSignal` that cancels the entire validation run.
	 *
	 * When the signal fires, the returned `Promise` rejects with a
	 * `DOMException` whose `name` is `'AbortError'` — the same contract
	 * as `fetch` and the Fetch API.
	 *
	 * Pass the signal of an `AbortController` that you `.abort()` when the
	 * surrounding context is destroyed (e.g. a React component unmount,
	 * a route change, or a new keystroke that obsoletes the previous validation).
	 *
	 * @example
	 * ```typescript
	 * const ctrl = new AbortController();
	 * onDestroy(() => ctrl.abort());
	 *
	 * const result = await user.$qCheckRulesAsync({ signal: ctrl.signal });
	 * ```
	 */
	signal?: AbortSignal;
	/**
	 * Hard limit in milliseconds for the **entire** validation run.
	 *
	 * Different from `timeoutMs`, which applies per-predicate individually.
	 * When `globalTimeoutMs` is exceeded, the returned `Promise` rejects with
	 * a `DOMException` named `'TimeoutError'` (same semantics as `AbortSignal.timeout()`).
	 *
	 * Use this when you need a UX-level guarantee — e.g. "show the form in under 2 s
	 * even if the uniqueness check hangs" — combined with fallback UI.
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   const result = await user.$qCheckRulesAsync({ globalTimeoutMs: 2000 });
	 * } catch (err) {
	 *   if (err instanceof DOMException && err.name === 'TimeoutError') {
	 *     // validation took too long — show a generic error or retry button
	 *   }
	 * }
	 * ```
	 */
	globalTimeoutMs?: number;
	/**
	 * Number of times to retry a predicate that **rejects** or **times out**.
	 *
	 * - `number` — retry count, no delay between attempts.
	 * - `{ count, delayMs? }` — retry count with an optional pause between each attempt.
	 *
	 * An active `signal` abort **cancels all pending retries** immediately.
	 * Successful `true`/`false` results are **not** retried.
	 *
	 * @example
	 * ```typescript
	 * // Retry up to 3 times with 200 ms between attempts
	 * await user.$qCheckRulesAsync({ retry: { count: 3, delayMs: 200 } });
	 *
	 * // Retry once without delay (quick network blip)
	 * await user.$qCheckRulesAsync({ retry: 1 });
	 * ```
	 */
	retry?: number | { count: number; delayMs?: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal subset of `ClassFieldDecoratorContext` used for TC39 path detection.
 *
 * Defined locally to avoid import conflicts when `experimentalDecorators: true`
 * is active in the consuming project while remaining compatible with TS 5+.
 *
 * @internal
 * @see {@link isTC39Context} — guard that uses this interface
 */
interface ITC39FieldContext {
	readonly kind: 'field';
	readonly name: string | symbol;
	readonly static: boolean;
	readonly private: boolean;
	addInitializer(initializer: (this: unknown) => void): void;
}

/**
 * Runtime type guard: returns `true` when `keyOrContext` is a TC39
 * `ClassFieldDecoratorContext` (i.e. the decorator was used without
 * `experimentalDecorators`).
 *
 * @internal
 * @see {@link ITC39FieldContext} — the interface this guard narrows to
 */
function isTC39Context(
	keyOrContext: string | symbol | object
): keyOrContext is ITC39FieldContext {
	return (
		typeof keyOrContext === 'object' &&
		keyOrContext !== null &&
		'kind' in keyOrContext &&
		(keyOrContext as Record<string, unknown>)['kind'] === 'field'
	);
}

/**
 * Writes `rule` into `Reflect.defineMetadata` on `proto` for `key`.
 * Shared by both the legacy and TC39 paths to avoid duplication.
 *
 * @internal
 * @see {@link QRULE_METADATA_KEY} — metadata key used to store the rule
 * @see {@link isTC39Context} — guard used to select the correct path
 */
function registerRule(proto: object, key: string, rule: IQRule<unknown>): void {
	const existing: IQRule<unknown>[] = [
		...(Reflect.getMetadata(QRULE_METADATA_KEY, proto, key) ?? []),
	];
	existing.push(rule);
	Reflect.defineMetadata(QRULE_METADATA_KEY, existing, proto, key);

	const fields: string[] = Reflect.getMetadata(QRULE_FIELDS_KEY, proto) ?? [];
	if (!fields.includes(key)) {
		fields.push(key);
		Reflect.defineMetadata(QRULE_FIELDS_KEY, fields, proto);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Public decorator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attaches a business-logic rule to a model property.
 *
 * Rules are evaluated by `model.$qCheckRules()` / `model.$qCheckRulesAsync()` and
 * are completely independent of `$qCheckIntegrity()` (transformer-level checks).
 * Multiple `@QRule` decorators on the same property are **all** evaluated and
 * all failures are reported.
 *
 * ---
 *
 * ## Decorator API modes
 *
 * `@QRule` detects at runtime which decorator API is in use and behaves
 * accordingly. A single import works in both environments.
 *
 * ### ✅ Recommended — TC39 / TS 5+ (`experimentalDecorators` absent or `false`)
 *
 * The predicate parameter type is **automatically inferred** from the field's
 * declared type. No manual annotation is needed:
 *
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QRule(value => value.length >= 3, 'Too short')
 *   //     ^^^^^ inferred as `string` — no annotation needed
 *   declare name: string;
 *
 *   @QRule(value => value >= 0, 'Must be positive')
 *   //     ^^^^^ inferred as `number`
 *   declare age: number;
 * }
 * ```
 *
 * ### ⚠️  Legacy — `experimentalDecorators: true` (Angular, NestJS, older TS)
 *
 * The predicate parameter defaults to `unknown`. **Annotate the type explicitly**
 * to maintain strict type safety:
 *
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QRule((value: string) => value.length >= 3, 'Too short')
 *   //            ^^^^^^ must be explicit — legacy API cannot infer field type
 *   declare name: string;
 * }
 * ```
 *
 * > **Why can't legacy mode infer the type?**
 * > The legacy `PropertyDecorator` signature is `(target: object, key: string | symbol) => void`.
 * > TypeScript resolves the generic `T` from the *predicate argument alone*, before
 * > knowing which property the decorator will be applied to. The TC39
 * > `ClassFieldDecoratorContext<Owner, FieldType>` is the only mechanism that
 * > makes `FieldType` available at the call site.
 *
 * ---
 *
 * ## `message` — static or lazy (i18n)
 *
 * ```typescript
 * // Static string (works as Angular pipe key: `e.message | translate`)
 * @QRule((value: string) => value.length >= 3, 'validation.name.min')
 *
 * // Lazy — resolved when $qCheckRules() is actually called (runtime i18n)
 * @QRule((value: string) => value.length >= 3, () => i18n.t('validation.name.min'))
 * ```
 *
 * @param predicate - Receives the current field value typed as `T`; return `true` to pass.
 * @param message   - Static string, i18n key, or lazy `() => string` resolver.
 * @param options   - Optional per-rule settings, including a `trace` override that takes
 *                    priority over per-model and global trace configuration.
 *
 * @typeParam T - Type of the field value.
 *               **Inferred automatically in TC39 mode.**
 *               In legacy mode defaults to `unknown` — annotate the predicate parameter explicitly.
 *
 * @see {@link QModel.$qCheckRules} for synchronous evaluation
 * @see {@link QModel.$qCheckRulesAsync} for async evaluation (required when predicate returns `Promise<boolean>`)
 * @see {@link QModel.$qValidationReport} for a combined integrity + rules report
 *
 * @example
 * ```typescript
 * @Quick({ name: 'string', age: 'number' })
 * class User extends QModel<IUser> {
 *   @QRule((value: string) => value.length >= 3, 'Name must be at least 3 characters')
 *   declare name: string;
 *
 *   @QRule((value: number) => value >= 0, 'Age cannot be negative')
 *   @QRule((value: number) => value <= 120, 'Age must be realistic')
 *   declare age: number;
 * }
 *
 * const user = new User({ name: 'Jo', age: -1 });
 * const result = user.$qCheckRules();
 * // result.valid === false
 * // result.errors → [{ field: 'name', … }, { field: 'age', … }]
 * ```
 */
export function QRule<T = unknown>(
	predicate: (value: T) => boolean | Promise<boolean>,
	message: string | (() => string),
	options?: IQRuleOptions
): {
	/**
	 * Legacy `PropertyDecorator` overload.
	 * Resolved by TypeScript when `experimentalDecorators: true` is active.
	 */
	(target: object, propertyKey: string | symbol): void;
	/**
	 * TC39 field decorator overload.
	 * Resolved by TypeScript 5+ when `experimentalDecorators` is absent/false.
	 * Using `ClassFieldDecoratorContext<This, T>` directly (not `V extends T`)
	 * allows TypeScript to unify `T` with the decorated field's value type,
	 * enabling automatic inference of the predicate parameter type.
	 */
	<This>(target: undefined, context: IClassFieldDecoratorCtx<This, T>): void;
} {
	const rule: IQRule<unknown> = {
		predicate: predicate as IQRule<unknown>['predicate'],
		message,
		...(options ? { options } : {}),
	};

	return function dualModeQRule(
		targetOrUndefined: object | undefined,
		keyOrContext: string | symbol | object
	): void {
		// ── TC39 path ───────────────────────────────────────────────────────────
		// `target` is `undefined` and the second argument is a
		// ClassFieldDecoratorContext. We cannot call Reflect.defineMetadata yet
		// because the class prototype is not accessible at decoration time.
		// `addInitializer` runs when the first instance is created; the `guard`
		// (one WeakSet per decorator closure) ensures it runs exactly once per
		// class prototype, even when many instances are created.
		if (targetOrUndefined === undefined && isTC39Context(keyOrContext)) {
			const context = keyOrContext;
			const key = String(context.name);
			const guard = createTC39Guard();

			context.addInitializer(function (this: unknown) {
				const proto = Object.getPrototypeOf(this as object) as object;
				if (guard.hasAndMark(proto)) return;
				registerRule(proto, key, rule);
			});

			return;
		}

		// ── Legacy path ─────────────────────────────────────────────────────────
		// Standard PropertyDecorator: target = class prototype, key = field name.
		// Registration is immediate — no initializer needed.
		const target = targetOrUndefined as object;
		const key = String(keyOrContext as string | symbol);
		registerRule(target, key, rule);
	} as ReturnType<typeof QRule<T>>;
}

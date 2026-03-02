import type {
	IAuditConfig,
	IAuditEntry,
	IAuditHandle,
} from '@/core/interfaces/audit.interface';

/**
 * Default maximum number of audit entries retained per instance when no explicit
 * limit is configured. Oldest entries are discarded once this cap is exceeded.
 *
 * Override per class: `@Quick({}, { audit: { maxEntries: N } })`
 * Override globally:  `QConfig.configure({ audit: { maxEntries: N } })`
 *
 * @internal
 */
const DEFAULT_MAX_ENTRIES = 500;

/**
 * Active implementation of {@link IAuditHandle}.
 *
 * Holds the live per-field mutation log and honours `start`, `stop`, `clear`,
 * and `configure` lifecycle commands. Callers obtain an instance through
 * {@link AuditService.createHandle} and attach it to the model.
 *
 * Returned by `instance.$qHistory` when audit recording is enabled.
 *
 * @see {@link IAuditHandle} — the public interface this class satisfies
 * @see {@link AuditService} — factory that produces handles
 * @see {@link NULL_AUDIT_HANDLE} — no-op variant returned when audit is disabled
 */
export class ActiveAuditHandle implements IAuditHandle {
	/** @internal Mutable backing store. Exposed only through a shallow copy. */
	private readonly _entries: IAuditEntry[] = [];
	/** @internal Whether the handle is currently recording. */
	private _active: boolean;
	/** @internal Maximum number of entries to retain. */
	private _maxEntries: number;

	/**
	 * Creates an active audit handle.
	 *
	 * @param active - Whether recording starts immediately (`true`) or is
	 *   deferred until `start()` is called (`false`).
	 * @param maxEntries - Maximum entries to retain. Oldest are discarded once
	 *   exceeded. Defaults to `DEFAULT_MAX_ENTRIES` (500).
	 */
	constructor(active = true, maxEntries: number = DEFAULT_MAX_ENTRIES) {
		this._active = active;
		this._maxEntries = maxEntries;
	}

	/**
	 * Returns a **shallow copy** of the current entry list.
	 * Mutations on the returned array do not affect internal state.
	 */
	get value(): IAuditEntry[] {
		return [...this._entries];
	}

	/** `true` while recording is active. */
	get isActive(): boolean {
		return this._active;
	}

	/** Starts (or resumes) recording. Has no effect if already active. */
	start(): void {
		this._active = true;
	}

	/**
	 * Pauses recording. Existing entries are preserved.
	 * Has no effect if already inactive.
	 */
	stop(): void {
		this._active = false;
	}

	/**
	 * Removes all recorded entries.
	 * Does **not** affect the `isActive` state.
	 */
	clear(): void {
		this._entries.length = 0;
	}

	/**
	 * Applies runtime configuration overrides.
	 *
	 * If `maxEntries` is lowered below the current entry count, the oldest
	 * entries are immediately dropped to enforce the new limit.
	 *
	 * @param config - Partial config — only provided keys are overridden.
	 */
	configure(config: Partial<IAuditConfig>): void {
		if (config.maxEntries !== undefined) {
			this._maxEntries = config.maxEntries;
			this._enforceLimit();
		}
	}

	/**
	 * Appends a per-field audit record when recording is active.
	 * No-op when `isActive` is `false`.
	 *
	 * @param entry - The audit entry to append.
	 * @internal Called by `AuditService.recordDiff`.
	 */
	record(entry: IAuditEntry): void {
		if (!this._active) return;
		this._entries.push(entry);
		this._enforceLimit();
	}

	/**
	 * Replaces the internal entry list wholesale (used when cloning a handle
	 * for `$qCopy` — the copy inherits the parent's audit history).
	 *
	 * @param entries - Entries to pre-populate (shallow-copied).
	 * @internal
	 */
	loadEntries(entries: readonly IAuditEntry[]): void {
		this._entries.length = 0;
		this._entries.push(...entries);
	}

	/**
	 * Drops the oldest entries when the internal list exceeds `_maxEntries`.
	 * @internal
	 */
	private _enforceLimit(): void {
		if (this._entries.length > this._maxEntries) {
			this._entries.splice(0, this._entries.length - this._maxEntries);
		}
	}
}

/**
 * Factory and utility service for the audit trail feature.
 *
 * Owns the logic for:
 * - Creating audit handles ({@link ActiveAuditHandle} or no-op) based on resolved config.
 * - Recording per-field mutations (diff between before/after serialized snapshots).
 * - Cloning handles when `$qCopy` produces a new model instance.
 *
 * @example
 * ```typescript
 * const handle = AuditService.createHandle({ enabled: true, maxEntries: 50 });
 * const before = { name: 'v1' };
 * const after  = { name: 'v2' };
 * AuditService.recordDiff({ handle, before, after, method: 'patch' });
 * handle.value;
 * // → [{ field: 'name', from: 'v1', to: 'v2', at: Date, method: 'patch' }]
 * ```
 *
 * @see {@link ActiveAuditHandle}
 * @see {@link IAuditHandle}
 */
export class AuditService {
	/**
	 * Shared singleton — no instance state needed.
	 * All members are static.
	 */
	private constructor() {
		/* static-only class — no instantiation */
	}

	/**
	 * Creates an {@link ActiveAuditHandle} when `config.enabled` is `true`.
	 * Returns the shared {@link NULL_AUDIT_HANDLE} otherwise.
	 *
	 * @param config - Resolved audit configuration for the model class (may be undefined).
	 * @internal Imported lazily by `QModel` to avoid adding weight when audit is unused.
	 */
	static createHandle(
		config: (IAuditConfig & { enabled?: boolean }) | undefined
	): IAuditHandle {
		if (config?.enabled !== true) {
			// Lazy import to avoid circular deps — resolved at call time.
			const { NULL_AUDIT_HANDLE } =
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				require('@/core/models/null-audit-handle') as {
					NULL_AUDIT_HANDLE: IAuditHandle;
				};
			return NULL_AUDIT_HANDLE;
		}
		return new ActiveAuditHandle(
			true,
			config.maxEntries ?? DEFAULT_MAX_ENTRIES
		);
	}

	/**
	 * Computes a per-field diff between `before` and `after` serialized snapshots
	 * and appends one entry per changed field to the handle.
	 *
	 * Fields whose serialized values are strictly equal (`===`) are skipped.
	 *
	 * @param handle - The audit handle to append entries to.
	 * @param before - Serialized snapshot before the mutation.
	 * @param after  - Serialized snapshot after the mutation.
	 * @param method - Which `QModel` operation caused the change.
	 */
	static recordDiff({
		handle,
		before,
		after,
		method,
	}: {
		handle: IAuditHandle;
		before: Record<string, unknown>;
		after: Record<string, unknown>;
		method: IAuditEntry['method'];
	}): void {
		if (!handle.isActive) return;

		const allKeys = new Set([
			...Object.keys(before),
			...Object.keys(after),
		]);
		const now = new Date();
		const activeHandle = handle as ActiveAuditHandle;

		for (const key of allKeys) {
			const fromVal = before[key];
			const toVal = after[key];
			if (fromVal === toVal) continue;
			activeHandle.record({
				field: key,
				from: fromVal,
				to: toVal,
				at: now,
				method,
			});
		}
	}

	/**
	 * Clones an audit handle for use in `$qCopy()`.
	 *
	 * The clone inherits all entries from the source handle and applies the
	 * same `maxEntries`. The clone starts with the same activity state as the source.
	 *
	 * @param source - The original model's audit handle.
	 * @returns A new `ActiveAuditHandle` containing the source's entries,
	 *   or the `NULL_AUDIT_HANDLE` if the source is a null-handle.
	 */
	static cloneHandle(source: IAuditHandle): IAuditHandle {
		if (!(source instanceof ActiveAuditHandle)) {
			const { NULL_AUDIT_HANDLE } =
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				require('@/core/models/null-audit-handle') as {
					NULL_AUDIT_HANDLE: IAuditHandle;
				};
			return NULL_AUDIT_HANDLE;
		}

		// Reconstruct a clone with the same limit and entries.
		// @quickmodel-rule-ignore: no-as-unknown — accessing private _active/_maxEntries within same module for cloning
		const src = source as unknown as {
			_maxEntries: number;
			_active: boolean;
		};
		const clone = new ActiveAuditHandle(src._active, src._maxEntries);
		clone.loadEntries(source.value);
		return clone;
	}
}

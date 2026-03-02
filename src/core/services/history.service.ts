import type {
	IQHistoryConfig,
	IQHistoryEntry,
	IQHistoryHandle,
} from '@/core/interfaces/history.interface';

/**
 * Default maximum number of history entries retained per instance when no explicit
 * limit is configured. Oldest entries are discarded once this cap is exceeded.
 *
 * 500 entries × ~1 KB/entry ≈ 500 KB worst-case per instance.
 * Override per class: `@Quick({}, { history: { maxEntries: N } })`
 * Override globally:  `QConfig.configure({ history: { maxEntries: N } })`
 *
 * @internal
 */
const DEFAULT_MAX_ENTRIES = 500;

/**
 * Active implementation of {@link IQHistoryHandle}.
 *
 * Holds the live mutation log and honours `start`, `stop`, `clear`,
 * and `configure` lifecycle commands. Callers obtain an instance through
 * {@link HistoryService.createHandle} and attach it to the model.
 *
 * Returned by `instance.$qHistory` when history recording is enabled.
 *
 * @see {@link IQHistoryHandle} — the public interface this class satisfies
 * @see {@link HistoryService} — factory that produces handles
 * @see {@link NULL_HISTORY_HANDLE} — no-op variant returned when history is disabled
 */
export class ActiveHistoryHandle implements IQHistoryHandle {
	/** @internal Mutable backing store. Exposed only through a shallow copy. */
	private readonly _entries: IQHistoryEntry[] = [];
	/** @internal Whether the handle is currently recording. */
	private _active: boolean;
	/** @internal Maximum number of entries to retain. */
	private _maxEntries: number;
	/** @internal Recording granularity — per-operation or per-field. */
	private readonly _recordMode: 'operation' | 'field';

	/**
	 * Creates an active history handle.
	 *
	 * @param active - Whether recording starts immediately (`true`) or is
	 *   deferred until `start()` is called (`false`).
	 * @param maxEntries - Maximum entries to retain. Oldest are discarded once
	 *   exceeded. Defaults to `DEFAULT_MAX_ENTRIES` (500).
	 * @param recordMode - Granularity: `'operation'` (default) or `'field'`.
	 */
	constructor(
		active = true,
		maxEntries: number = DEFAULT_MAX_ENTRIES,
		recordMode: 'operation' | 'field' = 'operation'
	) {
		this._active = active;
		this._maxEntries = maxEntries;
		this._recordMode = recordMode;
	}

	/**
	 * Returns a **shallow copy** of the current entry list.
	 * Mutations on the returned array do not affect internal state.
	 */
	get value(): IQHistoryEntry[] {
		return [...this._entries];
	}

	/** `true` while recording is active. */
	get isActive(): boolean {
		return this._active;
	}

	/** Recording granularity — `'operation'` (default) or `'field'`. */
	get recordMode(): 'operation' | 'field' {
		return this._recordMode;
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
	configure(config: IQHistoryConfig): void {
		if (config.maxEntries !== undefined) {
			this._maxEntries = config.maxEntries;
			this._enforceLimit();
		}
	}

	/**
	 * Appends a mutation record when recording is active.
	 * No-op when `isActive` is `false`.
	 *
	 * @param entry - The mutation record to append.
	 * @internal Called by `HistoryService.recordDiff`.
	 */
	record(entry: IQHistoryEntry): void {
		if (!this._active) return;
		this._entries.push(entry);
		this._enforceLimit();
	}

	/**
	 * Replaces the internal entry list wholesale (used when cloning a handle
	 * for `$qCopy` — the copy inherits the parent's history).
	 *
	 * @param entries - Entries to pre-populate (shallow-copied).
	 * @internal
	 */
	loadEntries(entries: readonly IQHistoryEntry[]): void {
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
 * Factory and utility service for the history trail feature.
 *
 * Owns the logic for:
 * - Creating history handles ({@link ActiveHistoryHandle} or no-op) based on resolved config.
 * - Recording mutations (diff between before/after serialized snapshots).
 * - Cloning handles when `$qCopy` produces a new model instance.
 *
 * @example
 * ```typescript
 * const handle = HistoryService.createHandle({ enabled: true, maxEntries: 50 });
 * const before = { name: 'v1' };
 * const after  = { name: 'v2' };
 * HistoryService.recordDiff({ handle, before, after, method: 'patch' });
 * handle.value;
 * // → [{ method: 'patch', at: Date, changes: { name: { from: 'v1', to: 'v2' } } }]
 * ```
 *
 * @see {@link ActiveHistoryHandle}
 * @see {@link IQHistoryHandle}
 */
export class HistoryService {
	/**
	 * Shared singleton — no instance state needed.
	 * All members are static.
	 */
	private constructor() {
		/* static-only class — no instantiation */
	}

	/**
	 * Creates an {@link ActiveHistoryHandle} when `config.enabled` is `true`.
	 * Returns the shared {@link NULL_HISTORY_HANDLE} otherwise.
	 *
	 * @param config - Resolved history configuration for the model class (may be undefined).
	 * @internal Imported lazily by `QModel` to avoid adding weight when history is unused.
	 */
	static createHandle(
		config: (IQHistoryConfig & { enabled?: boolean }) | undefined
	): IQHistoryHandle {
		if (config?.enabled !== true) {
			// Lazy import to avoid circular deps — resolved at call time.
			const { NULL_HISTORY_HANDLE } =
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				require('@/core/models/null-history-handle') as {
					NULL_HISTORY_HANDLE: IQHistoryHandle;
				};
			return NULL_HISTORY_HANDLE;
		}
		return new ActiveHistoryHandle(
			true,
			config.maxEntries ?? DEFAULT_MAX_ENTRIES,
			config.recordMode ?? 'operation'
		);
	}

	/**
	 * Computes a diff between `before` and `after` serialized snapshots and appends
	 * entries to the handle according to its `recordMode`:
	 *
	 * - `'operation'` (default): one entry containing all changed fields in `changes`.
	 * - `'field'`: one entry per changed field.
	 *
	 * Fields whose serialized values are strictly equal (`===`) are skipped.
	 *
	 * @param handle - The history handle to append entries to.
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
		handle: IQHistoryHandle;
		before: Record<string, unknown>;
		after: Record<string, unknown>;
		method: IQHistoryEntry['method'];
	}): void {
		if (!handle.isActive) return;

		const allKeys = new Set([
			...Object.keys(before),
			...Object.keys(after),
		]);
		const now = new Date();
		const activeHandle = handle as ActiveHistoryHandle;

		if (handle.recordMode === 'field') {
			// Fine-grained mode: one entry per changed field.
			for (const key of allKeys) {
				const fromVal = before[key];
				const toVal = after[key];
				if (fromVal === toVal) continue;
				activeHandle.record({
					method,
					at: now,
					changes: { [key]: { from: fromVal, to: toVal } },
				});
			}
		} else {
			// Operation mode (default): one entry for all changed fields.
			const changes: Record<string, { from: unknown; to: unknown }> = {};
			for (const key of allKeys) {
				const fromVal = before[key];
				const toVal = after[key];
				if (fromVal === toVal) continue;
				changes[key] = { from: fromVal, to: toVal };
			}
			if (Object.keys(changes).length === 0) return;
			activeHandle.record({ method, at: now, changes });
		}
	}

	/**
	 * Clones a history handle for use in `$qCopy()`.
	 *
	 * The clone inherits all entries from the source handle and applies the
	 * same `maxEntries` and `recordMode`. The clone starts with the same
	 * activity state as the source.
	 *
	 * @param source - The original model's history handle.
	 * @returns A new `ActiveHistoryHandle` containing the source's entries,
	 *   or the `NULL_HISTORY_HANDLE` if the source is a null-handle.
	 */
	static cloneHandle(source: IQHistoryHandle): IQHistoryHandle {
		if (!(source instanceof ActiveHistoryHandle)) {
			const { NULL_HISTORY_HANDLE } =
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				require('@/core/models/null-history-handle') as {
					NULL_HISTORY_HANDLE: IQHistoryHandle;
				};
			return NULL_HISTORY_HANDLE;
		}

		// Reconstruct a clone with the same limit and entries.
		// We use the internal non-public fields via a cast — same module, safe access.
		// @quickmodel-rule-ignore: no-as-unknown — accessing private _active/_maxEntries within same module for cloning
		const src = source as unknown as {
			_maxEntries: number;
			_active: boolean;
		};
		const clone = new ActiveHistoryHandle(
			src._active,
			src._maxEntries,
			source.recordMode
		);
		clone.loadEntries(source.value);
		return clone;
	}
}

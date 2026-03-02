/**
 * A single mutation record captured by the history trail.
 *
 * Each entry describes one **operation** (`$qPatch`, `$qCopy`, or `$qFrom`)
 * that caused one or more field changes, storing the serialized before/after
 * values for every changed field and the timestamp of the operation.
 *
 * With `recordMode: 'field'` each entry's `changes` map contains exactly one
 * key; with the default `'operation'` mode all fields changed in one call are
 * grouped into a single entry.
 *
 * @see {@link IQHistoryHandle} — the container that holds a list of these entries
 * @see {@link IQHistoryConfig} — configuration that controls recording behaviour
 */
export interface IQHistoryEntry {
	/** Which `QModel` operation caused the change. */
	readonly method: 'patch' | 'copy' | 'populate';
	/** UTC timestamp of the operation. */
	readonly at: Date;
	/**
	 * Map of every field that changed during this operation.
	 * Key = field name, value = `{ from, to }` with serialized before/after values.
	 *
	 * In `'operation'` mode (default) this map may contain multiple keys.
	 * In `'field'` mode this map always contains exactly one key.
	 */
	readonly changes: Readonly<
		Record<string, { readonly from: unknown; readonly to: unknown }>
	>;
}

/**
 * Configuration options for the history trail feature.
 *
 * Provided in `@Quick({}, { history })` or globally via `QConfig.configure({ history })`.
 *
 * @see {@link IQHistoryHandle}
 */
export interface IQHistoryConfig {
	/**
	 * Maximum number of entries to retain per instance.
	 * Oldest entries are dropped once this limit is exceeded.
	 * Defaults to `500`.
	 */
	maxEntries?: number;

	/**
	 * Controls the granularity of each recorded history entry.
	 *
	 * - `'operation'` (**default**): one entry per `$qPatch` / `$qCopy` / `$qFrom`
	 *   call, containing **all** changed fields grouped together in the `changes`
	 *   map. A single `$qPatch({ a: 1, b: 2 })` that mutates both fields emits
	 *   exactly **one** entry with two keys in `changes`.
	 *
	 * - `'field'`: one entry per changed field, preserving fine-grained granularity.
	 *   A single `$qPatch({ a: 1, b: 2 })` that mutates both fields emits
	 *   **two** entries, each with exactly one key in `changes`.
	 *
	 * @defaultValue `'operation'`
	 */
	recordMode?: 'operation' | 'field';
}

/**
 * Public interface for a history handle attached to a model instance.
 *
 * Access via `instance.$qHistory`. When history is disabled, the handle is a
 * shared no-op object (`value` is always empty, all methods are no-ops).
 *
 * @example
 * ```typescript
 * ＠Quick({}, { history: { enabled: true } })
 * class ContractModel extends QModel<IContract> { ... }
 *
 * const contract = new ContractModel({ name: 'v1' });
 * contract.$qPatch({ name: 'v2' });
 *
 * const history = contract.$qHistory;
 * history.value;
 * // → [{ method: 'patch', at: Date, changes: { name: { from: 'v1', to: 'v2' } } }]
 * ```
 *
 * @see {@link IQHistoryEntry} — individual mutation record
 * @see {@link IQHistoryConfig} — configuration options
 */
export interface IQHistoryHandle {
	/** Frozen array of all recorded mutation entries (oldest first). */
	readonly value: IQHistoryEntry[];
	/** `true` while recording is active. */
	readonly isActive: boolean;
	/** Recording granularity — `'operation'` (default) or `'field'`. */
	readonly recordMode: 'operation' | 'field';
	/** Starts (or resumes) recording. No-op if already active. */
	start(): void;
	/** Pauses recording. Existing entries are preserved. No-op if already inactive. */
	stop(): void;
	/** Clears all recorded entries. Does not affect `isActive`. */
	clear(): void;
	/** Applies runtime configuration overrides (e.g. adjust `maxEntries`). */
	configure(config: Partial<IQHistoryConfig>): void;
}

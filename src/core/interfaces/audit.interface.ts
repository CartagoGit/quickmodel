/**
 * Per-field mutation record captured by the audit trail.
 *
 * Each entry describes **one field change** caused by a `$qPatch`, `$qCopy`,
 * or `$qFrom` operation, storing the serialized before/after values for that
 * field and the timestamp of the operation.
 *
 * Unlike {@link IHistoryEntry} (which groups all changed fields into one entry
 * per operation), `IAuditEntry` always records one entry per changed field,
 * providing fine-grained field-level granularity.
 *
 * @see {@link IAuditHandle} — the container that holds a list of these entries
 * @see {@link IAuditConfig} — configuration that controls recording behaviour
 */
export interface IAuditEntry {
	/** Name of the field that changed. */
	readonly field: string;
	/** Serialized value of the field **before** the mutation. */
	readonly from: unknown;
	/** Serialized value of the field **after** the mutation. */
	readonly to: unknown;
	/** UTC timestamp of the operation. */
	readonly at: Date;
	/** Which `QModel` operation caused the change. */
	readonly method: 'patch' | 'copy' | 'populate';
}

/**
 * Configuration options for the audit trail feature.
 *
 * Provided in `@Quick({}, { audit })` or globally via `QConfig.configure({ audit })`.
 *
 * @see {@link IAuditHandle}
 */
export interface IAuditConfig {
	/**
	 * Maximum number of audit entries to retain per instance.
	 * Oldest entries are dropped once this limit is exceeded.
	 * Defaults to `500`.
	 */
	maxEntries?: number;
}

/**
 * Public interface for an audit handle attached to a model instance.
 *
 * Access via `instance.$qHistory` when `audit` is enabled. When audit is
 * disabled, the handle is a shared no-op object (`value` is always empty,
 * all methods are no-ops).
 *
 * @example
 * ```typescript
 * ＠Quick({ name: String }, { audit: { enabled: true } })
 * class ContractModel extends QModel<IContract> { ... }
 *
 * const contract = new ContractModel({ name: 'v1' });
 * contract.$qPatch({ name: 'v2' });
 *
 * const handle = contract.$qHistory;
 * handle.value;
 * // → [{ field: 'name', from: 'v1', to: 'v2', at: Date, method: 'patch' }]
 * ```
 *
 * @see {@link IAuditEntry} — individual mutation record
 * @see {@link IAuditConfig} — configuration options
 */
export interface IAuditHandle {
	/** Frozen array of all recorded audit entries (oldest first). */
	readonly value: IAuditEntry[];
	/** `true` while recording is active. */
	readonly isActive: boolean;
	/** Starts (or resumes) recording. No-op if already active. */
	start(): void;
	/** Pauses recording. Existing entries are preserved. No-op if already inactive. */
	stop(): void;
	/** Clears all recorded entries. Does not affect `isActive`. */
	clear(): void;
	/** Applies runtime configuration overrides (e.g. adjust `maxEntries`). */
	configure(config: Partial<IAuditConfig>): void;
}

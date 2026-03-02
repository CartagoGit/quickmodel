import type {
	IAuditConfig,
	IAuditHandle,
} from '@/core/interfaces/audit.interface';

/**
 * Shared no-op audit handle returned when audit recording is disabled.
 *
 * All methods are no-ops and `value` always returns an empty frozen array.
 * Using a singleton avoids allocating a new object per model instance when
 * the feature is not needed, keeping the zero-overhead guarantee intact.
 *
 * @see {@link IAuditHandle} — the interface this object satisfies
 * @see {@link AuditService.createHandle} — factory that returns this or an `ActiveAuditHandle`
 */
export const NULL_AUDIT_HANDLE: IAuditHandle = Object.freeze({
	get value() {
		return Object.freeze([]) as never[];
	},
	get isActive() {
		return false;
	},

	start(): void {},

	stop(): void {},

	clear(): void {},

	configure(_config: Partial<IAuditConfig>): void {},
});

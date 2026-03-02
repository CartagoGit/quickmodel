import type {
	IHistoryConfig,
	IHistoryHandle,
} from '@/core/interfaces/history.interface';

/**
 * Shared no-op history handle returned when history recording is disabled.
 *
 * All methods are no-ops and `value` always returns an empty frozen array.
 * Using a singleton avoids allocating a new object per model instance when
 * the feature is not needed, keeping the zero-overhead guarantee intact.
 *
 * @see {@link IHistoryHandle} — the interface this object satisfies
 * @see {@link HistoryService.createHandle} — factory that returns this or an `ActiveHistoryHandle`
 */
export const NULL_HISTORY_HANDLE: IHistoryHandle = Object.freeze({
	get value() {
		return Object.freeze([]) as never[];
	},
	get isActive() {
		return false;
	},
	get recordMode(): 'operation' | 'field' {
		return 'operation';
	},

	start(): void {},

	stop(): void {},

	clear(): void {},

	configure(_config: Partial<IHistoryConfig>): void {},
});

import { QConfig } from '../config/quick.config';

/**
 * RecursionGuard - Manages recursion depth and circular reference detection
 *
 * Responsibilities:
 * - Depth tracking
 * - Circular reference detection
 * - Context creation and propagation
 * - Stack overflow prevention
 *
 * @see {@link Deserializer} — uses this guard to limit recursive deserialization depth
 * @see {@link QConfig} — configure `maxRecursionDepth` globally
 */
export class RecursionGuard {
	/** @internal Default maximum recursion depth used when no `maxRecursionDepth` is configured. */
	private static readonly DEFAULT_MAX_DEPTH = 50;

	/**
	 * Validates that the current recursion depth doesn't exceed the maximum.
	 *
	 * @param currentDepth - The current recursion depth counter
	 * @throws {Error} If `currentDepth` exceeds the configured or default maximum
	 * @see {@link RecursionGuard.getMaxDepth} — queries the configured depth limit
	 * @see {@link RecursionGuard.createContext} — creates the context that tracks depth
	 * @see {@link QConfig} — configure `maxRecursionDepth` globally
	 */
	public validateDepth(currentDepth: number): void {
		const config = QConfig.get();
		const maxDepth =
			config.defaults?.maxRecursionDepth ??
			RecursionGuard.DEFAULT_MAX_DEPTH;

		if (currentDepth > maxDepth) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${maxDepth}) exceeded during population.`
			);
		}
	}

	/**
	 * Creates a recursion context with incremented depth.
	 *
	 * @param existingContext - Optional previous context whose `visited` set and `depth` are inherited
	 * @returns A new context object with `visited` WeakSet and `depth` incremented by 1
	 * @see {@link RecursionGuard.validateDepth} — should be called with the new context's depth
	 * @see {@link RecursionGuard.hasCircularReference} — uses the `visited` WeakSet from this context
	 */
	public createContext(existingContext?: {
		visited?: WeakSet<object>;
		depth?: number;
	}): { visited: WeakSet<object>; depth: number } {
		const visited = existingContext?.visited || new WeakSet();
		const currentDepth = existingContext?.depth || 0;

		return {
			visited,
			depth: currentDepth + 1,
		};
	}

	/**
	 * Checks if an object has already been visited (circular reference detection).
	 *
	 * @param data - The value to test for circularity
	 * @param visited - The WeakSet of already-visited object references for this recursion cycle
	 * @returns `true` if `data` is an object that was already in `visited`; `false` otherwise
	 * @see {@link RecursionGuard.createContext} — creates the `visited` WeakSet used here
	 * @see {@link Deserializer} — calls this guard when recursing into nested models
	 */
	public hasCircularReference(
		data: unknown,
		visited: WeakSet<object>
	): boolean {
		if (typeof data === 'object' && data !== null) {
			if (visited.has(data)) {
				return true;
			}
			visited.add(data);
		}
		return false;
	}

	/**
	 * Gets the maximum allowed recursion depth from config, falling back to the default.
	 *
	 * @returns The configured `maxRecursionDepth` or the default (50) if not set
	 * @see {@link RecursionGuard.validateDepth} — uses this value to enforce the limit
	 * @see {@link QConfig} — source of the `maxRecursionDepth` setting
	 */
	public getMaxDepth(): number {
		return (
			QConfig.get().defaults?.maxRecursionDepth ??
			RecursionGuard.DEFAULT_MAX_DEPTH
		);
	}
}

/**
 * RecursionGuard - Manages recursion depth and circular reference detection
 *
 * Responsibilities:
 * - Depth tracking
 * - Circular reference detection
 * - Context creation and propagation
 * - Stack overflow prevention
 */
export class RecursionGuard {
	private static readonly MAX_DEPTH = 512;

	/**
	 * Validates that the current recursion depth doesn't exceed the maximum
	 */
	public validateDepth(currentDepth: number): void {
		if (currentDepth > RecursionGuard.MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${RecursionGuard.MAX_DEPTH}) exceeded during population.`
			);
		}
	}

	/**
	 * Creates a recursion context with incremented depth
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
	 * Checks if an object has already been visited (circular reference detection)
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
	 * Gets the maximum allowed depth
	 */
	public getMaxDepth(): number {
		return RecursionGuard.MAX_DEPTH;
	}
}

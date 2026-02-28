/**
 * @internal
 *
 * TC39 decorator path — deduplication registry.
 *
 * Problem: In the TC39 field decorator API, the inner function returned by the
 * decorator factory is called once per *field* at class-definition time, but
 * `addInitializer` callbacks run on **every instance creation**. Because
 * `Reflect.defineMetadata` mutates the shared array stored on the prototype,
 * repeated registration would push duplicate rules for each instance.
 *
 * Solution: keep a `WeakSet` **per decorator-factory closure** (one set per
 * `@QRule(...)` application). Once the initializer has registered the rule for
 * a given prototype, the `WeakSet` prevents any further registration for that
 * same prototype.
 *
 * A `WeakSet<object>` is intentionally used so that class prototypes can be
 * garbage-collected when no references remain (e.g., in dynamic class creation).
 */

/**
 * Creates a fresh `WeakSet<object>` guard tied to a single decorator closure.
 *
 * Each call to `QRule(predicate, message)` obtains its own guard via
 * `createTC39Guard()`, ensuring that different `@QRule` applications on the
 * same field each register exactly once.
 *
 * @returns A stateful guard with a single `hasAndMark(proto)` method.
 *
 * @see {@link QRule} — the decorator that uses this guard to prevent duplicate registrations
 * @see {@link QModel} — model class whose prototype is tracked by the WeakSet
 *
 * @example
 * ```typescript
 * // Inside QRule factory (simplified):
 * const guard = createTC39Guard();
 * context.addInitializer(function(this: object) {
 *   const proto = Object.getPrototypeOf(this);
 *   if (guard.hasAndMark(proto)) return; // already registered for this class
 *   Reflect.defineMetadata(...);
 * });
 * ```
 */
export function createTC39Guard(): {
	/**
	 * Returns `true` if `proto` was already seen (and therefore skips
	 * registration), or `false` + marks `proto` as seen on the first call.
	 */
	hasAndMark(proto: object): boolean;
} {
	const seen = new WeakSet<object>();
	return {
		hasAndMark(proto: object): boolean {
			if (seen.has(proto)) return true;
			seen.add(proto);
			return false;
		},
	};
}

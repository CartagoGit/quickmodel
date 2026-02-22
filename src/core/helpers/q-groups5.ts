/**
 * @fileoverview `qGroups5` — TS 5.0+ variant of {@link qGroups} that accepts
 * a **mutable array** without requiring `as const`.
 *
 * This file is intentionally separate from `q-groups.ts` because the
 * `const` type-parameter syntax (`<const T extends …>`) is only valid in
 * TypeScript 5.0+. Keeping it isolated ensures that consumers on TS 4.x can
 * safely use `@cartago-git/quickmodel/forms` without encountering a
 * `.d.ts` parse error from this syntax.
 *
 * @see {@link qGroups} for the TS 4.1-compatible version (spread / `as const`).
 * @module
 */

import type { IQGroupsMap } from './q-groups';

/**
 * Creates a typed group-name map from a **mutable array literal** without
 * requiring `as const`.
 *
 * Uses `const` type parameters — **requires TypeScript 5.0+**.
 * Consumers on TS < 5.0 should use {@link qGroups} with `as const` instead:
 *
 * ```ts
 * // TS < 5 — use qGroups with as const:
 * import { qGroups } from '@cartago-git/quickmodel/forms';
 * const Groups = qGroups(['identity', 'security'] as const);
 *
 * // TS 5+ — use qGroups5, no as const needed:
 * import { qGroups5 } from '@cartago-git/quickmodel/compat/ts5/forms';
 * const Groups = qGroups5(['identity', 'security']);
 * ```
 *
 * @example
 * ```ts
 * const Groups = qGroups5(['identity', 'security', 'payment']);
 * // Groups.identity → type 'identity' ✅  (no as const required)
 * // Groups.typo    → compile error    ✅
 *
 * class ProfileComponent {
 *   @QGroup(Groups.identity)
 *   name = '';
 * }
 * ```
 *
 * @typeParam T - Readonly string tuple inferred from the array literal.
 */
export function qGroups5<const T extends string[]>(
	groups: T
): IQGroupsMap<T[number]> {
	return Object.fromEntries(
		groups.map((group) => [group, group])
	) as IQGroupsMap<T[number]>;
}

/**
 * @fileoverview `qGroups` helper — creates a typed group-name map for use with
 * `@QGroup`, {@link qCheckRules} and related form-validation utilities.
 *
 * ## Why a helper instead of a plain object?
 *
 * ```ts
 * // Without helper — must write each name twice + as const:
 * const Groups = { identity: 'identity', security: 'security' } as const;
 *
 * // With helper — each name once, types inferred automatically:
 * const Groups = qGroups('identity', 'security');
 * ```
 *
 * ## TypeScript version compatibility
 *
 * | Call style                                   | TS version | Notes                  |
 * |----------------------------------------------|------------|------------------------|
 * | `qGroups('a', 'b')`                          | TS 3.4+    | Spread, no `as const`  |
 * | `qGroups(['a', 'b'] as const)`               | TS 3.4+    | Array with `as const`  |
 * | `qGroups5(['a', 'b'])` *(mutable array)*     | TS 5.0+    | No `as const` — uses `const` type parameter. Import from `compat/ts5/forms` |
 *
 * The first two overloads are published in the `.d.ts` without any TS5-only
 * syntax (`const T`), so they work in TS 3.4+ consumers.
 * The third overload is provided as a separate export (`qGroups5`) via
 * `quickmodel/compat/ts5/forms`, usable only when the consumer's
 * compiler is TS 5.0+.
 *
 * ## See also
 *
 * - {@link qCheckRules} — run `@QRule` predicates on any instance
 * - {@link qGetGroups} — list `@QGroup` names declared on an instance
 * - {@link qCheckRulesByGroup} — per-group validation results
 *
 * @module
 */

/**
 * The type of the map returned by {@link qGroups}.
 * Each key and value is the same literal string.
 *
 * @typeParam T - Union of group name literals.
 */
export type IQGroupsMap<T extends string> = { [K in T]: K };

// ---------------------------------------------------------------------------
// Overload 1 — spread (TS 3.4+)
// qGroups('identity', 'security')
// ---------------------------------------------------------------------------

/**
 * Creates a typed group-name map from **spread string literals**.
 *
 * TypeScript infers the literal types automatically — no `as const` needed.
 *
 * @example
 * ```ts
 * const Groups = qGroups('identity', 'security');
 * // Groups.identity → type 'identity'
 * // Groups.security → type 'security'
 * // Groups.typo    → compile error ✅
 *
 * class ProfileComponent {
 *   @QGroup(Groups.identity)
 *   name = '';
 *
 *   validate() {
 *     qCheckRules(this, { group: Groups.identity }); // autocomplete ✅
 *   }
 * }
 * ```
 * @see {@link IQGroupsMap} — the type of the returned group map
 * @see {@link qCheckRules} — pass `Groups.name` to the `group` option
 * @see {@link QGroup} — use the map entries as group name arguments
 */
export function qGroups<T extends string[]>(
	...groups: T
): IQGroupsMap<T[number]>;

// ---------------------------------------------------------------------------
// Overload 2 — readonly array / as const (TS 3.4+)
// qGroups(['identity', 'security'] as const)
// ---------------------------------------------------------------------------

/**
 * Creates a typed group-name map from a **`readonly` array** (use `as const`
 * on TS < 5.0 to preserve literal types).
 *
 * @example
 * ```ts
 * // TS 3.4+ — as const required to keep literal types:
 * const Groups = qGroups(['identity', 'security'] as const);
 *
 * // TS 5.x — as const optional (use qGroups5 for cleaner DX):
 * const Groups = qGroups(['identity', 'security'] as const);
 * ```
 * @see {@link IQGroupsMap} — the shape of the returned map
 * @see {@link qGroups} — spread overload (no array wrapper needed)
 */
export function qGroups<T extends string>(groups: readonly T[]): IQGroupsMap<T>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function qGroups<T extends string>(
	...args: [readonly T[]] | T[]
): IQGroupsMap<T> {
	const list = (Array.isArray(args[0]) ? args[0] : args) as T[];
	return Object.fromEntries(
		list.map((group) => [group, group])
	) as IQGroupsMap<T>;
}

/**
 * Form-validation helpers — **TypeScript 5.0+ only** entry point.
 *
 * Import from `quickmodel/compat/ts5/forms` when you need
 * {@link qGroups5}, which accepts a mutable array without `as const`.
 *
 * Consumers on TS < 5.0 will get a compile error because this entry point
 * uses `const` type parameters in its type declarations. Use
 * `quickmodel/forms` (compatible with TS 3.4+) instead and
 * pass arrays with `as const`.
 *
 * @example
 * ```ts
 * // TS 5.0+ only
 * import { qGroups5 } from 'quickmodel/compat/ts5/forms';
 * import type { IQGroupsMap } from 'quickmodel/compat/ts5/forms';
 *
 * const Groups = qGroups5(['identity', 'security']); // no as const needed
 * ```
 *
 * @see {@link qGroups5} — the TS 5.0+ form-group helper exported here
 * @see {@link IQGroupsMap} — the typed map type produced by `qGroups5`
 * @see {@link Forms.qGroups} — TS 4.1-compatible alternative (requires `as const`)
 * @module compat/ts5/forms
 */

export { qGroups5 } from '@/core/helpers/q-groups5';
// Re-export IQGroupsMap for convenience so consumers don't need two imports
export type { IQGroupsMap } from '@/core/helpers/q-groups';

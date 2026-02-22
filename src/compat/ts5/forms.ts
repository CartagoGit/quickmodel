/**
 * @fileoverview Form-validation helpers — **TypeScript 5.0+ only** entry point.
 *
 * Import from `@cartago-git/quickmodel/compat/ts5/forms` when you need
 * {@link qGroups5}, which accepts a mutable array without `as const`.
 *
 * Consumers on TS < 5.0 will get a compile error because this entry point
 * uses `const` type parameters in its type declarations. Use
 * `@cartago-git/quickmodel/forms` (compatible with TS 3.4+) instead and
 * pass arrays with `as const`.
 *
 * @example
 * ```ts
 * // TS 5.0+ only
 * import { qGroups5 } from '@cartago-git/quickmodel/compat/ts5/forms';
 * import type { IQGroupsMap } from '@cartago-git/quickmodel/compat/ts5/forms';
 *
 * const Groups = qGroups5(['identity', 'security']); // no as const needed
 * ```
 *
 * @module compat/ts5/forms
 */

export { qGroups5 } from '@/core/helpers/q-groups5';
// Re-export IQGroupsMap for convenience so consumers don't need two imports
export type { IQGroupsMap } from '@/core/helpers/q-groups';

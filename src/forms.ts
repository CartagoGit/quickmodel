/**
 * @fileoverview Form-validation helpers for framework-agnostic use.
 *
 * Import from `@cartago-git/quickmodel/forms` instead of the root entry
 * to keep form-validation utilities tree-shakeable and avoid pulling in
 * the full QuickModel runtime for apps that only need lightweight validation.
 *
 * @example
 * ```ts
 * import { qGroups, qGroups5 } from '@cartago-git/quickmodel/forms';
 * ```
 *
 * @module forms
 */

export { qGroups } from './core/helpers/q-groups';
export type { IQGroupsMap } from './core/helpers/q-groups';

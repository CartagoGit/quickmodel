/**
 * Form-validation helpers for framework-agnostic use.
 *
 * Import from `quickmodel/forms` **instead of the root entry**
 * to keep these utilities tree-shakeable and avoid pulling in the full
 * QuickModel runtime for apps that only need lightweight validation.
 *
 * ## Available helpers
 *
 * | Helper | Description |
 * |---|---|
 * | {@link qGroups} | Creates a typed group-name map (spread or `as const` array). TS 4.1+. |
 * | {@link qGetGroups} | Returns the distinct `@QGroup` group names declared on an instance. |
 * | {@link qCheckRules} | Runs `@QRule` predicates on any instance—optionally filtered by group. |
 * | {@link qCheckRulesAsync} | Async version: awaits async predicates, supports timeout and serial/parallel modes. |
 * | {@link qCheckRulesByGroup} | Runs `@QRule` predicates grouped by `@QGroup` name. |
 * | {@link qCheckRulesByGroupAsync} | Async counterpart of `qCheckRulesByGroup`: awaits async predicates per group. |
 *
 * **TS 5.0+ only** (mutable array without `as const`):
 * ```ts
 * import { qGroups5 } from 'quickmodel/compat/ts5/forms';
 * const Groups = qGroups5(['identity', 'security']);
 * ```
 *
 * ## Quick-start example (Angular / any framework)
 *
 * ```ts
 * import { QRule, QGroup } from 'quickmodel';
 * import { qGroups, qCheckRules, qGetGroups, qCheckRulesByGroup, qCheckRulesByGroupAsync }
 *   from 'quickmodel/forms';
 *
 * const Groups = qGroups('identity', 'security');
 *
 * class ProfileForm {
 *   @QRule((v: string) => v.length >= 2, 'Too short')
 *   @QGroup(Groups.identity)
 *   name = '';
 *
 *   @QRule((v: string) => v.length >= 8, 'Too short')
 *   @QGroup(Groups.security)
 *   password = '';
 *
 *   validate() {
 *     return qCheckRules(this);                              // all rules
 *   }
 *   validateIdentity() {
 *     return qCheckRules(this, { group: Groups.identity });  // identity only
 *   }
 *   getGroups() {
 *     return qGetGroups(this);                              // ['identity', 'security']
 *   }
 *   validateByGroup() {
 *     return qCheckRulesByGroup(this);
 *     // { identity: { valid, errors }, security: { valid, errors } }
 *   }
 *   async validateByGroupAsync() {
 *     return qCheckRulesByGroupAsync(this);
 *     // Promise<{ identity: { valid, errors }, security: { valid, errors } }>
 *   }
 * }
 * ```
 *
 * @module forms
 */

export { qGroups } from './core/helpers/q-groups';
export type { IQGroupsMap } from './core/helpers/q-groups';

export { qGetGroups } from './core/helpers/q-get-groups';
export { qCheckRules } from './core/helpers/q-check-rules';
export type { IQCheckRulesOptions } from './core/helpers/q-check-rules';
export { qCheckRulesAsync } from './core/helpers/q-check-rules-async';
export type { IQCheckRulesAsyncOptions } from './core/helpers/q-check-rules-async';
export { qCheckRulesByGroup } from './core/helpers/q-check-rules-by-group';
export { qCheckRulesByGroupAsync } from './core/helpers/q-check-rules-by-group-async';
export type { IQRulesResult } from './core/decorators/qrule.decorator';

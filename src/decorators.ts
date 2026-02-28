/**
 * QuickModel - Lightweight Property Decorators
 *
 * Exposes the property-level and field-metadata decorators **without** the
 * full `QModel` serialization pipeline. Ideal for:
 *
 * - Form generators / UI schema builders that only need `@QField` metadata
 * - Validation-only consumers that only need `@QRule` predicates
 * - Shared DTO libraries where frontend and backend share field annotations
 *   but the frontend never instantiates `QModel`
 *
 * @example
 * ```typescript
 * // ✅ Only decorator metadata — no QModel, no serializer, no schema generators
 * import { QType, QRule, QField, QAlias, QGroup, QComputed } from 'quickmodel/decorators';
 *
 * export class UserForm {
 *   @QField({ widget: 'input', label: 'Email', required: true })
 *   @QRule((val: string) => /\S+@\S+/.test(val), 'Invalid email')
 *   declare email: string;
 *
 *   @QGroup('security')
 *   @QField({ widget: 'password', label: 'Password', required: true })
 *   @QRule((val: string) => val.length >= 8, 'Min 8 chars')
 *   declare password: string;
 * }
 * ```
 *
 * @remarks
 * `Quick` and `QConfig` are intentionally **not** exported here — they tie into
 * the `QModel` machinery. Use `import { Quick, QModel } from 'quickmodel'`
 * when you need the full serialization pipeline.
 *
 * @see {@link QField} — field-metadata decorator exported here
 * @see {@link QRule} — validation rule decorator exported here
 * @see {@link QGroup} — validation group decorator exported here
 * @module quickmodel/decorators
 */

export { QType } from './core/decorators/qtype.decorator';

export { QRule } from './core/decorators/qrule.decorator';
export type {
	IQRulesResult,
	IQRule,
	IQRulesAsyncOptions,
	IQRuleOptions,
} from './core/decorators/qrule.decorator';

export { QField } from './core/decorators/qfield.decorator';
export type {
	IQFieldMeta,
	IQFormSchemaEntry,
	IQFieldWidget,
} from './core/decorators/qfield.decorator';

export { QAlias } from './core/decorators/qalias.decorator';

export { QGroup } from './core/decorators/qgroup.decorator';
export type { IQFormSchemaGroup } from './core/decorators/qgroup.decorator';

export { QComputed } from './core/decorators/qcomputed.decorator';

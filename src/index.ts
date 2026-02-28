/**
 * QuickModel - Public API
 *
 * @module quickmodel
 * @license MIT
 */

// ============================================================================
// PUBLIC API - Core
// ============================================================================
/**
 * Helper type to enforce type consistency between a model class
 * and its input/output interfaces.
 */
export type { IQImplements } from './core/interfaces/model.interface';
export { QModel } from './core/models/quick.model';
export type {
	IQCreateManyOptions,
	IQCreateManyError,
	IQCreateManyResult,
	IQValidationReport,
} from './core/models/quick.model';

export { Quick } from './core/decorators/quick.decorator';
export { QType } from './core/decorators/qtype.decorator';
export { QRule } from './core/decorators/qrule.decorator';
export type {
	IQRulesResult,
	IQRule,
	IQRulesAsyncOptions,
} from './core/decorators/qrule.decorator';
export {
	IsEmail,
	IsUrl,
	IsNotEmpty,
	MinLength,
	MaxLength,
	Matches,
	IsUuid,
	IsDateString,
	Min,
	Max,
	IsInt,
	IsPositive,
	IsNegative,
	IsIn,
} from './core/decorators/validators';
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
export { QConfig } from './core/config/quick.config';

// ============================================================================
// PUBLIC API - Submodules (Namespaces for Documentation)
// ============================================================================

/**
 * Secondary types and interfaces.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from 'quickmodel/types';
 * ```
 */
export * as Types from './types';

/**
 * Advanced utilities and internal tools.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from 'quickmodel/advanced';
 * ```
 */
export * as Advanced from './advanced';

/**
 * Common utilities and helper types.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from 'quickmodel/utils';
 * ```
 */
export * as Utils from './utils';

/**
 * Form-validation helpers for framework-agnostic use.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from 'quickmodel/forms';
 * ```
 */
export * as Forms from './forms';

/**
 * TypeScript 5.0+ compatibility utilities.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from 'quickmodel/compat/ts5/forms';
 * ```
 */
export * as Compat from './compat/ts5/forms';

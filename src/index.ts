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
// PUBLIC API - Submodules
// Use dedicated subpath imports for granular tree-shaking:
//   import { ... } from 'quickmodel/types'
//   import { ... } from 'quickmodel/advanced'
//   import { ... } from 'quickmodel/utils'
//   import { ... } from 'quickmodel/forms'
//   import { ... } from 'quickmodel/compat/ts5/forms'
// ============================================================================

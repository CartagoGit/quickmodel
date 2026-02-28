/**
 * QuickModel - Public API
 *
 * @module quickmodel
 * @license MIT
 * @see {@link QModel} — base class for all QuickModel models
 * @see {@link Quick} — `@Quick()` class decorator that activates QuickModel features
 * @see {@link QConfig} — global configuration singleton
 */

// ============================================================================
// PUBLIC API - Core
// ============================================================================
/**
 * Helper type to enforce type consistency between a model class
 * and its input/output interfaces.
 * @see {@link QModel} — the base class this type constrains
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
export { QConfig } from './core/config/quick.config';

// ============================================================================
// PUBLIC API - Submodules
// Use dedicated subpath imports for granular tree-shaking:
//   import { ... } from 'quickmodel/decorators'   ← QType, QRule, QField, QAlias, QGroup, QComputed
//   import { ... } from 'quickmodel/validators'   ← IsEmail, IsUrl, IsNotEmpty, MinLength…
//   import { ... } from 'quickmodel/types'
//   import { ... } from 'quickmodel/advanced'
//   import { ... } from 'quickmodel/utils'
//   import { ... } from 'quickmodel/forms'
//   import { ... } from 'quickmodel/mock'
//   import { ... } from 'quickmodel/schema'
//   import { ... } from 'quickmodel/schema/zod'
//   import { ... } from 'quickmodel/compat/ts5/forms'
// ============================================================================

// ============================================================================
// PUBLIC API - Types re-exported for documentation and IDE support
// (return types of public methods and parameter types of @Quick)
// ============================================================================
export type { IQFormSchemaEntry } from './core/decorators/qfield.decorator';
export type { IQFormSchemaGroup } from './core/decorators/qgroup.decorator';
export type { IQAliasedSerializedInterface } from './core/interfaces/serialization-types.interface';
export type { IQAdvancedOptions } from './core/interfaces/quick-options.interface';

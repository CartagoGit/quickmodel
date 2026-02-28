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

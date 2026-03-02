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
	IQClassConfig,
} from './core/models/quick.model';

export { Quick } from './core/decorators/quick.decorator';
export { QConfig } from './core/config/quick.config';
export type { IQConfig } from './core/config/quick.config';

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
export type {
	IQSerializedInterface,
	IQAliasedSerializedInterface,
	IQSafeSerializedInterface,
} from './core/interfaces/serialization-types.interface';
export type { IQAdvancedOptions } from './core/interfaces/quick-options.interface';
export type { IQValidateOptions } from './core/models/quick.model';
export type {
	IHistoryEntry,
	IHistoryConfig,
	IHistoryHandle,
} from './core/interfaces/history.interface';
export type {
	IAuditEntry,
	IAuditConfig,
	IAuditHandle,
} from './core/interfaces/audit.interface';
export { QModelCollection } from './core/models/quick-collection.model';
export type {
	IQCollectionRulesResult,
	IQCSVOptions,
} from './core/models/quick-collection.model';
export { SchemaToModelService } from './core/services/schema-to-model.service';

// ============================================================================
// AUTO-REGISTRATION — backward compatibility for the main 'quickmodel' entry.
//
// Importing these sub-modules at module-initialisation time wires all schema
// generators and mock services into their respective registries, so that
// QModel.getSchema() and QModel.mock() work out of the box for consumers who
// import from 'quickmodel' (the default entry point).
//
// Consumers who import from 'quickmodel/core' instead get a lighter bundle and
// can opt-in selectively:
//
//   import { QModel } from 'quickmodel/core';
//   import 'quickmodel/schema'; // enables getSchema()
//   import 'quickmodel/mock';   // enables mock()
//
// NOTE: These files are listed in `"sideEffects"` in package.json so that
// consumer bundlers (webpack, Vite, esbuild) do NOT eliminate them even when
// their named exports are not explicitly referenced.
// ============================================================================
import './schema'; // side-effect: registers all 13 schema generators
import './mock'; // side-effect: registers QMockGenerator + QMockBuilder

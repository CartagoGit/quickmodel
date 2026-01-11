/**
 * QuickModel - Public API
 *
 * @module @cartago-git/quickmodel
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

export { Quick } from './core/decorators/quick.decorator';

// ============================================================================
// PUBLIC API - Submodules (Namespaces for Documentation)
// ============================================================================

/**
 * Secondary types and interfaces.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from '@cartago-git/quickmodel/types';
 * ```
 */
export * as Types from './types';

/**
 * Advanced utilities and internal tools.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from '@cartago-git/quickmodel/advanced';
 * ```
 */
export * as Advanced from './advanced';

/**
 * Common utilities and helper types.
 *
 * @remarks
 * Also available via subpath import:
 * ```typescript
 * import { ... } from '@cartago-git/quickmodel/utils';
 * ```
 */
export * as Utils from './utils';

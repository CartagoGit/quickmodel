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
export type { QInterface, QTransform } from './core/interfaces/model.interface';
/**
 * Base model class with automatic serialization/deserialization
 */
export { QModel } from './core/models/quick.model';

/**
 * Class decorator for automatic property type mapping
 */
export { Quick } from './core/decorators/quick.decorator';

// ============================================================================
// PUBLIC API - Type Helper Utilities
// ============================================================================

// ============================================================================
// PUBLIC API - Configuration Types
// ============================================================================

/**
 * Options type for @Quick() decorator (the type map)
 */
export type { QOptions } from './core/decorators/quick.decorator';

/**
 * Advanced options for @Quick() decorator (discriminators, etc.)
 */
export type {
	QAdvancedOptions,
	QDiscriminatorConfig,
} from './core/interfaces/quick-options.interface';

/**
 * Supported string aliases for types (e.g. 'date', 'bigint', 'regexp')
 * Useful reference for valid values in the type map.
 */
export type { IQTypeAlias as QTypeString } from './core/interfaces/qtype-symbols.interface';

// ============================================================================
// PUBLIC API - Testing Tools
// ============================================================================

export { QMockBuilder as MockBuilder } from './core/services/mock-builder.service';

// ============================================================================
// PUBLIC API - Errors
// ============================================================================

export { QModelError } from './core/errors/quickmodel.error';

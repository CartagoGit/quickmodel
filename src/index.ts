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
 * Base model class with automatic serialization/deserialization
 */
export { QModel } from './core/models/quick.model';

/**
 * Type helper for model interfaces
 */
export type { QInterface, QTransform } from './core/models/quick.model';

/**
 * Class decorator for automatic property type mapping
 */
export { Quick } from './core/decorators/quick.decorator';

/**
 * Property decorator for explicit field type specification (optional)
 */
export { QType } from './core/decorators/qtype.decorator';

// ============================================================================
// PUBLIC API - Options & Configurations
// ============================================================================

export type { IQuickOptions } from './core/decorators/quick.decorator';

/**
 * Advanced options types for @Quick() decorator
 */
export type {
	IQuickAdvancedOptions,
	DiscriminatorConfig,
	TypeGuardFunction,
} from './core/interfaces/quick-options.interface';

// ============================================================================
// PUBLIC API - Testing Tools
// ============================================================================

export { MockBuilder } from './core/services/mock-builder.service';
export type {
	MockGenerator,
	MockType,
} from './core/services/mock-generator.service';

export type {
	QModelInstance,
	QModelInterface,
} from './core/interfaces/mock-types.interface';

// ============================================================================
// PUBLIC API - Advanced / Extensions
// ============================================================================

// Registry (For advanced custom transformers)
export { TransformerRegistry } from './core/registry/transformer.registry';
export type { TransformerKey } from './core/registry/transformer.registry';
export type { IQTransformer } from './core/interfaces/transformer.interface';

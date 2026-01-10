/**
 * QuickModel - Public API
 *
 * @module @cartago-git/quickmodel
 * @license MIT
 */

// ============================================================================
// PUBLIC API - Only these exports
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
// TYPES & INTERFACES - Supporting types
// ============================================================================

export type {
	IQuickOptions,
	ISpec,
	ISpecs,
} from './core/decorators/quick.decorator';

export type {
	ExtractConstructors,
	ExtractValidDiscriminatorKeys,
	ExtractCommonKeys,
	ExtractQModelInterface,
	ExtractInstanceType,
} from './core/interfaces/quick-options.interface';

export type {
	QTypeString,
	INativeFactory,
} from './core/decorators/qtype.decorator';

export type {
	SerializedInterface,
	ModelData,
	Serialized,
} from './core/interfaces/serialization-types.interface';

export { MockBuilder } from './core/services/mock-builder.service';
export type {
	MockGenerator,
	MockType,
} from './core/services/mock-generator.service';

export type {
	QModelInstance,
	QModelInterface,
} from './core/interfaces/mock-types.interface';

// Registry (For advanced custom transformers)
export { TransformerRegistry } from './core/registry/transformer.registry';
export type { TransformerKey } from './core/registry/transformer.registry';
export type {
	ITransformer,
	IQTransformer,
} from './core/interfaces/transformer.interface';

/**
 * Advanced options types for @Quick() decorator
 */
export type {
	IQuickAdvancedOptions,
	DiscriminatorConfig,
	TypeGuardFunction,
} from './core/interfaces/quick-options.interface';

/**
 * QuickModel - Public API
 * 
 * @package @cartago-git/quickmodel
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
export type { QInterface } from './core/models/quick.model';

/**
 * Class decorator for automatic property type mapping
 */
export { Quick } from './core/decorators/quick.decorator';

/**
 * Property decorator for explicit field type specification (optional)
 */
export { QType } from './core/decorators/qtype.decorator';

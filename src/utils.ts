/**
 * QuickModel Utils — secondary entry point.
 *
 * Exports utilities, error classes, and helpers useful for advanced
 * integrations: `@QType` property decorator, `QMockBuilder` for typed
 * test-data generation, `QModelError` for error handling, and `QLogger`
 * for conditional debug logging that respects `QConfig.enableDebugLogs`.
 *
 * @module quickmodel/utils
 * @see {@link QType} — `@QType` property decorator re-exported here
 * @see {@link QModelError} — error class for QuickModel exceptions
 * @see {@link QMockBuilder} — fluent mock-data builder
 * @see {@link Logger} — internal debug logger exported here as `QLogger`
 */

export { QType } from './core/decorators/qtype.decorator';
export { QModelError } from './core/errors/quickmodel.error';
export { QMockBuilder } from './core/services/mock-builder.service';

/**
 * Internal debug logger. Respects the `enableDebugLogs` flag from `QConfig`
 * and from individual model `@Quick()` options.
 *
 * Useful when building custom transformers or integrations to emit debug
 * output that follows the same verbosity controls as the rest of QuickModel.
 *
 * @example
 * ```typescript
 * import { QLogger } from 'quickmodel/utils';
 *
 * QLogger.debug('Transforming value', MyModel, rawValue);
 * QLogger.warn('Unexpected null in required field', MyModel);
 * ```
 */
export { Logger as QLogger } from './core/helpers/logger.helper';

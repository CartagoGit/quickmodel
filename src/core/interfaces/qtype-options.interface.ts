import type { IQPropertyOptions } from './transform-options.interface';

/**
 * Options accepted by the `@QType()` property decorator.
 *
 * Provides fine-grained control over how a single property is transformed,
 * serialized, and mocked, without requiring class-level `@Quick()` configuration.
 *
 * @remarks
 * All fields are optional. When a field is supplied it overrides QuickModel's
 * built-in logic for the corresponding operation on this specific property only.
 *
 * @see {@link IQPropertyOptions} for the base fields (`transformer`, `serializer`, `mocker`)
 * @see {@link IQAdvancedOptions} for the equivalent at class / `@Quick()` level
 */
export interface IQTypeOptions extends IQPropertyOptions {}

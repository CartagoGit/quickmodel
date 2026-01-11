/**
 * QuickModel - Secondary Types
 *
 * This entry point exports internal interfaces and types that are part of the
 * public API surface (e.g. return types) but not main library features.
 *
 * @module @cartago-git/quickmodel/types
 */

// Core Interfaces
export type { IQAnyRecord } from './core/interfaces/model.interface';
export type {
	IQTypeGuardFunction,
	IQExtractConstructors,
	IQExtractValidDiscriminatorKeys,
	IQExtractCommonKeys,
	IQExtractIQModelInterface,
	IQExtractInstanceType,
} from './core/interfaces/quick-options.interface';
export type {
	IQTypeSpec,
	IQConstructor,
	IQSpec,
	IQSpecs,
	IQTransformerFunction,
} from './core/interfaces/quick.interface';
export type { IQNativeConstructor } from './core/constants/native-types';

// Serialization Types
export type {
	IQSerializedInterface,
	IQModelData,
	IQSerialized,
} from './core/interfaces/serialization-types.interface';

// Validation Types
export type {
	IQValidationResult,
	IQTransformer as IQTransformer,
} from './core/interfaces/transformer.interface';

// Mock Types
export type {
	IQModelInstance,
	IQModelInterface,
} from './core/interfaces/mock-types.interface';

// Options
export type { IQSerializationOptions } from './core/interfaces/serializer.interface';
export type { IQMockType } from './core/services/mock-generator.service';

// Transform Options
export type { IQPropertyOptions } from './core/interfaces/transform-options.interface';

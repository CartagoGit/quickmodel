/**
 * QuickModel - Secondary Types
 *
 * This entry point exports internal interfaces and types that are part of the
 * public API surface (e.g. return types) but not main library features.
 *
 * @module @cartago-git/quickmodel/types
 */

// Core Interfaces
export type { AnyRecord } from './core/interfaces/model.interface';
export type {
	TypeGuardFunction,
	ExtractConstructors,
	ExtractValidDiscriminatorKeys,
	ExtractCommonKeys,
	ExtractQModelInterface,
	ExtractInstanceType,
} from './core/interfaces/quick-options.interface';
export type {
	QTypeSpec,
	IConstructor,
	ISpec,
	ISpecs,
	ITransformerFunction,
} from './core/interfaces/quick.interface';
export type { INativeConstructor } from './core/constants/native-types';

// Serialization Types
export type {
	SerializedInterface,
	ModelData,
	Serialized,
} from './core/interfaces/serialization-types.interface';

// Validation Types
export type {
	IQValidationResult,
	IQTransformer as ITransformer,
} from './core/interfaces/transformer.interface';

// Mock Types
export type {
	QModelInstance,
	QModelInterface,
} from './core/interfaces/mock-types.interface';

// Options
export type { ISerializationOptions } from './core/interfaces/serializer.interface';
export type { MockType } from './core/services/mock-generator.service';

// Transform Options
export type { QPropertyOptions } from './core/interfaces/transform-options.interface';

/**
 * QuickModel - Secondary Types
 *
 * This entry point exports internal interfaces and types that are part of the
 * public API surface (e.g. return types) but not main library features.
 *
 * @module quickmodel/types
 * @see {@link IQSerializationOptions} — options for `QModel.serialize()`
 * @see {@link IQConfig} — global configuration shape
 * @see {@link IQMockType} — mock generation strategy enum values
 * @see {@link IQTransformer} — interface for custom transformers
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
	IQAliasedSerializedInterface,
	IQAliasInput,
	IQModelData,
	IQSerialized,
} from './core/interfaces/serialization-types.interface';

// Integrity Types
export type {
	IQIntegrityResult,
	IQTransformer as IQTransformer,
	IQTransformContext,
	IQIntegrityContext,
} from './core/interfaces/transformer.interface';
export type { IQTransformerKey } from './core/registry/transformer.registry';

// Mock Types
export type {
	IQModelInstance,
	IQModelInterface,
} from './core/interfaces/mock-types.interface';

// Options
export type { IQSerializationOptions } from './core/interfaces/serializer.interface';
export type { IQMockType } from './core/services/mock-generator.service';
export type {
	IQConfig,
	IQTraceVerbosity,
	IQTraceEvent,
	IQTraceEntry,
	IQTraceColorize,
	IQTraceColorizeSegment,
} from './core/config/quick.config';

// Transform Options
export type { IQPropertyOptions } from './core/interfaces/transform-options.interface';

// Moved from utils
export type { IQTypeOptions } from './core/interfaces/qtype-options.interface';
export type { IQOptions } from './core/decorators/quick.decorator';
export type {
	IQAdvancedOptions,
	IQDiscriminatorConfig,
} from './core/interfaces/quick-options.interface';
export type {
	IQTransformerFn,
	IQSerializerFn,
	IQMockerFn,
} from './core/interfaces/transform-options.interface';
export type { IQAlias } from './core/types/q-alias.type';
export type { IQCaseOptions, ICaseType } from './core/types/case.type';
export type { IRecursiveDeserializer } from './core/services/value-transformer.service';
export type { IQSchemaType } from './core/types/schema-types';
export type {
	IQSerializer,
	IQDeserializer,
} from './core/interfaces/serializer.interface';
export type { ISchemaGeneratorConfig } from './core/services/schema-generators.service';
export type { IQRuleOptions } from './core/decorators/qrule.decorator';

// FormData Types (Propuesta G — Capa 3)
export type {
	IFileSourceMode,
	IFileModeOutput,
	IFromFormDataOptions,
	IToFormDataOptions,
} from './core/helpers/form-data.helpers';
export type { IQSpoofMethod } from './core/types/form-data.type';

// Streaming Types (Propuesta G — Capa 4)
export type {
	IToReadableStreamSingleField,
	IToReadableStreamMultipart,
	IToReadableStreamOptions,
	IQMultipartStream,
	IModelToMultipartStreamOptions,
	IFromStreamOptions,
	IPipeStreamOptions,
} from './core/helpers/stream.helpers';

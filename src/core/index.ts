// Public Core API

// Models
export { QModel } from './models/quick.model';

// Decorators
export { Quick } from './decorators/quick.decorator';
export { QType } from './decorators/qtype.decorator';

// Interfaces
export type {
	IQTransformer,
	IQTransformerKey,
	IQIntegrityChecker,
	IQTransformContext,
	IQIntegrityContext,
	IQIntegrityResult,
} from './interfaces/transformer.interface';
export type {
	IQAnyRecord,
	IModelConstructor,
	IQTransform,
	IQImplements,
} from './interfaces/model.interface';
export type {
	IQSerializationOptions,
	IQSerializer,
	IQDeserializer,
} from './interfaces/serializer.interface';

// Registry
export { QTransformerRegistry } from './registry/transformer.registry';

// Bases
// QBaseTransformer is the public alias; BaseTransformer is kept for internal use.
export {
	BaseTransformer,
	BaseTransformer as QBaseTransformer,
} from './bases/base-transformer';

// Services (Advanced usage) — raw pipeline access
// QSerializer / QDeserializer are the public aliases following Q convention.
export {
	Serializer,
	Serializer as QSerializer,
} from './services/serializer.service';
export {
	Deserializer,
	Deserializer as QDeserializer,
} from './services/deserializer.service';

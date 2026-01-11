/**
 * QuickModel Utils
 * Secondary utilities, decorators, and types not essential for basic usage but useful for advanced scenarios or specific typing.
 */

export { QType } from './core/decorators/qtype.decorator';
export type { IQTypeOptions } from './core/interfaces/qtype-options.interface';

export { QModelError } from './core/errors/quickmodel.error';
export { QQMockBuilder as QMockBuilder } from './core/services/mock-builder.service';

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

export type { IQTransform } from './core/interfaces/model.interface';

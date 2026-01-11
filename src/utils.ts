/**
 * QuickModel Utils
 * Secondary utilities, decorators, and types not essential for basic usage but useful for advanced scenarios or specific typing.
 */

export { QType } from './core/decorators/qtype.decorator';
export type { QTypeOptions } from './core/interfaces/qtype-options.interface';

export { QModelError } from './core/errors/quickmodel.error';
export { QQMockBuilder as QMockBuilder } from './core/services/mock-builder.service';

export type { QOptions } from './core/decorators/quick.decorator';
export type {
	QAdvancedOptions,
	QDiscriminatorConfig,
} from './core/interfaces/quick-options.interface';

export type {
	QTransformerFn,
	QSerializerFn,
	QMockerFn,
} from './core/interfaces/transform-options.interface';

export type { QAlias } from './core/types/q-alias.type';

export type { QTransform } from './core/interfaces/model.interface';

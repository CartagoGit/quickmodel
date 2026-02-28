/**
 * QuickModel - Advanced Utilities
 *
 * This entry point exports runtime classes and utilities intended for advanced usage,
 * plugins, or custom integrations.
 *
 * @see {@link QTransformerRegistry} — register custom transformers
 * @see {@link QBaseTransformer} — base class for building custom transformers
 * @see {@link QModel} — the core model class exposed via the root entry point
 *
 * @module quickmodel/advanced
 */

export { QMockGenerator } from './core/services/mock-generator.service';
export { QTransformerRegistry } from './core/registry/transformer.registry';
export { QModelConfigService } from './core/config/quick.config';
export { IntegrityService } from './core/services/integrity.service';

/**
 * Abstract base class for building custom transformers with full type safety.
 *
 * Extend this class to create your own transformer and register it via `QTransformerRegistry`.
 *
 * @example
 * ```typescript
 * import { QBaseTransformer } from 'quickmodel/advanced';
 *
 * class MoneyTransformer extends QBaseTransformer<string, Money> {
 *   deserialize(value: string | null | undefined): Money | null {
 *     if (!value) return null;
 *     const [amount, currency] = value.split(':');
 *     return new Money(Number(amount), currency);
 *   }
 *   serialize(value: Money): string {
 *     return `${value.amount}:${value.currency}`;
 *   }
 * }
 * ```
 * @see {@link QTransformerRegistry} — register your custom transformer here
 * @see {@link IQTransformer} — interface that custom transformers implement
 */
export { BaseTransformer as QBaseTransformer } from './core/bases/base-transformer';

/**
 * Low-level serializer service.
 * Converts a QuickModel instance to a JSON-compatible plain object.
 * Use this when you need direct control over the serialization pipeline
 * without going through a full model instance.
 *
 * @example
 * ```typescript
 * import { QSerializer } from 'quickmodel/advanced';
 *
 * const serializer = new QSerializer();
 * const plain = serializer.serialize(myModelInstance);
 * ```
 * @see {@link QModel.serialize} — high-level API wrapping this service
 * @see {@link QDeserializer} — inverse service
 */
export { Serializer as QSerializer } from './core/services/serializer.service';

/**
 * Low-level deserializer service.
 * Converts a plain JSON-compatible object into a typed QuickModel instance.
 * Use this when you need direct control over the deserialization pipeline.
 *
 * @example
 * ```typescript
 * import { QDeserializer } from 'quickmodel/advanced';
 *
 * const deserializer = new QDeserializer();
 * const instance = deserializer.deserialize(UserModel, rawData);
 * ```
 * @see {@link QModel.create} — high-level API wrapping this service
 * @see {@link QSerializer} — inverse service
 */
export { Deserializer as QDeserializer } from './core/services/deserializer.service';

// ============================================================================
// Schema Generators
// Generates schemas in different external formats from QuickModel metadata.
// ============================================================================

/**
 * Generates a JSON Schema Draft-07 document from a model's decorator configuration.
 * @see {@link QMongoSchemaGenerator} — MongoDB schema variant
 * @see {@link QZodSchemaGenerator} — Zod schema variant
 */
export { JsonSchemaGenerator as QJsonSchemaGenerator } from './core/services/schema-generators.service';

/**
 * Generates a Zod validation schema from a model's decorator configuration.
 * @see {@link QJsonSchemaGenerator} — JSON Schema variant
 */
export { ZodSchemaGenerator as QZodSchemaGenerator } from './core/services/zod-schema-generator.service';

/**
 * Generates a Mongoose/MongoDB schema definition from a model's decorator configuration.
 * @see {@link QJsonSchemaGenerator} — JSON Schema variant
 */
export { MongoSchemaGenerator as QMongoSchemaGenerator } from './core/services/schema-generators.service';

/**
 * Generates a TypeScript interface string from a model's decorator configuration.
 * @see {@link QJsonSchemaGenerator} — JSON Schema variant
 */
export { TypeScriptSchemaGenerator as QTypeScriptSchemaGenerator } from './core/services/schema-generators.service';

/**
 * Generates a GraphQL type definition string from a model's decorator configuration.
 * @see {@link QOpenAPISchemaGenerator} — OpenAPI schema variant
 * @see {@link QJsonSchemaGenerator} — JSON Schema variant
 */
export { GraphQLSchemaGenerator as QGraphQLSchemaGenerator } from './core/services/schema-generators.service';

/**
 * Generates an OpenAPI 3.0 schema component from a model's decorator configuration.
 * @see {@link QGraphQLSchemaGenerator} — GraphQL schema variant
 * @see {@link QMongoSchemaGenerator} — MongoDB schema variant
 */
export { OpenAPISchemaGenerator as QOpenAPISchemaGenerator } from './core/services/schema-generators.service';

/**
 * Generates an AJV-compatible validation schema from a model's decorator configuration.
 * @see {@link QJsonSchemaGenerator} — standard JSON Schema variant
 */
export { AjvSchemaGenerator as QAjvSchemaGenerator } from './core/services/schema-generators.service';

/**
 * Generates a Prisma `model` block string from a model's decorator configuration.
 * Useful for scaffolding Prisma schema files from QuickModel definitions.
 * @see {@link QModel.getSchema} via `getSchema('prisma')`
 */
export { PrismaSchemaGenerator as QPrismaSchemaGenerator } from './core/services/prisma-schema-generator.service';

/**
 * Generates a Valibot v1.x schema source string from a model's decorator configuration.
 * @see {@link QYupSchemaGenerator} — Yup schema equivalent
 */
export { ValibotSchemaGenerator as QValibotSchemaGenerator } from './core/services/valibot-schema-generator.service';

/**
 * Generates a Yup schema source string from a model's decorator configuration.
 * @see {@link QValibotSchemaGenerator} — Valibot schema equivalent
 */
export { YupSchemaGenerator as QYupSchemaGenerator } from './core/services/yup-schema-generator.service';

/**
 * QuickModel - Advanced Utilities
 *
 * This entry point exports runtime classes and utilities intended for advanced usage,
 * plugins, or custom integrations.
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
 */
export { Deserializer as QDeserializer } from './core/services/deserializer.service';

// ============================================================================
// Schema Generators
// Generates schemas in different external formats from QuickModel metadata.
// ============================================================================

/** Generates a JSON Schema Draft-07 document from a model's decorator configuration. */
export { JsonSchemaGenerator as QJsonSchemaGenerator } from './core/services/schema-generators.service';

/** Generates a Zod validation schema from a model's decorator configuration. */
export { ZodSchemaGenerator as QZodSchemaGenerator } from './core/services/zod-schema-generator.service';

/** Generates a Mongoose/MongoDB schema definition from a model's decorator configuration. */
export { MongoSchemaGenerator as QMongoSchemaGenerator } from './core/services/schema-generators.service';

/** Generates a TypeScript interface string from a model's decorator configuration. */
export { TypeScriptSchemaGenerator as QTypeScriptSchemaGenerator } from './core/services/schema-generators.service';

/** Generates a GraphQL type definition string from a model's decorator configuration. */
export { GraphQLSchemaGenerator as QGraphQLSchemaGenerator } from './core/services/schema-generators.service';

/** Generates an OpenAPI 3.0 schema component from a model's decorator configuration. */
export { OpenAPISchemaGenerator as QOpenAPISchemaGenerator } from './core/services/schema-generators.service';

/** Generates an AJV-compatible validation schema from a model's decorator configuration. */
export { AjvSchemaGenerator as QAjvSchemaGenerator } from './core/services/schema-generators.service';

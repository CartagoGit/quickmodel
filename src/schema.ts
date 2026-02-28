/**
 * QuickModel Schema — dedicated schema-generation entry point.
 *
 * Exposes all schema generators (JSON, Zod, Mongo, TypeScript, GraphQL, OpenAPI, AJV)
 * without pulling in mock generation, the serializer pipeline, or QModel itself.
 *
 * `zod` is loaded lazily via `createRequire` — it will NOT appear in the consumer's
 * bundle unless `ZodSchemaGenerator.generate()` is actually called.
 *
 * @example
 * ```typescript
 * // ✅ All schema generators — no mock, no serializer, no QModel
 * import { JsonSchemaGenerator, ZodSchemaGenerator } from 'quickmodel/schema';
 *
 * // ✅ Only the Zod generator (even lighter, dedicated subpath)
 * import { ZodSchemaGenerator } from 'quickmodel/schema/zod';
 * ```
 *
 * @remarks
 * Individual generators are also accessible via `quickmodel/advanced`,
 * and via `QModel.getSchema(type)` on any model instance.
 *
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 generator exported here
 * @see {@link ZodSchemaGenerator} — Zod validation schema generator exported here
 * @see {@link QModel.getSchema} — model-instance API that delegates to these generators
 * @module quickmodel/schema
 */

export {
	JsonSchemaGenerator,
	MongoSchemaGenerator,
	TypeScriptSchemaGenerator,
	GraphQLSchemaGenerator,
	OpenAPISchemaGenerator,
	AjvSchemaGenerator,
	type ISchemaGeneratorConfig,
} from './core/services/schema-generators.service';

// Zod generator re-exported here for a single convenient import.
// `zod` is loaded lazily on first call — see zod-schema-generator.service.ts.
export { ZodSchemaGenerator } from './core/services/zod-schema-generator.service';

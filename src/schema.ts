/**
 * QuickModel Schema — dedicated schema-generation entry point.
 *
 * Exposes all schema generators (JSON, Zod, Mongo, TypeScript, GraphQL, OpenAPI, AJV,
 * Prisma, Valibot, Yup, Drizzle, TypeBox, Effect Schema) without pulling in mock
 * generation, the serializer pipeline, or QModel itself.
 *
 * **Side-effect on import**: automatically registers all generators into the
 * `SchemaRegistry` so that `QModel.getSchema()` works without any additional setup.
 * This side-effect is intentional and is preserved even when the named exports are
 * not referenced (the file is listed in `"sideEffects"` in `package.json`).
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
 *
 * // ✅ Light core + opt-in schema support
 * import { QModel } from 'quickmodel/core';
 * import 'quickmodel/schema'; // enables QModel.getSchema()
 * ```
 *
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 generator exported here
 * @see {@link ZodSchemaGenerator} — Zod validation schema generator exported here
 * @see {@link QModel.getSchema} — model-instance API that delegates to these generators
 * @module quickmodel/schema
 */

import {
	registerSchemaGenerator,
	registerAddExamplesFn,
} from './core/helpers/schema-registry';

export {
	JsonSchemaGenerator,
	MongoSchemaGenerator,
	TypeScriptSchemaGenerator,
	GraphQLSchemaGenerator,
	OpenAPISchemaGenerator,
	AjvSchemaGenerator,
	PrismaSchemaGenerator,
	ValibotSchemaGenerator,
	YupSchemaGenerator,
	DrizzleSchemaGenerator,
	TypeBoxSchemaGenerator,
	type ISchemaGeneratorConfig,
} from './core/services/schema-generators.service';

// Zod generator re-exported here for a single convenient import.
// `zod` is loaded lazily on first call — see zod-schema-generator.service.ts.
export { ZodSchemaGenerator } from './core/services/zod-schema-generator.service';

// Effect Schema generator — pure string composition, no external deps.
export { EffectSchemaGenerator } from './core/services/effect-schema-generator.service';

// ─── Auto-registration ────────────────────────────────────────────────────────
// Importing this module automatically wires all generators into the registry,
// so QModel.getSchema() works out of the box when 'quickmodel/schema' is imported.
// The import() of each generator module is already resolved above (static imports),
// so there is no extra cost here — just function registrations at module init time.
import {
	JsonSchemaGenerator as _Json,
	MongoSchemaGenerator as _Mongo,
	TypeScriptSchemaGenerator as _TS,
	GraphQLSchemaGenerator as _GraphQL,
	OpenAPISchemaGenerator as _OpenAPI,
	AjvSchemaGenerator as _Ajv,
	PrismaSchemaGenerator as _Prisma,
	ValibotSchemaGenerator as _Valibot,
	YupSchemaGenerator as _Yup,
	DrizzleSchemaGenerator as _Drizzle,
	TypeBoxSchemaGenerator as _TypeBox,
} from './core/services/schema-generators.service';
import { ZodSchemaGenerator as _Zod } from './core/services/zod-schema-generator.service';
import { EffectSchemaGenerator as _Effect } from './core/services/effect-schema-generator.service';

registerSchemaGenerator('json', (cfg) => _Json.generate(cfg));
registerSchemaGenerator('mongo', (cfg) => _Mongo.generate(cfg));
registerSchemaGenerator('typescript', (cfg) => _TS.generate(cfg));
registerSchemaGenerator('graphql', (cfg) => _GraphQL.generate(cfg));
registerSchemaGenerator('openapi', (cfg) => _OpenAPI.generate(cfg));
registerSchemaGenerator('ajv', (cfg) => _Ajv.generate(cfg));
registerSchemaGenerator('prisma', (cfg) => _Prisma.generate(cfg));
registerSchemaGenerator('valibot', (cfg) => _Valibot.generate(cfg));
registerSchemaGenerator('yup', (cfg) => _Yup.generate(cfg));
registerSchemaGenerator('drizzle', (cfg) => _Drizzle.generate(cfg));
registerSchemaGenerator('typebox', (cfg) => _TypeBox.generate(cfg));
registerSchemaGenerator('zod', (cfg) => _Zod.generate(cfg));
registerSchemaGenerator('effect-schema', (cfg) => _Effect.generate(cfg));

// Register the addExamples helper for JSON/OpenAPI instance-level schemas.
registerAddExamplesFn((schema, instance) =>
	_Json.addExamples(schema, instance)
);

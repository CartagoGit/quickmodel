/**
 * Schema type definitions for `QModel.getSchema()`.
 * @see {@link QModel.getSchema} — the method that accepts `IQSchemaFormat` as argument
 * @see {@link JsonSchemaGenerator} — one of the generators invoked via this module
 */

/**
 * The ten schema formats supported by `QModel.getSchema()` / `get_model_schema` MCP tool.
 *
 * | Value | Generator | Output |
 * |---|---|---|
 * | `'json'` | `JsonSchemaGenerator` | JSON Schema Draft-07 object |
 * | `'zod'` | `ZodSchemaGenerator` | Zod `z.object(…)` source string |
 * | `'mongo'` | `MongoSchemaGenerator` | Mongoose schema-definition object |
 * | `'typescript'` | `TypeScriptSchemaGenerator` | TypeScript `interface` source string |
 * | `'graphql'` | `GraphQLSchemaGenerator` | GraphQL SDL `type` block string |
 * | `'openapi'` | `OpenAPISchemaGenerator` | OpenAPI 3.0 component schema object |
 * | `'ajv'` | `AjvSchemaGenerator` | AJV-compatible JSON Schema object |
 * | `'prisma'` | `PrismaSchemaGenerator` | Prisma `model` block string |
 * | `'valibot'` | `ValibotSchemaGenerator` | Valibot v1.x `v.object(…)` source string |
 * | `'yup'` | `YupSchemaGenerator` | Yup `yup.object(…)` source string |
 *
 * @see {@link JsonSchemaGenerator}
 * @see {@link OpenAPISchemaGenerator}
 * @see {@link ZodSchemaGenerator}
 * @see {@link PrismaSchemaGenerator}
 * @see {@link ValibotSchemaGenerator}
 * @see {@link YupSchemaGenerator}
 * @see {@link QModel.getSchema} — model-instance API that accepts this type
 */
export type IQSchemaType =
	| 'json' // JSON Schema Draft-07
	| 'zod' // Zod validation schema
	| 'mongo' // MongoDB/Mongoose schema
	| 'typescript' // TypeScript interface string
	| 'graphql' // GraphQL SDL type definition
	| 'openapi' // OpenAPI 3.0 schema
	| 'ajv' // AJV validator schema
	| 'prisma' // Prisma model block string
	| 'valibot' // Valibot v1.x schema source string
	| 'yup'; // Yup schema source string

/**
 * Schema type definitions for `QModel.getSchema()`.
 */

/**
 * The seven schema formats supported by `QModel.getSchema()` / `get_model_schema` MCP tool.
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
 *
 * @see {@link JsonSchemaGenerator}
 * @see {@link OpenAPISchemaGenerator}
 * @see {@link ZodSchemaGenerator}
 */
export type IQSchemaType =
	| 'json' // JSON Schema Draft-07
	| 'zod' // Zod validation schema
	| 'mongo' // MongoDB/Mongoose schema
	| 'typescript' // TypeScript interface string
	| 'graphql' // GraphQL SDL type definition
	| 'openapi' // OpenAPI 3.0 schema
	| 'ajv'; // AJV validator schema

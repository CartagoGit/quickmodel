/**
 * Schema type definitions for `QModel.getSchema()`.
 * @see {@link QModel.getSchema} — the method that accepts `IQSchemaFormat` as argument
 * @see {@link JsonSchemaGenerator} — one of the generators invoked via this module
 */

/**
 * The **thirteen** schema formats supported by `QModel.getSchema()` / `get_model_schema` MCP tool.
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
 * | `'drizzle'` | `DrizzleSchemaGenerator` | Drizzle ORM `pgTable(…)` source string |
 * | `'typebox'` | `TypeBoxSchemaGenerator` | TypeBox `Type.Object(…)` source string |
 * | `'effect-schema'` | `EffectSchemaGenerator` | Effect.ts `Schema.Struct(…)` source string |
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
	| 'yup' // Yup schema source string
	| 'drizzle' // Drizzle ORM pgTable source string
	| 'typebox' // TypeBox Type.Object(…) source string
	| 'effect-schema'; // Effect.ts Schema.Struct(…) source string

/**
 * Maps each `IQSchemaType` to the concrete TypeScript type returned by `QModel.getSchema()`.
 *
 * | Format | Return type | Notes |
 * |---|---|---|
 * | `'json'`, `'openapi'`, `'mongo'`, `'ajv'` | `Record<string, unknown>` | Plain schema objects |
 * | `'zod'` | `import('zod').ZodObject<any>` | Live Zod validator |
 * | All others | `string` | Generated source-code strings |
 *
 * @example
 * ```typescript
 * const json = User.getSchema('json');   // Record<string, unknown>
 * const zod  = User.getSchema('zod');    // ZodObject<any>
 * const ts   = User.getSchema('typescript'); // string
 * ```
 *
 * @see {@link IQSchemaType} — the accepted format literals
 * @see {@link QModel.getSchema} — the method that uses this mapping
 */
export type IQSchemaReturnType<T extends IQSchemaType> = T extends
	| 'json'
	| 'openapi'
	| 'mongo'
	| 'ajv'
	? Record<string, unknown>
	: T extends 'zod'
		? import('zod').ZodObject<any>
		: string;

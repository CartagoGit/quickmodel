/**
 * Schema type definitions for QModel.getSchema()
 */

/**
 * Available schema types for generation
 */
export type IQSchemaType =
	| 'json' // JSON Schema Draft-07
	| 'zod' // Zod validation schema
	| 'mongo' // MongoDB/Mongoose schema
	| 'typescript' // TypeScript interface string
	| 'graphql' // GraphQL SDL type definition
	| 'openapi' // OpenAPI 3.0 schema
	| 'ajv'; // AJV validator schema

/**
 * Schema generators for different formats
 *
 * Each generator implements a specific schema format generation
 * following Single Responsibility Principle
 *
 * Note: `ZodSchemaGenerator` lives in `./zod-schema-generator.service` so that
 * `zod` is NOT included in the static import graph of consumers that never call
 * `getSchema('zod')`. It is re-exported here for backward compatibility.
 *
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 generator
 * @see {@link MongoSchemaGenerator} — Mongoose schema generator
 * @see {@link TypeScriptSchemaGenerator} — TypeScript interface generator
 */

// Re-export so existing imports from this barrel continue to work.
export { ZodSchemaGenerator } from '@/core/services/zod-schema-generator.service';
export { PrismaSchemaGenerator } from '@/core/services/prisma-schema-generator.service';
export { ValibotSchemaGenerator } from '@/core/services/valibot-schema-generator.service';
export { YupSchemaGenerator } from '@/core/services/yup-schema-generator.service';

/**
 * Base schema generator configuration
 * @see {@link JsonSchemaGenerator} — uses this for JSON Schema generation
 * @see {@link MongoSchemaGenerator} — uses this for Mongoose schema generation
 */
export interface ISchemaGeneratorConfig {
	/** Simple name of the model class (e.g. `'User'`). Used as the schema title. */
	className: string;
	/** Map of property name → transformer token (function, constructor, or string alias). */
	decoratorConfig: Record<string, any>;
	/** Ordered list of property names to include in the generated schema. */
	properties: string[];
}

/**
 * Generates a JSON Schema Draft-07 document from QuickModel decorator configuration.
 *
 * Maps QuickModel type specs to standard JSON Schema types:
 * `Date` → `{ type: 'string', format: 'date-time' }`, `BigInt` → `{ type: 'string', pattern: … }`,
 * `Set` → `{ type: 'array', uniqueItems: true }`, etc.
 *
 * @see {@link ISchemaGeneratorConfig} for the input shape.
 * @see {@link MongoSchemaGenerator} — Mongoose schema definition equivalent
 * @see {@link ZodSchemaGenerator} — Zod schema equivalent
 * @see {@link TypeScriptSchemaGenerator} — TypeScript interface string equivalent
 *
 * @example
 * ```ts
 * const schema = JsonSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { name: String, age: Number, createdAt: Date },
 *   properties: ['name', 'age', 'createdAt'],
 * });
 * // {
 * //   $schema: 'http://json-schema.org/draft-07/schema#',
 * //   type: 'object',
 * //   title: 'User',
 * //   properties: {
 * //     name: { type: 'string' },
 * //     age:  { type: 'number' },
 * //     createdAt: { type: 'string', format: 'date-time' },
 * //   },
 * //   required: ['name', 'age', 'createdAt'],
 * // }
 * ```
 */
export class JsonSchemaGenerator {
	/**
	 * Generates a JSON Schema Draft-07 document.
	 *
	 * @param config - Class name, type-map, and property list
	 * @returns A JSON Schema Draft-07–compatible plain object with `$schema`, `type: 'object'`,
	 *   `properties`, and `required` fields
	 * @see {@link addExamples} — enrich the generated schema with example values
	 * @see {@link MongoSchemaGenerator.generate} — equivalent for Mongoose schemas
	 */
	static generate(config: ISchemaGeneratorConfig): Record<string, any> {
		const { className, decoratorConfig, properties } = config;

		const schema: Record<string, any> = {
			$schema: 'http://json-schema.org/draft-07/schema#',
			type: 'object',
			title: className,
			properties: {},
			required: [],
		};

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			schema.properties[prop] = this._getJsonSchemaType(transformer);
			schema.required.push(prop);
		}

		return schema;
	}

	/**
	 * Maps a transformer token to a JSON Schema type descriptor.
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns JSON Schema-compatible type descriptor object
	 */
	private static _getJsonSchemaType(transformer: any): Record<string, any> {
		if (!transformer) {
			return { type: 'string' }; // Default
		}

		// Handle array notation: [String], [Date], [Number], [MyClass], etc.
		if (Array.isArray(transformer)) {
			const itemTransformer = transformer[0];
			const itemSchema = itemTransformer
				? this._getJsonSchemaType(itemTransformer)
				: { type: 'string' };
			return { type: 'array', items: itemSchema };
		}

		const transformerName =
			typeof transformer === 'function'
				? transformer.name
				: String(transformer);

		switch (transformerName.toLowerCase()) {
			case 'number':
				return { type: 'number' };
			case 'string':
				return { type: 'string' };
			case 'boolean':
				return { type: 'boolean' };
			case 'object':
				return { type: 'object' };
			case 'date':
				return { type: 'string', format: 'date-time' };
			case 'bigint':
				return { type: 'string', pattern: '^-?\\d+$' };
			case 'set':
				return {
					type: 'array',
					items: { type: 'string' },
					uniqueItems: true,
				};
			case 'map':
				return {
					type: 'array',
					items: {
						type: 'array',
						minItems: 2,
						maxItems: 2,
					},
				};
			case 'array':
				return {
					type: 'array',
					items: { type: 'any' },
				};
			default:
				return { type: 'string' };
		}
	}

	/**
	 * Enriches an existing JSON Schema object with `example` values derived from
	 * a model instance.
	 *
	 * Skips properties whose names begin with `'_'` (internal convention).
	 * Special types are coerced before writing: `Date` → ISO string, `Set` / `Map`
	 * → array, `bigint` → string.
	 *
	 * @param schema - A JSON Schema object previously produced by {@link generate}
	 * @param instance - A model instance whose runtime values will become `example` entries
	 * @returns A deep-cloned copy of `schema` with `example` fields added
	 */
	static addExamples(
		schema: Record<string, any>,
		instance: any
	): Record<string, any> {
		const enhanced = JSON.parse(JSON.stringify(schema));

		for (const [key, value] of Object.entries(instance)) {
			if (key.startsWith('_')) continue; // Skip internal props

			if (enhanced.properties?.[key]) {
				// Serialize special types for examples
				if (value instanceof Date) {
					enhanced.properties[key].example = value.toISOString();
				} else if (value instanceof Set) {
					enhanced.properties[key].example = Array.from(value);
				} else if (value instanceof Map) {
					enhanced.properties[key].example = Array.from(
						value.entries()
					);
				} else if (typeof value === 'bigint') {
					enhanced.properties[key].example = value.toString();
				} else {
					enhanced.properties[key].example = value;
				}
			}
		}

		return enhanced;
	}
}

/**
 * Generates a Mongoose/MongoDB schema-definition object from QuickModel decorator configuration.
 *
 * Produces `{ [field]: { type: NativeConstructor, required: true } }` entries
 * compatible with `new mongoose.Schema(definition)`.
 *
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 equivalent
 * @see {@link ISchemaGeneratorConfig} — input shape
 *
 * @example
 * ```ts
 * const definition = MongoSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { name: String, age: Number, createdAt: Date },
 *   properties: ['name', 'age', 'createdAt'],
 * });
 * // {
 * //   name:      { type: String, required: true },
 * //   age:       { type: Number, required: true },
 * //   createdAt: { type: Date,   required: true },
 * // }
 * const UserSchema = new mongoose.Schema(definition);
 * ```
 */
export class MongoSchemaGenerator {
	/**
	 * Generates a Mongoose/MongoDB schema-definition object.
	 *
	 * @param config - Class name, type-map, and property list
	 * @returns A plain object of `{ [field]: { type: NativeConstructor, required: true } }` entries
	 *   suitable for passing to `new mongoose.Schema(definition)`
	 * @see {@link JsonSchemaGenerator.generate} — equivalent for JSON Schema
	 * @see {@link ISchemaGeneratorConfig} — input shape
	 */
	static generate(config: ISchemaGeneratorConfig): Record<string, any> {
		const { decoratorConfig, properties } = config;

		const schema: Record<string, any> = {};

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			schema[prop] = {
				type: this._getMongoType(transformer),
				required: true,
			};
		}

		return schema;
	}

	/**
	 * Maps a transformer token to its Mongoose/MongoDB schema type equivalent.
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns Native constructor or array suitable for a Mongoose field definition
	 */
	private static _getMongoType(transformer: any): any {
		if (!transformer) {
			return String; // Default
		}

		const transformerName =
			typeof transformer === 'function'
				? transformer.name
				: String(transformer);

		switch (transformerName.toLowerCase()) {
			case 'number':
				return Number;
			case 'string':
				return String;
			case 'boolean':
				return Boolean;
			case 'object':
				return Object;
			case 'date':
				return Date;
			case 'bigint':
				return String; // MongoDB stores BigInt as String
			case 'set':
			case 'array':
				return [String]; // Array of strings
			case 'map':
				return Array; // Map as array of tuples
			default:
				return String;
		}
	}
}

/**
 * Generates a TypeScript interface string from QuickModel decorator configuration.
 *
 * Produces a `interface I${className} { ... }` source string that can be
 * written to a `.d.ts` file or surfaced in tooling.
 *
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 equivalent
 * @see {@link MongoSchemaGenerator} — Mongoose schema equivalent
 * @see {@link ISchemaGeneratorConfig} — input shape
 *
 * @example
 * ```ts
 * const code = TypeScriptSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { name: String, age: Number, createdAt: Date },
 *   properties: ['name', 'age', 'createdAt'],
 * });
 * // 'interface IUser {\n\tname: string;\n\tage: number;\n\tcreatedAt: Date;\n}'
 * ```
 */
export class TypeScriptSchemaGenerator {
	/**
	 * Generates a TypeScript `interface` source string.
	 *
	 * @param config - Class name, type-map, and property list
	 * @returns A TypeScript interface source string (e.g. `'interface IUser { name: string; }\n'`)
	 * @see {@link MongoSchemaGenerator.generate} — Mongoose schema equivalent
	 * @see {@link ISchemaGeneratorConfig} — input shape
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;

		let tsInterface = `interface I${className} {\n`;

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			const tsType = this._getTypeScriptType(transformer);
			tsInterface += `\t${prop}: ${tsType};\n`;
		}

		tsInterface += '}';

		return tsInterface;
	}

	/**
	 * Maps a transformer token to its TypeScript type string.
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns TypeScript type string (e.g. `'string'`, `'Date'`, `'Map<string, any>'`)
	 */
	private static _getTypeScriptType(transformer: any): string {
		if (!transformer) {
			return 'string'; // Default
		}

		const transformerName =
			typeof transformer === 'function'
				? transformer.name
				: String(transformer);

		switch (transformerName.toLowerCase()) {
			case 'number':
				return 'number';
			case 'string':
				return 'string';
			case 'boolean':
				return 'boolean';
			case 'object':
				return 'object';
			case 'date':
				return 'Date';
			case 'bigint':
				return 'bigint';
			case 'set':
				return 'Set<string>';
			case 'map':
				return 'Map<string, any>';
			case 'array':
				return 'any[]';
			default:
				return 'string';
		}
	}
}

/**
 * Generates a GraphQL SDL type definition string from QuickModel decorator configuration.
 *
 * Produces a `type ${className} { ... }` block using non-nullable scalar
 * types where possible (`String!`, `Float!`, `Boolean!`, `DateTime!`).
 * `BigInt` is mapped to `String!` (GraphQL has no native BigInt scalar);
 * `Map` and complex objects are mapped to `JSON!`.
 *
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 equivalent
 * @see {@link OpenAPISchemaGenerator} — OpenAPI 3.0 equivalent
 * @see {@link ISchemaGeneratorConfig} — input shape
 *
 * @example
 * ```ts
 * const sdl = GraphQLSchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { name: String, age: Number, createdAt: Date },
 *   properties: ['name', 'age', 'createdAt'],
 * });
 * // 'type User {\n\tname: String!\n\tage: Float!\n\tcreatedAt: DateTime!\n}'
 * ```
 */
export class GraphQLSchemaGenerator {
	/**
	 * Generates a GraphQL SDL type definition string.
	 *
	 * @param config - Class name, type-map, and property list
	 * @returns A GraphQL SDL `type` block as a string (e.g. `'type User {\n  name: String!\n}'`)
	 * @see {@link TypeScriptSchemaGenerator.generate} — TypeScript interface equivalent
	 * @see {@link ISchemaGeneratorConfig} — input shape
	 */
	static generate(config: ISchemaGeneratorConfig): string {
		const { className, decoratorConfig, properties } = config;

		let graphqlType = `type ${className} {\n`;

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			const gqlType = this._getGraphQLType(transformer);
			graphqlType += `\t${prop}: ${gqlType}\n`;
		}

		graphqlType += '}';

		return graphqlType;
	}

	/**
	 * Maps a transformer token to its GraphQL SDL scalar type.
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns Non-nullable GraphQL scalar type string (e.g. `'String!'`, `'Float!'`, `'DateTime!'`)
	 */
	private static _getGraphQLType(transformer: any): string {
		if (!transformer) {
			return 'String!'; // Default (non-nullable)
		}

		const transformerName =
			typeof transformer === 'function'
				? transformer.name
				: String(transformer);

		switch (transformerName.toLowerCase()) {
			case 'number':
				return 'Float!';
			case 'string':
				return 'String!';
			case 'boolean':
				return 'Boolean!';
			case 'object':
				return 'JSON!';
			case 'date':
				return 'DateTime!';
			case 'bigint':
				return 'String!'; // GraphQL doesn't have BigInt
			case 'set':
			case 'array':
				return '[String!]!'; // Non-null array of non-null strings
			case 'map':
				return 'JSON!'; // Maps as JSON in GraphQL
			default:
				return 'String!';
		}
	}
}

/**
 * Generates an OpenAPI 3.0 schema component from QuickModel decorator configuration.
 *
 * Returns an object with `type: 'object'`, a `properties` map, and a `required`
 * array — ready to embed directly in an OpenAPI document under
 * `components.schemas`.
 *
 * @see {@link JsonSchemaGenerator} — JSON Schema Draft-07 equivalent
 * @see {@link MongoSchemaGenerator} — Mongoose schema equivalent
 * @see {@link ISchemaGeneratorConfig} — input shape
 *
 * @example
 * ```ts
 * const schema = OpenAPISchemaGenerator.generate({
 *   className: 'User',
 *   decoratorConfig: { name: String, age: Number, createdAt: Date },
 *   properties: ['name', 'age', 'createdAt'],
 * });
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     name:      { type: 'string' },
 * //     age:       { type: 'number', format: 'double' },
 * //     createdAt: { type: 'string', format: 'date-time' },
 * //   },
 * //   required: ['name', 'age', 'createdAt'],
 * // }
 * ```
 */
export class OpenAPISchemaGenerator {
	/**
	 * Generates an OpenAPI 3.0 schema component object.
	 *
	 * @param config - Class name, type-map, and property list
	 * @returns An OpenAPI 3.0–compatible schema object with `type: 'object'`, `properties`, and `required`
	 * @see {@link JsonSchemaGenerator.generate} — JSON Schema Draft-07 equivalent
	 * @see {@link GraphQLSchemaGenerator.generate} — GraphQL SDL equivalent
	 */
	static generate(config: ISchemaGeneratorConfig): Record<string, any> {
		const { decoratorConfig, properties } = config;

		const schema: Record<string, any> = {
			type: 'object',
			properties: {},
			required: [],
		};

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			schema.properties[prop] = this._getOpenAPIType(transformer);
			schema.required.push(prop);
		}

		return schema;
	}

	/**
	 * Maps a transformer token to its OpenAPI 3.0 type descriptor.
	 * @internal
	 * @param transformer - Transformer function, constructor, or string token
	 * @returns OpenAPI-compatible type descriptor object
	 */
	private static _getOpenAPIType(transformer: any): Record<string, any> {
		if (!transformer) {
			return { type: 'string' }; // Default
		}

		const transformerName =
			typeof transformer === 'function'
				? transformer.name
				: String(transformer);

		switch (transformerName.toLowerCase()) {
			case 'number':
				return { type: 'number', format: 'double' };
			case 'boolean':
				return { type: 'boolean' };
			case 'date':
				return { type: 'string', format: 'date-time' };
			case 'bigint':
				return { type: 'string', pattern: '^-?\\d+$' };
			case 'set':
			case 'array':
				return {
					type: 'array',
					items: { type: 'string' },
				};
			case 'map':
				return {
					type: 'array',
					items: {
						type: 'array',
						minItems: 2,
						maxItems: 2,
					},
				};
			default:
				return { type: 'string' };
		}
	}
}

/**
 * Generates an AJV-compatible validation schema from QuickModel decorator configuration.
 *
 * Delegates to `JsonSchemaGenerator` and strips the `$schema` property,
 * since AJV adds its own schema version identifier.
 * @see {@link JsonSchemaGenerator} — underlying generator this delegates to
 * @see {@link OpenAPISchemaGenerator} — OpenAPI 3.0 schema equivalent
 */
export class AjvSchemaGenerator {
	/**
	 * Generates an AJV-compatible validation schema.
	 *
	 * Delegates to {@link JsonSchemaGenerator.generate} and strips the `$schema`
	 * property since AJV injects its own version identifier.
	 *
	 * @param config - Class name, type-map, and property list
	 * @returns An AJV-compatible plain object (JSON Schema without the `$schema` field)
	 */
	static generate(config: ISchemaGeneratorConfig): Record<string, any> {
		// AJV uses JSON Schema, so we reuse JsonSchemaGenerator
		// but without $schema property (AJV adds it)
		const jsonSchema = JsonSchemaGenerator.generate(config);
		const { $schema: _$schema, ...ajvSchema } = jsonSchema;
		return ajvSchema;
	}
}

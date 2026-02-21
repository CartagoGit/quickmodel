/**
 * Schema generators for different formats
 *
 * Each generator implements a specific schema format generation
 * following Single Responsibility Principle
 */

import { z } from 'zod';

/**
 * Base schema generator configuration
 */
interface ISchemaGeneratorConfig {
	className: string;
	decoratorConfig: Record<string, any>;
	properties: string[];
}

/**
 * JSON Schema Draft-07 Generator
 */
export class JsonSchemaGenerator {
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

	private static _getJsonSchemaType(transformer: any): Record<string, any> {
		if (!transformer) {
			return { type: 'string' }; // Default
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
	 * Add examples from instance values
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
 * Zod Schema Generator
 */
export class ZodSchemaGenerator {
	static generate(config: ISchemaGeneratorConfig): z.ZodObject<any> {
		const { decoratorConfig, properties } = config;

		const shape: Record<string, z.ZodTypeAny> = {};

		for (const prop of properties) {
			const transformer = decoratorConfig[prop];
			shape[prop] = this._getZodType(transformer);
		}

		return z.object(shape);
	}

	private static _getZodType(transformer: any): z.ZodTypeAny {
		if (!transformer) {
			return z.string(); // Default
		}

		const transformerName =
			typeof transformer === 'function'
				? transformer.name
				: String(transformer);

		switch (transformerName.toLowerCase()) {
			case 'number':
				return z.number();
			case 'string':
				return z.string();
			case 'boolean':
				return z.boolean();
			case 'object':
				return z.object({}).passthrough();
			case 'date':
				return z.string().datetime();
			case 'bigint':
				return z.string().regex(/^-?\d+$/);
			case 'set':
				return z.array(z.string());
			case 'map':
				return z.array(z.tuple([z.string(), z.any()]));
			case 'array':
				return z.array(z.any());
			default:
				return z.string();
		}
	}
}

/**
 * MongoDB/Mongoose Schema Generator
 */
export class MongoSchemaGenerator {
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
 * TypeScript Interface Generator
 */
export class TypeScriptSchemaGenerator {
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
 * GraphQL SDL Generator
 */
export class GraphQLSchemaGenerator {
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
 * OpenAPI 3.0 Schema Generator
 */
export class OpenAPISchemaGenerator {
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
 * AJV Schema Generator (JSON Schema compatible)
 */
export class AjvSchemaGenerator {
	static generate(config: ISchemaGeneratorConfig): Record<string, any> {
		// AJV uses JSON Schema, so we reuse JsonSchemaGenerator
		// but without $schema property (AJV adds it)
		const jsonSchema = JsonSchemaGenerator.generate(config);
		const { $schema: _$schema, ...ajvSchema } = jsonSchema;
		return ajvSchema;
	}
}

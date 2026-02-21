/**
 * TDD Tests: Schema Generation API
 *
 * Task #2.5: Unified schema generation with getSchema(type)
 *
 * Supported formats:
 * - 'json': JSON Schema Draft-07
 * - 'zod': Zod validation schema
 * - 'mongo': MongoDB/Mongoose schema
 * - 'typescript': TypeScript interface string
 * - 'graphql': GraphQL SDL type definition
 * - 'openapi': OpenAPI 3.0 schema
 * - 'ajv': AJV validator schema
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { z } from 'zod';

describe('QModel Unified Schema Generation API', () => {
	interface IUser {
		id: number;
		name: string;
		email: string;
		birth: string; // ISO date from backend
		balance: string; // BigInt as string from backend
		tags: string[]; // Set as array from backend
	}

	@Quick({
		id: Number,
		name: String,
		email: String,
		birth: Date,
		balance: BigInt,
		tags: Set,
	})
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;
		declare email: string;
		declare birth: Date;
		declare balance: bigint;
		declare tags: Set<string>;
	}

	// ========================================================================
	// 1. JSON SCHEMA (Universal Standard)
	// ========================================================================

	describe('JSON Schema Generation', () => {
		test('User.getSchema("json") - should generate JSON Schema Draft-07', () => {
			const schema = User.getSchema('json');

			expect(schema).toHaveProperty(
				'$schema',
				'http://json-schema.org/draft-07/schema#'
			);
			expect(schema).toHaveProperty('type', 'object');
			expect(schema).toHaveProperty('title', 'User');
			expect(schema).toHaveProperty('properties');
			expect(schema).toHaveProperty('required');
		});

		test('should include correct property types in JSON Schema', () => {
			const schema = User.getSchema('json');

			expect(schema.properties.id).toMatchObject({ type: 'number' });
			expect(schema.properties.name).toMatchObject({ type: 'string' });
			expect(schema.properties.email).toMatchObject({ type: 'string' });
			expect(schema.properties.birth).toMatchObject({
				type: 'string',
				format: 'date-time',
			});
			expect(schema.properties.balance).toMatchObject({
				type: 'string',
				pattern: '^-?\\d+$',
			});
			expect(schema.properties.tags).toMatchObject({
				type: 'array',
				items: { type: 'string' },
				uniqueItems: true,
			});
		});

		test('should list all required fields', () => {
			const schema = User.getSchema('json');

			expect(schema.required).toEqual(
				expect.arrayContaining([
					'id',
					'name',
					'email',
					'birth',
					'balance',
					'tags',
				])
			);
		});

		test('instance.getSchema("json") - should include examples from values', () => {
			const user = new User({
				id: 42,
				name: 'John Doe',
				email: 'john@example.com',
				birth: '1990-01-15T00:00:00.000Z',
				balance: '999999999999',
				tags: ['typescript', 'node', 'bun'],
			});

			const schema = user.getSchema('json');

			expect(schema.properties.id).toHaveProperty('example', 42);
			expect(schema.properties.name).toHaveProperty(
				'example',
				'John Doe'
			);
			expect(schema.properties.email).toHaveProperty(
				'example',
				'john@example.com'
			);
			expect(schema.properties.birth).toHaveProperty('example');
			expect(schema.properties.balance).toHaveProperty('example');
			expect(schema.properties.tags).toHaveProperty('example');
		});
	});

	// ========================================================================
	// 2. ZOD SCHEMA (Validation)
	// ========================================================================

	describe('Zod Schema Generation', () => {
		test('User.getSchema("zod") - should generate Zod schema', () => {
			const zodSchema = User.getSchema('zod');

			expect(zodSchema).toBeInstanceOf(z.ZodObject);
		});

		test('Zod schema should validate correct data', () => {
			const zodSchema = User.getSchema('zod');

			const validData = {
				id: 1,
				name: 'Jane Smith',
				email: 'jane@test.com',
				birth: '1985-05-20T00:00:00.000Z',
				balance: '123456789012345',
				tags: ['developer', 'typescript'],
			};

			const result = zodSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		test('Zod schema should reject invalid data', () => {
			const zodSchema = User.getSchema('zod');

			const invalidData = {
				id: 'not-a-number', // Wrong type
				name: 'Test',
				email: 'invalid-email', // Invalid format
				birth: 'not-a-date',
				balance: 'not-a-number',
				tags: 'not-an-array',
			};

			const result = zodSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	// ========================================================================
	// 3. MONGODB SCHEMA
	// ========================================================================

	describe('MongoDB Schema Generation', () => {
		test('User.getSchema("mongo") - should generate MongoDB schema', () => {
			const mongoSchema = User.getSchema('mongo');

			expect(mongoSchema).toMatchObject({
				id: { type: Number, required: true },
				name: { type: String, required: true },
				email: { type: String, required: true },
				birth: { type: Date, required: true },
				balance: { type: String, required: true }, // BigInt stored as String
				tags: { type: [String], required: true },
			});
		});

		test('MongoDB schema should use correct Mongoose types', () => {
			const mongoSchema = User.getSchema('mongo');

			// Verificar que usa constructores nativos de JS
			expect(mongoSchema.id.type).toBe(Number);
			expect(mongoSchema.name.type).toBe(String);
			expect(mongoSchema.birth.type).toBe(Date);
		});
	});

	// ========================================================================
	// 4. TYPESCRIPT INTERFACE
	// ========================================================================

	describe('TypeScript Interface Generation', () => {
		test('User.getSchema("typescript") - should generate TS interface string', () => {
			const tsInterface = User.getSchema('typescript');

			expect(typeof tsInterface).toBe('string');
			expect(tsInterface).toContain('interface IUser {');
			expect(tsInterface).toContain('}');
		});

		test('TypeScript interface should use runtime types', () => {
			const tsInterface = User.getSchema('typescript');

			expect(tsInterface).toContain('id: number;');
			expect(tsInterface).toContain('name: string;');
			expect(tsInterface).toContain('email: string;');
			expect(tsInterface).toContain('birth: Date;');
			expect(tsInterface).toContain('balance: bigint;');
			expect(tsInterface).toContain('tags: Set<string>;');
		});
	});

	// ========================================================================
	// 5. GRAPHQL SDL
	// ========================================================================

	describe('GraphQL Type Definition Generation', () => {
		test('User.getSchema("graphql") - should generate GraphQL SDL', () => {
			const graphqlType = User.getSchema('graphql');

			expect(typeof graphqlType).toBe('string');
			expect(graphqlType).toContain('type User {');
			expect(graphqlType).toContain('}');
		});

		test('GraphQL type should use correct scalar types', () => {
			const graphqlType = User.getSchema('graphql');

			expect(graphqlType).toContain('id: Float!'); // Number maps to Float in GraphQL
			expect(graphqlType).toContain('name: String!');
			expect(graphqlType).toContain('email: String!');
			expect(graphqlType).toContain('birth: DateTime!');
			expect(graphqlType).toMatch(/balance: (String|BigInt)!/);
			expect(graphqlType).toContain('tags: [String!]!');
		});
	});

	// ========================================================================
	// 6. OPENAPI 3.0 SCHEMA
	// ========================================================================

	describe('OpenAPI Schema Generation', () => {
		test('User.getSchema("openapi") - should generate OpenAPI 3.0 schema', () => {
			const openapiSchema = User.getSchema('openapi');

			expect(openapiSchema).toHaveProperty('type', 'object');
			expect(openapiSchema).toHaveProperty('properties');
			expect(openapiSchema).toHaveProperty('required');
		});

		test('OpenAPI schema should use correct types', () => {
			const openapiSchema = User.getSchema('openapi');

			expect(openapiSchema.properties.id).toMatchObject({
				type: 'number',
				format: 'double',
			}); // Number maps to number/double
			expect(openapiSchema.properties.name).toMatchObject({
				type: 'string',
			});
			expect(openapiSchema.properties.birth).toMatchObject({
				type: 'string',
				format: 'date-time',
			});
			expect(openapiSchema.properties.tags).toMatchObject({
				type: 'array',
				items: { type: 'string' },
			});
		});
	});

	// ========================================================================
	// 7. AJV SCHEMA (Fast Validation)
	// ========================================================================

	describe('AJV Schema Generation', () => {
		test('User.getSchema("ajv") - should generate AJV-compatible schema', () => {
			const ajvSchema = User.getSchema('ajv');

			expect(ajvSchema).toHaveProperty('type', 'object');
			expect(ajvSchema).toHaveProperty('properties');
			expect(ajvSchema).toHaveProperty('required');
		});

		test('AJV schema should be JSON Schema compatible', () => {
			const ajvSchema = User.getSchema('ajv');

			// AJV usa JSON Schema Draft-07
			expect(ajvSchema.properties).toHaveProperty('id');
			expect(ajvSchema.properties).toHaveProperty('name');
			expect(ajvSchema.required).toContain('id');
		});
	});

	// ========================================================================
	// 8. ERROR HANDLING
	// ========================================================================

	describe('Error Handling', () => {
		test('should throw on invalid schema type', () => {
			expect(() => User.getSchema('invalid' as any)).toThrow(
				/Unknown schema type: invalid/
			);
		});

		test('should throw on undefined schema type', () => {
			expect(() => User.getSchema(undefined as any)).toThrow();
		});
	});

	// ========================================================================
	// 9. COMPLEX TYPES SUPPORT
	// ========================================================================

	describe('Complex Types Support', () => {
		interface IComplex {
			nested: {
				deep: string;
			};
			matrix: number[][];
			mapData: [string, number][]; // Map as array of tuples
		}

		@Quick({ nested: Object, matrix: Array, mapData: Map })
		class Complex extends QModel<IComplex> {
			declare nested: { deep: string };
			declare matrix: number[][];
			declare mapData: Map<string, number>;
		}

		test('should handle nested objects in JSON Schema', () => {
			const schema = Complex.getSchema('json');

			expect(schema.properties.nested).toMatchObject({
				type: 'object',
			});
		});

		test('should handle multi-dimensional arrays', () => {
			const schema = Complex.getSchema('json');

			expect(schema.properties.matrix).toMatchObject({
				type: 'array',
				items: { type: 'any' }, // Generic array without element type info
			});
		});

		test('should handle Map transformations', () => {
			const schema = Complex.getSchema('json');

			expect(schema.properties.mapData).toMatchObject({
				type: 'array',
				items: {
					type: 'array',
					minItems: 2,
					maxItems: 2,
				},
			});
		});
	});

	// ========================================================================
	// _inferPropertiesFromSample() coverage — lines 1722-1736 of quick.model.ts
	// ========================================================================
	describe('_inferPropertiesFromSample() — no @Quick decorator paths', () => {
		test('should return property list from QUICK_VALUES_KEY when class has no @Quick', () => {
			// Class with QModel but no @Quick → decoratorConfig has no keys
			// → _inferPropertiesFromSample() is called → constructor succeeds
			// → QUICK_VALUES_KEY is populated → Object.keys(...) is returned
			class BareModel extends QModel<any> {
				declare name: string;
				declare age: number;
			}

			// Should not throw; returns a schema (even if properties list is empty
			// because there's no @Quick metadata to populate QUICK_VALUES_KEY keys)
			const schema = BareModel.getSchema('json');
			expect(schema).toBeDefined();
			expect(schema).toHaveProperty('type', 'object');
		});

		test('should return empty array from catch when constructor throws', () => {
			// Class whose constructor always throws → _inferPropertiesFromSample catch
			class ThrowingModel extends QModel<any> {
				constructor(data: any) {
					super(data);
					throw new Error('constructor always fails');
				}
			}

			// getSchema must not throw even when instantiation fails
			expect(() => ThrowingModel.getSchema('json')).not.toThrow();
			const schema = ThrowingModel.getSchema('json');
			expect(schema).toBeDefined();
			expect(schema).toHaveProperty('properties');
		});
	});
});

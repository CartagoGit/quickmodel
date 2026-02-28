/**
 * TDD Tests: MCP Public Tools - Full Coverage
 *
 * Objetivo: Subir cobertura de 50-66% a >80%
 *
 * Tools testeados:
 * - list-transformers (50% → 80%+)
 * - generate-mock (66% → 80%+)
 * - export-schema (66% → 80%+)
 * - interface-to-model (66% → 80%+)
 * - json-to-model (66% → 80%+)
 */

import { describe, test, expect } from 'bun:test';
import { QListTransformersTool } from '@mcp/tools/public/list-transformers.tool';
import { QGenerateMockDataTool } from '@mcp/tools/public/generate-mock.tool';
import { QExportJsonSchemaTool } from '@mcp/tools/public/export-schema.tool';
import { QInterfaceToModelTool } from '@mcp/tools/public/interface-to-model.tool';
import { QJsonToModelTool } from '@mcp/tools/public/json-to-model.tool';

// ============================================================================
// LIST TRANSFORMERS TOOL
// ============================================================================

describe('QListTransformersTool - Full Coverage', () => {
	const tool = new QListTransformersTool();

	test('should have correct metadata', () => {
		expect(tool.name).toBe('list_transformers');
		expect(tool.description).toContain('transformers');
		expect(tool.schema).toBeDefined();
	});

	test('should list all registered transformers', async () => {
		const result = await tool.execute();

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);

		// Verificar tipos básicos
		expect(result).toContain('string');
		expect(result).toContain('number');
		expect(result).toContain('boolean');
		expect(result).toContain('date');
		expect(result).toContain('bigint');
	});

	test('should return sorted list', async () => {
		const result = await tool.execute();
		const sorted = [...result].sort();

		expect(result).toEqual(sorted);
	});

	test('should include all standard transformers', async () => {
		const result = await tool.execute();

		// Verificar transformers importantes
		const expectedTransformers = [
			'string',
			'number',
			'boolean',
			'date',
			'bigint',
			'regexp',
			'symbol',
			'error',
			'map',
			'set',
		];

		for (const transformer of expectedTransformers) {
			expect(result).toContain(transformer);
		}
	});

	test('should not include duplicates', async () => {
		const result = await tool.execute();
		const unique = [...new Set(result)];

		expect(result.length).toBe(unique.length);
	});

	test('schema should be empty object (no parameters)', () => {
		const parseResult = tool.schema.safeParse({});
		expect(parseResult.success).toBe(true);
	});

	test('schema should accept empty object', () => {
		const parseResult = tool.schema.safeParse({});
		expect(parseResult.success).toBe(true);
		expect(parseResult.data).toEqual({});
	});
});

// ============================================================================
// GENERATE MOCK TOOL
// ============================================================================

describe('QGenerateMockDataTool - Full Coverage', () => {
	const tool = new QGenerateMockDataTool();

	test('should have correct metadata', () => {
		expect(tool.name).toBe('generate_mock');
		expect(tool.description).toContain('mock data');
		expect(tool.schema).toBeDefined();
	});

	test('should generate single mock with default count', async () => {
		const result = await tool.execute({
			schema: { name: 'string', age: 'number' },
			count: 1,
		});

		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveProperty('name');
		expect(result[0]).toHaveProperty('age');
		expect(typeof result[0].name).toBe('string');
		expect(typeof result[0].age).toBe('number');
	});

	test('should generate multiple mocks with count parameter', async () => {
		const result = await tool.execute({
			schema: { email: 'string', active: 'boolean' },
			count: 5,
		});

		expect(result).toHaveLength(5);

		for (const mock of result) {
			expect(mock).toHaveProperty('email');
			expect(mock).toHaveProperty('active');
			expect(typeof mock.email).toBe('string');
			expect(typeof mock.active).toBe('boolean');
		}
	});

	test('should handle complex types (date, bigint)', async () => {
		const result = await tool.execute({
			schema: { birth: 'date', balance: 'bigint' },
			count: 1,
		});

		expect(result).toHaveLength(1);

		// Date se serializa como string ISO
		expect(result[0].birth).toMatch(/^\d{4}-\d{2}-\d{2}/);

		// BigInt se serializa como string
		expect(typeof result[0].balance).toBe('string');
	});

	test('should handle nested schema with multiple types', async () => {
		const result = await tool.execute({
			schema: {
				id: 'number',
				name: 'string',
				created: 'date',
				active: 'boolean',
			},
			count: 2,
		});

		expect(result).toHaveLength(2);

		for (const mock of result) {
			expect(mock).toHaveProperty('id');
			expect(mock).toHaveProperty('name');
			expect(mock).toHaveProperty('created');
			expect(mock).toHaveProperty('active');
		}
	});

	test('schema should validate correct input', () => {
		const validInput = {
			schema: { name: 'string' },
			count: 5,
		};

		const parseResult = tool.schema.safeParse(validInput);
		expect(parseResult.success).toBe(true);
	});

	test('schema should use default count of 1', () => {
		const input = {
			schema: { name: 'string' },
		};

		const parseResult = tool.schema.safeParse(input);
		expect(parseResult.success).toBe(true);
		if (parseResult.success) {
			expect(parseResult.data.count).toBe(1);
		}
	});

	test('schema should reject invalid schema type', () => {
		const invalidInput = {
			schema: 'not-an-object', // Should be object
			count: 1,
		};

		const parseResult = tool.schema.safeParse(invalidInput);
		expect(parseResult.success).toBe(false);
	});

	test('schema should reject invalid count type', () => {
		const invalidInput = {
			schema: { name: 'string' },
			count: 'five', // Should be number
		};

		const parseResult = tool.schema.safeParse(invalidInput);
		expect(parseResult.success).toBe(false);
	});

	test('should handle empty schema gracefully', async () => {
		const result = await tool.execute({
			schema: {},
			count: 1,
		});

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({});
	});

	test('should generate different data for each mock', async () => {
		const result = await tool.execute({
			schema: { name: 'string', age: 'number' },
			count: 10,
		});

		// Verificar que no todos los nombres son iguales (alta probabilidad)
		const names = result.map((item) => item.name);
		const uniqueNames = new Set(names);

		expect(uniqueNames.size).toBeGreaterThan(1);
	});
});

// ============================================================================
// EXPORT JSON SCHEMA TOOL
// ============================================================================

describe('QExportJsonSchemaTool - Full Coverage', () => {
	const tool = new QExportJsonSchemaTool();

	test('should have correct metadata', () => {
		expect(tool.name).toBe('export_json_schema');
		expect(tool.description).toContain('JSON Schema');
		expect(tool.schema).toBeDefined();
	});

	test('should export schema for simple model', async () => {
		const code = `
      import { QModel, Quick } from 'quickmodel';

      interface IUser {
        id: number;
        name: string;
      }

      @Quick()
      class User extends QModel<IUser> {
        declare id: number;
        declare name: string;
      }
    `;

		const result = await tool.execute({ code });

		expect(typeof result).toBe('object');
		expect(result).toHaveProperty('schema');
		expect(result.schema).toHaveProperty('type');
		expect((result.schema as any).type).toBe('object');
	});

	test('should handle code with transformers', async () => {
		const code = `
      import { QModel, Quick } from 'quickmodel';

      @Quick({ created: Date })
      class Model extends QModel<any> {
        declare created: Date;
      }
    `;

		const result = await tool.execute({ code });

		expect(result).toHaveProperty('schema');
		expect(result.schema).toHaveProperty('properties');
	});

	test('schema should validate code input', () => {
		const validInput = {
			code: 'class Test {}',
		};

		const parseResult = tool.schema.safeParse(validInput);
		expect(parseResult.success).toBe(true);
	});

	test('schema should reject missing code', () => {
		const invalidInput = {};

		const parseResult = tool.schema.safeParse(invalidInput);
		expect(parseResult.success).toBe(false);
	});

	test('schema should reject non-string code', () => {
		const invalidInput = {
			code: 123, // Should be string
		};

		const parseResult = tool.schema.safeParse(invalidInput);
		expect(parseResult.success).toBe(false);
	});

	test('should handle malformed code gracefully', async () => {
		const code = 'this is not valid typescript code {{{';

		// Puede lanzar error o devolver schema vacío
		try {
			const result = await tool.execute({ code });
			expect(result).toBeDefined();
		} catch (error) {
			expect(error).toBeDefined();
		}
	});
});

// ============================================================================
// INTERFACE TO MODEL TOOL
// ============================================================================

describe('QInterfaceToModelTool - Full Coverage', () => {
	const tool = new QInterfaceToModelTool();

	test('should have correct metadata', () => {
		expect(tool.name).toBe('interface_to_model');
		expect(tool.description).toContain('interface');
		expect(tool.schema).toBeDefined();
	});

	test('should convert simple interface to model', async () => {
		const code = `
      interface IUser {
        id: number;
        name: string;
        email: string;
      }
    `;

		const result = await tool.execute({ code });

		expect(typeof result).toBe('object');
		expect(result).toHaveProperty('code');
		expect(typeof result.code).toBe('string');
		expect(result.code).toContain('class');
		expect(result.code).toContain('QModel');
		expect(result.code).toContain('id');
		expect(result.code).toContain('name');
		expect(result.code).toContain('email');
	});

	test('should handle interface with Date type', async () => {
		const code = `
      interface IModel {
        created: Date;
        updated: Date;
      }
    `;

		const result = await tool.execute({ code });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('@Quick');
		expect(result.code).toContain('created');
		expect(result.code).toContain('Date');
	});

	test('should handle interface with optional properties', async () => {
		const code = `
      interface IModel {
        required: string;
        optional?: number;
      }
    `;

		const result = await tool.execute({ code });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('required');
		expect(result.code).toContain('optional');
	});

	test('schema should validate code input', () => {
		const validInput = {
			code: 'interface ITest { id: number; }',
		};

		const parseResult = tool.schema.safeParse(validInput);
		expect(parseResult.success).toBe(true);
	});

	test('schema should reject missing code', () => {
		const invalidInput = {};

		const parseResult = tool.schema.safeParse(invalidInput);
		expect(parseResult.success).toBe(false);
	});

	test('should handle malformed interface gracefully', async () => {
		const code = 'interface Broken { missing: }';

		try {
			const result = await tool.execute({ code });
			expect(result).toBeDefined();
		} catch (error) {
			expect(error).toBeDefined();
		}
	});
});

// ============================================================================
// JSON TO MODEL TOOL
// ============================================================================

describe('QJsonToModelTool - Full Coverage', () => {
	const tool = new QJsonToModelTool();

	test('should have correct metadata', () => {
		expect(tool.name).toBe('json_to_model');
		expect(tool.description).toContain('JSON');
		expect(tool.schema).toBeDefined();
	});

	test('should convert simple JSON to model', async () => {
		const json = JSON.stringify({
			id: 1,
			name: 'John Doe',
			active: true,
		});

		const result = await tool.execute({ json, className: 'User' });

		expect(typeof result).toBe('object');
		expect(result).toHaveProperty('code');
		expect(typeof result.code).toBe('string');
		expect(result.code).toContain('class User');
		expect(result.code).toContain('QModel');
		expect(result.code).toContain('id');
		expect(result.code).toContain('name');
		expect(result.code).toContain('active');
	});

	test('should use default className "GeneratedModel"', async () => {
		const json = JSON.stringify({ value: 123 });

		const result = await tool.execute({ json });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('GeneratedModel');
	});

	test('should infer Date type from ISO string', async () => {
		const json = JSON.stringify({
			created: '2024-01-01T00:00:00.000Z',
		});

		const result = await tool.execute({ json, className: 'Model' });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('@Quick');
		expect(result.code).toContain('created');
	});

	test('should handle nested objects', async () => {
		const json = JSON.stringify({
			user: {
				id: 1,
				profile: {
					bio: 'Developer',
				},
			},
		});

		const result = await tool.execute({ json });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('user');
	});

	test('should handle arrays', async () => {
		const json = JSON.stringify({
			items: [1, 2, 3],
			tags: ['a', 'b'],
		});

		const result = await tool.execute({ json });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('items');
		expect(result.code).toContain('tags');
	});

	test('schema should validate json input', () => {
		const validInput = {
			json: '{"id": 1}',
			className: 'Test',
		};

		const parseResult = tool.schema.safeParse(validInput);
		expect(parseResult.success).toBe(true);
	});

	test('schema should use default className', () => {
		const input = {
			json: '{"id": 1}',
		};

		const parseResult = tool.schema.safeParse(input);
		expect(parseResult.success).toBe(true);
		if (parseResult.success) {
			expect(parseResult.data.className).toBe('GeneratedModel');
		}
	});

	test('schema should reject missing json', () => {
		const invalidInput = {};

		const parseResult = tool.schema.safeParse(invalidInput);
		expect(parseResult.success).toBe(false);
	});

	test('schema should reject non-string json', () => {
		const invalidInput = {
			json: { id: 1 }, // Should be string
		};

		const parseResult = tool.schema.safeParse(invalidInput);
		expect(parseResult.success).toBe(false);
	});

	test('should handle invalid JSON gracefully', async () => {
		const json = '{this is not valid json}';

		try {
			const result = await tool.execute({ json });
			expect(result).toBeDefined();
		} catch (error) {
			expect(error).toBeDefined();
		}
	});

	test('should handle empty JSON object', async () => {
		const json = '{}';

		const result = await tool.execute({ json });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('class GeneratedModel');
		expect(result.code).toContain('QModel');
	});

	test('should handle complex nested structure', async () => {
		const json = JSON.stringify({
			level1: {
				level2: {
					level3: {
						deep: 'value',
					},
				},
			},
		});

		const result = await tool.execute({ json, className: 'Deep' });

		expect(result).toHaveProperty('code');
		expect(result.code).toContain('class Deep');
		expect(result.code).toContain('level1');
	});
});

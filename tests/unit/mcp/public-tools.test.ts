import { describe, it, expect } from 'bun:test';
import {
	QListTransformersTool,
	QGenerateMockDataTool,
	QInspectModelTool,
} from '../../../src/mcp/tools/public-tools';

describe('MCP Public Tools', () => {
	describe('QListTransformersTool', () => {
		it('should list available transformers', async () => {
			const tool = new QListTransformersTool();
			const result = await tool.execute();
			expect(result).toBeArray();
			expect(result).toContain('string');
			expect(result).toContain('date');
			expect(result.length).toBeGreaterThan(10);
		});
	});

	describe('QGenerateMockDataTool', () => {
		it('should generate mock data based on schema', async () => {
			const tool = new QGenerateMockDataTool();
			const schema = {
				name: 'string',
				age: 'number',
			};
			const result = await tool.execute({ schema, count: 3 });

			expect(result).toBeArray();
			expect(result).toHaveLength(3);
			expect(typeof result[0].name).toBe('string');
			expect(typeof result[0].age).toBe('number');
		});

		it('should handle non-existent transformers gracefully', async () => {
			const tool = new QGenerateMockDataTool();
			const schema = {
				unknown: 'weird_type',
			};
			// Might throw or ignore depending on logic. QuickModel usually ignores extra props or defaults.
			// Let's see behavior. The tool uses @Quick(schema).
			// If transformer not found, it might default or error.
			// Assuming defaults for now or just runs.
			const result = await tool.execute({ schema, count: 1 });
			expect(result).toBeArray();
		});
	});

	describe('QInspectModelTool', () => {
		it('should extract model structure from code', async () => {
			const tool = new QInspectModelTool();
			const code = `
            export class User extends QModel {
                @Quick({ name: 'string', email: 'email' })
                readonly data: any;
            }
            `;
			const result = await tool.execute({ code });

			expect(result.name).toBe('User');
			expect(result.transformers).toContain('string');
			expect(result.transformers).toContain('email');
			expect(result.transformers).toHaveLength(2);
		});

		it('should handle code without class definition', async () => {
			const tool = new QInspectModelTool();
			const code = 'const x = 1;';
			const result = await tool.execute({ code });

			expect(result.name).toBe('Unknown');
			expect(result.transformers).toBeArray();
			expect(result.transformers).toHaveLength(0);
		});
	});
});

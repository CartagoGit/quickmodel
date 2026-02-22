import { describe, it, expect } from 'bun:test';
import { QGetModelSchemaTool } from '../../../../src/mcp/tools/public/get-model-schema.tool';

const sampleCode = `
@Quick({ createdAt: Date, score: BigInt })
class UserModel extends QModel<any> {
  declare id: string;
  declare name: string;
  declare createdAt: Date;
  declare score: bigint;
}
`;

describe('QGetModelSchemaTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QGetModelSchemaTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('get_model_schema');
		expect(tool.description).toBeDefined();
	});

	it('should generate json schema with correct structure', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({ code: sampleCode, format: 'json' });

		expect(result.schema).toBeDefined();
		const schema = result.schema as any;
		expect(schema.type).toBe('object');
		expect(schema.properties).toBeDefined();
	});

	it('should generate typescript schema as string', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({
			code: sampleCode,
			format: 'typescript',
		});

		expect(typeof result.schema).toBe('string');
		expect(result.schema as string).toContain('interface');
	});

	it('should generate zod schema as object', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({ code: sampleCode, format: 'zod' });

		expect(result.schema).toBeDefined();
		expect(typeof result.schema).toBe('object');
	});

	it('should generate openapi schema', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({
			code: sampleCode,
			format: 'openapi',
		});

		expect(result.schema).toBeDefined();
		const schema = result.schema as any;
		expect(schema.type).toBe('object');
	});

	it('should generate mongo schema', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({
			code: sampleCode,
			format: 'mongo',
		});

		expect(result.schema).toBeDefined();
		const schema = result.schema as any;
		expect(schema).toBeObject();
	});

	it('should generate graphql schema as string', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({
			code: sampleCode,
			format: 'graphql',
		});

		expect(typeof result.schema).toBe('string');
		expect(result.schema as string).toContain('type');
	});

	it('should generate ajv schema', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({ code: sampleCode, format: 'ajv' });

		expect(result.schema).toBeDefined();
		const schema = result.schema as any;
		expect(schema.type).toBe('object');
	});

	it('should include the format in the response', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({ code: sampleCode, format: 'json' });

		expect(result.format).toBe('json');
	});

	it('should throw on unsupported format', async () => {
		const tool = new QGetModelSchemaTool();

		await expect(
			tool.execute({ code: sampleCode, format: 'invalid' as any })
		).rejects.toThrow();
	});
});

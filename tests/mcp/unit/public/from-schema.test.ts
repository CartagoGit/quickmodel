import { describe, it, expect } from 'bun:test';
import { QFromSchemaTool } from '../../../../src/mcp/tools/public/from-schema.tool';

describe('QFromSchemaTool', () => {
	it('has correct name and description', () => {
		const tool = new QFromSchemaTool();
		expect(tool.name).toBe('from_schema');
		expect(typeof tool.description).toBe('string');
		expect(tool.description.length).toBeGreaterThan(20);
	});

	it('has a valid Zod schema with required fields', () => {
		const tool = new QFromSchemaTool();
		expect(tool.schema).toBeDefined();
	});

	describe('format: json', () => {
		it('converts a JSON Schema to a QModel class', async () => {
			const tool = new QFromSchemaTool();
			const schema = JSON.stringify({
				type: 'object',
				title: 'User',
				properties: {
					name: { type: 'string' },
					age: { type: 'integer' },
				},
				required: ['name', 'age'],
			});

			const result = await tool.execute({ schema, format: 'json' });

			expect(result.code).toContain(
				"import { QModel, Quick } from 'quickmodel';"
			);
			expect(result.code).toContain('interface IUser {');
			expect(result.code).toContain('name: string;');
			expect(result.code).toContain('age: number;');
			expect(result.code).toContain('@Quick({');
			expect(result.code).toContain('class User extends QModel<IUser>');
		});

		it('applies supplied className over schema.title', async () => {
			const tool = new QFromSchemaTool();
			const schema = JSON.stringify({
				type: 'object',
				title: 'WrongName',
				properties: { val: { type: 'number' } },
			});

			const result = await tool.execute({
				schema,
				format: 'json',
				className: 'Product',
			});
			expect(result.code).toContain(
				'class Product extends QModel<IProduct>'
			);
		});

		it('uses GeneratedModel when no title and no className', async () => {
			const tool = new QFromSchemaTool();
			const schema = JSON.stringify({
				type: 'object',
				properties: { val: { type: 'number' } },
			});

			const result = await tool.execute({ schema, format: 'json' });
			expect(result.code).toContain(
				'class GeneratedModel extends QModel<IGeneratedModel>'
			);
		});

		it('maps date-time string field to Date transformer', async () => {
			const tool = new QFromSchemaTool();
			const schema = JSON.stringify({
				type: 'object',
				properties: {
					createdAt: { type: 'string', format: 'date-time' },
				},
			});

			const result = await tool.execute({ schema, format: 'json' });
			expect(result.code).toContain('createdAt: Date');
		});
	});

	describe('format: ajv', () => {
		it('converts an AJV-compatible JSON Schema to a QModel class', async () => {
			const tool = new QFromSchemaTool();
			const schema = JSON.stringify({
				type: 'object',
				properties: {
					email: { type: 'string' },
					active: { type: 'boolean' },
				},
				required: ['email'],
			});

			const result = await tool.execute({
				schema,
				format: 'ajv',
				className: 'Config',
			});
			expect(result.code).toContain(
				'class Config extends QModel<IConfig>'
			);
			expect(result.code).toContain('email: string;');
			expect(result.code).toContain('active?: boolean;');
		});
	});

	describe('format: openapi', () => {
		it('converts an OpenAPI components.schemas entry to a QModel class', async () => {
			const tool = new QFromSchemaTool();
			const schema = JSON.stringify({
				openapi: '3.0.0',
				components: {
					schemas: {
						Order: {
							type: 'object',
							properties: {
								total: { type: 'number' },
								status: { type: 'string' },
							},
							required: ['total'],
						},
					},
				},
			});

			const result = await tool.execute({ schema, format: 'openapi' });
			expect(result.code).toContain('class Order extends QModel<IOrder>');
			expect(result.code).toContain('total: number;');
			expect(result.code).toContain('status?: string;');
		});
	});

	describe('format: typescript', () => {
		it('converts a TypeScript interface to a QModel class', async () => {
			const tool = new QFromSchemaTool();
			const schema = `
interface IProduct {
  name: string;
  price: number;
  createdAt: Date;
}
`;

			const result = await tool.execute({ schema, format: 'typescript' });
			expect(result.code).toContain(
				'class Product extends QModel<IProduct>'
			);
			expect(result.code).toContain('declare name: string;');
			expect(result.code).toContain('declare price: number;');
			expect(result.code).toContain('declare createdAt: Date;');
			expect(result.code).toContain('createdAt: Date');
		});
	});

	describe('error handling', () => {
		it('throws on invalid JSON string', async () => {
			const tool = new QFromSchemaTool();
			let threw = false;
			try {
				await tool.execute({
					schema: 'not-valid-json{',
					format: 'json',
				});
			} catch {
				threw = true;
			}
			expect(threw).toBe(true);
		});

		it('throws when format is typescript and no interface found', async () => {
			const tool = new QFromSchemaTool();
			let threw = false;
			try {
				await tool.execute({
					schema: 'type IFoo = { x: string }',
					format: 'typescript',
				});
			} catch {
				threw = true;
			}
			expect(threw).toBe(true);
		});
	});
});

import { describe, it, expect } from 'bun:test';
import {
	QListTransformersTool,
	QGenerateMockDataTool,
	QInspectModelTool,
	QJsonToModelTool,
} from '../../../../src/mcp/tools/public';

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
		});

		it('should detect @Quick in decorators list', async () => {
			const tool = new QInspectModelTool();
			const code = `
				@Quick({ name: 'string' })
				export class User extends QModel<IUser> {
					declare name: string;
				}
			`;
			const result = await tool.execute({ code });
			expect(result.decorators).toBeDefined();
			expect(result.decorators).toContain('@Quick');
			expect(result.decorators).not.toContain('@QRule');
		});

		it('should detect @QRule, @QField, @QGroup in decorators list', async () => {
			const tool = new QInspectModelTool();
			const code = `
				@Quick({ name: 'string' })
				export class User extends QModel<IUser> {
					@QRule((s) => s.name.length > 0, 'required')
					@QField({ widget: 'input', label: 'Name', required: true })
					@QGroup('identity')
					declare name: string;
				}
			`;
			const result = await tool.execute({ code });
			expect(result.decorators).toContain('@Quick');
			expect(result.decorators).toContain('@QRule');
			expect(result.decorators).toContain('@QField');
			expect(result.decorators).toContain('@QGroup');
		});

		it('should detect @QComputed and @QAlias', async () => {
			const tool = new QInspectModelTool();
			const code = `
				export class User extends QModel<IUser> {
					declare name: string;
					@QAlias('user_name')
					declare userName: string;
					@QComputed((self) => self.name.toUpperCase())
					declare displayName: string;
				}
			`;
			const result = await tool.execute({ code });
			expect(result.decorators).toContain('@QAlias');
			expect(result.decorators).toContain('@QComputed');
		});

		it('should return empty decorators for plain class', async () => {
			const tool = new QInspectModelTool();
			const code = `
				export class User extends QModel<IUser> {
					declare name: string;
				}
			`;
			const result = await tool.execute({ code });
			expect(result.decorators).toBeArray();
			expect(result.decorators).toHaveLength(0);
		});
	});

	describe('QJsonToModelTool', () => {
		it('should convert simple json to model', async () => {
			const tool = new QJsonToModelTool();
			const json = JSON.stringify({
				name: 'John',
				age: 30,
				isAdmin: true,
			});

			const result = await tool.execute({ json, className: 'User' });
			expect(result.code).toContain('class User extends QModel<IUser>');
			expect(result.code).toContain("name: 'string'");
			expect(result.code).toContain("age: 'number'");
			expect(result.code).toContain("isAdmin: 'boolean'");
			expect(result.code).toContain('declare name: string;');
			expect(result.code).toContain('declare age: number;');
			expect(result.code).toContain('declare isAdmin: boolean;');
		});

		it('should infer date type', async () => {
			const tool = new QJsonToModelTool();
			const json = JSON.stringify({
				createdAt: '2024-01-01T12:00:00Z',
				birth: '2000-01-01',
			});

			const result = await tool.execute({
				json,
				className: 'DateModel',
			});
			expect(result.code).toContain('createdAt: Date');
			expect(result.code).toContain('birth: Date');
		});

		it('should fail on invalid json', async () => {
			const tool = new QJsonToModelTool();
			const json = '{ invalid json ';

			// Using try/catch because bun:test expect().toThrow() with async can be finicky depending on version
			try {
				await tool.execute({ json, className: 'Fail' });
				expect(true).toBe(false); // Fail if no error
			} catch (err: any) {
				expect(err.message).toContain('Invalid JSON');
			}
		});

		it('should fail if json is not an object', async () => {
			const tool = new QJsonToModelTool();
			try {
				await tool.execute({ json: '123', className: 'Fail' });
				expect(true).toBe(false);
			} catch (err: any) {
				expect(err.message).toContain('must be an object');
			}
		});
	});
});

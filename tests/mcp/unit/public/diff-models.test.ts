import { describe, it, expect } from 'bun:test';
import { QDiffModelsTool } from '../../../../src/mcp/tools/public/diff-models.tool';

const BASE = `
@Quick({ createdAt: Date })
class UserModel extends QModel<UserModel> {
  declare name: string;
  declare age: number;
  declare createdAt: Date;
}
`;

describe('QDiffModelsTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QDiffModelsTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('diff_models');
		expect(tool.description).toBeDefined();
	});

	it('identical models should return all-empty diffs', async () => {
		const tool = new QDiffModelsTool();
		const result = await tool.execute({ model_a: BASE, model_b: BASE });

		expect(result.added_fields).toHaveLength(0);
		expect(result.removed_fields).toHaveLength(0);
		expect(result.changed_fields).toHaveLength(0);
		expect(result.changed_transformers).toHaveLength(0);
		expect(result.summary).toBeDefined();
	});

	it('should detect an added field in model_b', async () => {
		const tool = new QDiffModelsTool();
		const modelB = BASE + '\n// extends\ndeclare email: string;';
		const result = await tool.execute({ model_a: BASE, model_b: modelB });

		expect(result.added_fields).toContain('email');
	});

	it('should detect a removed field', async () => {
		const tool = new QDiffModelsTool();
		const modelB = `
@Quick({})
class UserModel extends QModel<UserModel> {
  declare name: string;
}
`;
		const result = await tool.execute({ model_a: BASE, model_b: modelB });

		expect(result.removed_fields).toContain('age');
		expect(result.removed_fields).toContain('createdAt');
	});

	it('should detect a changed transformer (Date removed)', async () => {
		const tool = new QDiffModelsTool();
		const modelB = `
@Quick({})
class UserModel extends QModel<UserModel> {
  declare name: string;
  declare age: number;
  declare createdAt: Date;
}
`;
		const result = await tool.execute({ model_a: BASE, model_b: modelB });

		expect(result.changed_transformers.length).toBeGreaterThan(0);
	});

	it('should detect a changed transformer (Date added)', async () => {
		const tool = new QDiffModelsTool();
		const modelB = `
@Quick({ createdAt: Date, age: Number })
class UserModel extends QModel<UserModel> {
  declare name: string;
  declare age: number;
  declare createdAt: Date;
}
`;
		const result = await tool.execute({ model_a: BASE, model_b: modelB });

		expect(result.changed_transformers.length).toBeGreaterThan(0);
	});

	it('should include a summary string', async () => {
		const tool = new QDiffModelsTool();
		const result = await tool.execute({ model_a: BASE, model_b: BASE });

		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should detect added decorators (e.g. @QField added)', async () => {
		const tool = new QDiffModelsTool();
		const modelA = `@Quick({}) class M extends QModel<M> { declare name: string; }`;
		const modelB = `@Quick({}) class M extends QModel<M> { @QField({ widget: 'input' }) declare name: string; }`;
		const result = await tool.execute({ model_a: modelA, model_b: modelB });

		expect(result.added_decorators.length).toBeGreaterThan(0);
	});

	it('should detect removed decorators', async () => {
		const tool = new QDiffModelsTool();
		const modelA = `@Quick({}) class M extends QModel<M> { @QField({ widget: 'input' }) declare name: string; }`;
		const modelB = `@Quick({}) class M extends QModel<M> { declare name: string; }`;
		const result = await tool.execute({ model_a: modelA, model_b: modelB });

		expect(result.removed_decorators.length).toBeGreaterThan(0);
	});
});

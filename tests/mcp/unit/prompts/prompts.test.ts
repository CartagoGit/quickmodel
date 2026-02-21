import { describe, it, expect } from 'bun:test';
import { QAbstractPrompt } from '../../../../src/mcp/prompts/abstract-prompt';
import { QFromTypescriptPrompt } from '../../../../src/mcp/prompts/public/from-typescript.prompt';
import { QDebugModelPrompt } from '../../../../src/mcp/prompts/public/debug-model.prompt';
import { QGenerateTestDataPrompt } from '../../../../src/mcp/prompts/public/generate-test-data.prompt';
import { QInspectAndSchemaPrompt } from '../../../../src/mcp/prompts/public/inspect-and-schema.prompt';
import type { IQPromptResult } from '../../../../src/mcp/prompts/abstract-prompt';
import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────────────────────────

function assertValidResult(result: IQPromptResult): void {
	expect(result).toBeDefined();
	expect(Array.isArray(result.messages)).toBe(true);
	expect(result.messages.length).toBeGreaterThan(0);
	for (const msg of result.messages) {
		expect(['user', 'assistant']).toContain(msg.role);
		expect(msg.content.type).toBe('text');
		expect(typeof msg.content.text).toBe('string');
		expect(msg.content.text.length).toBeGreaterThan(0);
	}
}

// ── QAbstractPrompt (via a concrete subclass) ─────────────────────────────────

describe('QAbstractPrompt', () => {
	class ConcretePrompt extends QAbstractPrompt<{ input: z.ZodString }> {
		name = 'test_prompt';
		title = 'Test Prompt';
		description = 'A test prompt';
		argsSchema = { input: z.string().describe('Some input') };

		async execute(args: { input: string }): Promise<IQPromptResult> {
			return {
				messages: [
					this.user(`Input: ${args.input}`),
					this.assistant('Done'),
				],
			};
		}
	}

	it('should instantiate concrete subclass', () => {
		const prompt = new ConcretePrompt();
		expect(prompt).toBeDefined();
		expect(prompt.name).toBe('test_prompt');
		expect(prompt.title).toBe('Test Prompt');
		expect(prompt.description).toBe('A test prompt');
	});

	it('user() helper returns correct message shape', async () => {
		const prompt = new ConcretePrompt();
		const result = await prompt.execute({ input: 'hello' });
		const userMsg = result.messages[0];
		expect(userMsg.role).toBe('user');
		expect(userMsg.content.type).toBe('text');
		expect(userMsg.content.text).toContain('hello');
	});

	it('assistant() helper returns correct message shape', async () => {
		const prompt = new ConcretePrompt();
		const result = await prompt.execute({ input: 'world' });
		const assistantMsg = result.messages[1];
		expect(assistantMsg.role).toBe('assistant');
		expect(assistantMsg.content.type).toBe('text');
		expect(assistantMsg.content.text).toBe('Done');
	});

	it('argsSchema is a valid Zod record', () => {
		const prompt = new ConcretePrompt();
		expect(prompt.argsSchema.input).toBeDefined();
		expect(() => prompt.argsSchema.input.parse('test')).not.toThrow();
	});
});

// ── QFromTypescriptPrompt ────────────────────────────────────────────────────

describe('QFromTypescriptPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QFromTypescriptPrompt();
		expect(prompt.name).toBe('quickmodel_from_typescript');
		expect(prompt.title).toContain('TypeScript');
		expect(prompt.description.length).toBeGreaterThan(20);
		expect(prompt.argsSchema.typescript).toBeDefined();
		expect(prompt.argsSchema.model_name).toBeDefined();
	});

	it('execute() returns valid prompt result for a basic interface', async () => {
		const prompt = new QFromTypescriptPrompt();
		const result = await prompt.execute({
			typescript: 'interface IUser { id: number; name: string; }',
		});
		assertValidResult(result);
		expect(result.description).toBeDefined();
	});

	it('execute() includes the TypeScript code in the user message', async () => {
		const prompt = new QFromTypescriptPrompt();
		const result = await prompt.execute({
			typescript: 'interface IOrder { total: number; }',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('IOrder');
	});

	it('execute() includes model_name when provided', async () => {
		const prompt = new QFromTypescriptPrompt();
		const result = await prompt.execute({
			typescript: 'interface IOrder { total: number; }',
			model_name: 'OrderModel',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('OrderModel');
	});

	it('execute() references interface_to_model and validate_usage tools', async () => {
		const prompt = new QFromTypescriptPrompt();
		const result = await prompt.execute({
			typescript: 'interface IProduct { price: number; }',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('interface_to_model');
		expect(allText).toContain('validate_usage');
	});

	it('execute() starts with a user role message', async () => {
		const prompt = new QFromTypescriptPrompt();
		const result = await prompt.execute({
			typescript: 'interface IFoo {}',
		});
		expect(result.messages[0].role).toBe('user');
	});
});

// ── QDebugModelPrompt ────────────────────────────────────────────────────────

describe('QDebugModelPrompt', () => {
	const MODEL_CODE = `
@Quick({ name: String })
export class UserModel extends QModel<IUser> {
  declare name: string;
}`;

	it('should have correct metadata', () => {
		const prompt = new QDebugModelPrompt();
		expect(prompt.name).toBe('quickmodel_debug');
		expect(prompt.title).toContain('Debug');
		expect(prompt.argsSchema.model_code).toBeDefined();
		expect(prompt.argsSchema.error).toBeDefined();
		expect(prompt.argsSchema.sample_data).toBeDefined();
	});

	it('execute() returns valid result with only model_code', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		assertValidResult(result);
	});

	it('execute() references inspect_model tool', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('inspect_model');
	});

	it('execute() references explain_error when error is provided', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			error: 'ValidationError: field "name" failed',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('explain_error');
	});

	it('execute() references simulate_transformation when sample_data is provided', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			sample_data: '{"name": "Alice"}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('simulate_transformation');
	});

	it('execute() includes all tools when all args are provided', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			error: 'TypeError: X',
			sample_data: '{"name": "Bob"}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('inspect_model');
		expect(allText).toContain('explain_error');
		expect(allText).toContain('validate_usage');
		expect(allText).toContain('simulate_transformation');
	});
});

// ── QGenerateTestDataPrompt ──────────────────────────────────────────────────

describe('QGenerateTestDataPrompt', () => {
	const MODEL_CODE = `
@Quick({ createdAt: Date })
export class EventModel extends QModel<IEvent> {
  declare createdAt: Date;
}`;

	it('should have correct metadata', () => {
		const prompt = new QGenerateTestDataPrompt();
		expect(prompt.name).toBe('quickmodel_generate_test_data');
		expect(prompt.title).toContain('Test');
		expect(prompt.argsSchema.model_code).toBeDefined();
		expect(prompt.argsSchema.count).toBeDefined();
		expect(prompt.argsSchema.context).toBeDefined();
	});

	it('execute() returns valid result', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		assertValidResult(result);
	});

	it('execute() references generate_mock tool', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('generate_mock');
	});

	it('execute() references inspect_model and simulate_transformation', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('inspect_model');
		expect(allText).toContain('simulate_transformation');
	});

	it('execute() includes count when provided', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			count: '5',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('5');
	});

	it('execute() includes context when provided', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			context: 'e-commerce checkout test',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('e-commerce checkout test');
	});
});

// ── QInspectAndSchemaPrompt ──────────────────────────────────────────────────

describe('QInspectAndSchemaPrompt', () => {
	const MODEL_CODE = `
@Quick({ price: Number })
export class ProductModel extends QModel<IProduct> {
  declare price: number;
}`;

	it('should have correct metadata', () => {
		const prompt = new QInspectAndSchemaPrompt();
		expect(prompt.name).toBe('quickmodel_inspect_and_schema');
		expect(prompt.title).toContain('Schema');
		expect(prompt.argsSchema.model_code).toBeDefined();
		expect(prompt.argsSchema.formats).toBeDefined();
	});

	it('execute() returns valid result without formats', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		assertValidResult(result);
	});

	it('execute() references inspect_model tool', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('inspect_model');
	});

	it('execute() references export_json_schema tool', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('export_json_schema');
	});

	it('execute() mentions requested formats when provided', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			formats: 'json,zod',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('json');
		expect(allText).toContain('zod');
	});

	it('execute() returns all known formats when no formats provided', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		// Should mention multiple formats (the defaults)
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/json|openapi|zod|typescript/i);
	});
});

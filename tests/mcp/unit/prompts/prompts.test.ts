import { describe, it, expect } from 'bun:test';
import { QAbstractPrompt } from '../../../../src/mcp/prompts/abstract-prompt';
import { QFromTypescriptPrompt } from '../../../../src/mcp/prompts/public/from-typescript.prompt';
import { QDebugModelPrompt } from '../../../../src/mcp/prompts/public/debug-model.prompt';
import { QGenerateTestDataPrompt } from '../../../../src/mcp/prompts/public/generate-test-data.prompt';
import { QInspectAndSchemaPrompt } from '../../../../src/mcp/prompts/public/inspect-and-schema.prompt';
import { QFormValidationPrompt } from '../../../../src/mcp/prompts/public/form-validation.prompt';
import { QFullPipelinePrompt } from '../../../../src/mcp/prompts/public/full-pipeline.prompt';
import { QMixinPrompt } from '../../../../src/mcp/prompts/public/mixin.prompt';
import { QAliasComputedPrompt } from '../../../../src/mcp/prompts/public/alias-computed.prompt';
import { QMigrationPrompt } from '../../../../src/mcp/prompts/public/migration.prompt';
import { QAsyncRulesPrompt } from '../../../../src/mcp/prompts/public/async-rules.prompt';
import { QAddQGroupPrompt } from '../../../../src/mcp/prompts/public/add-qgroup.prompt';
import { QSecurityReviewPrompt } from '../../../../src/mcp/prompts/public/security-review.prompt';
import { QTransformerGuidePrompt } from '../../../../src/mcp/prompts/public/transformer-guide.prompt';
import { QImplementFeaturePrompt } from '../../../../src/mcp/prompts/public/implement-feature.prompt';
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

// ── QFormValidationPrompt ─────────────────────────────────────────────────────

describe('QFormValidationPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QFormValidationPrompt();
		expect(prompt.name).toBe('quickmodel_form_validation');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema.form_description).toBeDefined();
	});

	it('argsSchema.fields is optional', () => {
		const prompt = new QFormValidationPrompt();
		expect(() => prompt.argsSchema.fields?.parse(undefined)).not.toThrow();
	});

	it('execute() returns a valid result with only form_description', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'User registration form with name, email and age',
		});
		assertValidResult(result);
	});

	it('execute() returns multiple messages (at least 3)', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Login form',
		});
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Contact form',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() references simulate_validation tool', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Payment form',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('simulate_validation');
	});

	it('execute() mentions @QRule in messages', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Profile form',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('@QRule');
	});

	it('execute() mentions @QField in messages', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Settings form',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('@QField');
	});

	it('execute() includes the form_description in messages', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Unique survey form ABC123',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('Unique survey form ABC123');
	});

	it('execute() includes provided fields when fields param is given', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'User form',
			fields: 'username, email, birthDate',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('username');
		expect(allText).toContain('email');
	});
});

// ── QFullPipelinePrompt ───────────────────────────────────────────────────────

const PIPELINE_CODE = `
@Quick({ createdAt: Date })
class Order extends QModel<any> {
  declare id: string;
  declare createdAt: Date;
  declare total: number;
}
`;

describe('QFullPipelinePrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QFullPipelinePrompt();
		expect(prompt.name).toBe('quickmodel_full_pipeline');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema.model_code).toBeDefined();
	});

	it('argsSchema.sample_data is optional', () => {
		const prompt = new QFullPipelinePrompt();
		expect(() =>
			prompt.argsSchema.sample_data?.parse(undefined)
		).not.toThrow();
	});

	it('execute() returns a valid result with only model_code', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() references create() in messages', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('create(');
	});

	it('execute() references check_integrity tool', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('check_integrity');
	});

	it('execute() references simulate_validation tool', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('simulate_validation');
	});

	it('execute() references serialize() or toJSON() in messages', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/serialize\(\)|toJSON\(\)/);
	});

	it('execute() includes sample_data in messages when provided', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({
			model_code: PIPELINE_CODE,
			sample_data: '{"id":"1","createdAt":"2024-01-01","total":99.9}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('2024-01-01');
	});

	it('execute() references simulate_transformation tool', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('simulate_transformation');
	});
});

// ── QMixinPrompt ──────────────────────────────────────────────────────────────

describe('QMixinPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QMixinPrompt();
		expect(prompt.name).toBe('quickmodel_mixin');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema.base_class).toBeDefined();
	});

	it('argsSchema.model_fields is optional', () => {
		const prompt = new QMixinPrompt();
		expect(() =>
			prompt.argsSchema.model_fields?.parse(undefined)
		).not.toThrow();
	});

	it('execute() returns a valid result with only base_class', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() references QModel.extends() in messages', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('QModel.extends(');
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() mentions IQImplements in messages', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('IQImplements');
	});

	it('execute() includes the base_class name in messages', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({
			base_class: 'SpecialBaseClass999',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('SpecialBaseClass999');
	});

	it('execute() mentions instanceof caveat about QModel', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/instanceof/);
	});

	it('execute() includes model_fields in messages when provided', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({
			base_class: 'MyBase',
			model_fields: 'createdAt: Date, status: string',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('createdAt');
	});
});

// ── QAliasComputedPrompt ─────────────────────────────────────────────────────

describe('QAliasComputedPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QAliasComputedPrompt();
		expect(prompt.name).toBe('quickmodel_alias_computed');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema).toBeDefined();
	});

	it('argsSchema.model_code is optional', () => {
		const prompt = new QAliasComputedPrompt();
		expect(prompt.argsSchema.model_code).toBeDefined();
	});

	it('execute() returns a valid result', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() mentions @QAlias in messages', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('@QAlias');
	});

	it('execute() mentions @QComputed in messages', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('@QComputed');
	});

	it('execute() references serialize() in messages', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/serialize\(\)|toJSON\(\)/);
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() includes model_code when provided', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({
			model_code: 'class UniqueModelXYZ extends QModel',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('UniqueModelXYZ');
	});
});

// ── QMigrationPrompt ─────────────────────────────────────────────────────────

describe('QMigrationPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QMigrationPrompt();
		expect(prompt.name).toBe('quickmodel_migration');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema).toBeDefined();
	});

	it('execute() returns a valid result', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class OldModel {}',
		});
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class OldModel {}',
		});
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() mentions declare in messages', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class OldModel {}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('declare');
	});

	it('execute() mentions @Quick in messages', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class OldModel {}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('@Quick');
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class OldModel {}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() includes the legacy_code in messages', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class LegacyModelXYZ9 {}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('LegacyModelXYZ9');
	});

	it('execute() mentions migration or v2 pattern', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({ legacy_code: 'class Old {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/migrat|v2|upgrade|update/i);
	});
});

// ── QAsyncRulesPrompt ─────────────────────────────────────────────────────────

describe('QAsyncRulesPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QAsyncRulesPrompt();
		expect(prompt.name).toBe('quickmodel_async_rules');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema).toBeDefined();
	});

	it('argsSchema.context is optional', () => {
		const prompt = new QAsyncRulesPrompt();
		expect(prompt.argsSchema.context).toBeDefined();
	});

	it('execute() returns a valid result', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({
			model_code: 'class M extends QModel {}',
		});
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({
			model_code: 'class M extends QModel {}',
		});
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() CLEARLY states this is only for async contexts', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		// Must explicitly warn: only use when predicates are truly async
		expect(allText).toMatch(/only|async.*predicate|predicate.*async/i);
	});

	it('execute() references checkRulesAsync()', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('checkRulesAsync(');
	});

	it('execute() explains timeoutMs option', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('timeoutMs');
	});

	it('execute() explains parallel vs serial mode', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/parallel|serial/);
	});

	it('execute() mentions NestJS or async context', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/NestJS|async context|database|API call/i);
	});

	it('execute() includes context in messages when provided', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({
			model_code: 'class M {}',
			context: 'NestJS service with TypeORM uniqueness check',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('TypeORM uniqueness check');
	});
});

// ── QAddQGroupPrompt ──────────────────────────────────────────────────────────

describe('QAddQGroupPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QAddQGroupPrompt();
		expect(prompt.name).toBe('quickmodel_add_qgroup');
		expect(prompt.description).toBeDefined();
	});

	it('argsSchema.model_code is required', () => {
		const prompt = new QAddQGroupPrompt();
		expect(prompt.argsSchema.model_code).toBeDefined();
	});

	it('argsSchema.group_name is optional', () => {
		const prompt = new QAddQGroupPrompt();
		expect(prompt.argsSchema.group_name).toBeDefined();
		const parsed = (
			prompt.argsSchema.group_name as z.ZodOptional<z.ZodString>
		).safeParse(undefined);
		expect(parsed.success).toBe(true);
	});

	it('execute() returns a valid result', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({
			model_code:
				'@Quick({}) class M extends QModel<M> { declare name: string; }',
		});
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() mentions @QGroup in messages', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('@QGroup');
	});

	it('execute() mentions checkGroups() in messages', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('checkGroups');
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() includes group_name when provided', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({
			model_code: 'class M {}',
			group_name: 'addressGroup',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('addressGroup');
	});
});

// ── QSecurityReviewPrompt ─────────────────────────────────────────────────────

describe('QSecurityReviewPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QSecurityReviewPrompt();
		expect(prompt.name).toBe('quickmodel_security_review');
		expect(prompt.description).toBeDefined();
	});

	it('argsSchema.model_code is optional', () => {
		const prompt = new QSecurityReviewPrompt();
		const parsed = (
			prompt.argsSchema.model_code as z.ZodOptional<z.ZodString>
		).safeParse(undefined);
		expect(parsed.success).toBe(true);
	});

	it('execute() returns a valid result', async () => {
		const prompt = new QSecurityReviewPrompt();
		const result = await prompt.execute({});
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QSecurityReviewPrompt();
		const result = await prompt.execute({});
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() mentions check_security tool', async () => {
		const prompt = new QSecurityReviewPrompt();
		const result = await prompt.execute({});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('check_security');
	});

	it('execute() mentions unknownPropertyPolicy hardening', async () => {
		const prompt = new QSecurityReviewPrompt();
		const result = await prompt.execute({});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toMatch(/unknownPropertyPolicy|strip|mass.?assign/i);
	});

	it('execute() includes model_code when provided', async () => {
		const prompt = new QSecurityReviewPrompt();
		const result = await prompt.execute({
			model_code:
				'@Quick({}) class UserModel extends QModel<UserModel> {}',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('UserModel');
	});
});

// ── QTransformerGuidePrompt ───────────────────────────────────────────────────

describe('QTransformerGuidePrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QTransformerGuidePrompt();
		expect(prompt.name).toBe('quickmodel_transformer_guide');
		expect(prompt.description).toBeDefined();
	});

	it('argsSchema.typescript_type is required', () => {
		const prompt = new QTransformerGuidePrompt();
		expect(prompt.argsSchema.typescript_type).toBeDefined();
	});

	it('execute() returns a valid result', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({ typescript_type: 'Date' });
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({ typescript_type: 'Date' });
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() mentions @Quick decorator in messages', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({ typescript_type: 'Date' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('@Quick');
	});

	it('execute() references simulate_transformation tool', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({
			typescript_type: 'Map<string, Date>',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('simulate_transformation');
	});

	it('execute() mentions the requested type in messages', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({ typescript_type: 'Set<number>' });
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('Set');
	});

	it('execute() includes sample_data hint when provided', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({
			typescript_type: 'Date',
			sample_data: '{ "created": "2024-01-01" }',
		});
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('2024-01-01');
	});
});

// ── QImplementFeaturePrompt ───────────────────────────────────────────────────
describe('QImplementFeaturePrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QImplementFeaturePrompt();
		expect(prompt.name).toBe('quickmodel_implement_feature');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
	});

	it('argsSchema.feature_description is required', () => {
		const prompt = new QImplementFeaturePrompt();
		const schema = prompt.argsSchema;
		const res = schema.feature_description.safeParse(undefined);
		expect(res.success).toBe(false);
	});

	it('argsSchema.file_paths is optional', () => {
		const prompt = new QImplementFeaturePrompt();
		const schema = prompt.argsSchema;
		const res = schema.file_paths?.safeParse(undefined);
		expect(res?.success).toBe(true);
	});

	it('execute() returns a valid result', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = await prompt.execute({
			feature_description: 'Add email validation to UserModel',
		});
		const typed = result as IQPromptResult;
		expect(typed).toBeDefined();
		expect(Array.isArray(typed.messages)).toBe(true);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() mandates lint_check in messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('lint_check');
	});

	it('execute() mandates typecheck in messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('typecheck');
	});

	it('execute() mandates check_project_rules in messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('check_project_rules');
	});

	it('execute() mentions TDD workflow (write test first)', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText.toLowerCase()).toMatch(
			/test|tdd|red.*green|failing test/
		);
	});

	it('execute() includes DONE gate message (refuses to skip lint)', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText.toLowerCase()).toMatch(/done|complete|finish|ready/);
	});

	it('execute() includes feature_description in messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'AddUniqueEmailRule',
		})) as IQPromptResult;
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('AddUniqueEmailRule');
	});

	it('execute() includes file_paths when provided', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add validation',
			file_paths: 'src/mcp/tools/public/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages.map((m) => m.content.text).join(' ');
		expect(allText).toContain('my-tool.ts');
	});
});

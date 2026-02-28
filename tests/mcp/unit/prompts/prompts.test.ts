import { describe, it, expect } from 'bun:test';
import { QAbstractPrompt } from '../../../../src/mcp/prompts/abstract-prompt';
import { QAbstractInternalPrompt } from '../../../../src/mcp/prompts/abstract-internal-prompt';
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
import { QFixLintPrompt } from '../../../../src/mcp/prompts/public/fix-lint.prompt';
import { QFixTypecheckPrompt } from '../../../../src/mcp/prompts/public/fix-typecheck.prompt';
import { QRefactorPrompt } from '../../../../src/mcp/prompts/public/refactor.prompt';
import { QApplySolidPrompt } from '../../../../src/mcp/prompts/public/apply-solid.prompt';
import { QSyncProjectPrompt } from '../../../../src/mcp/prompts/public/sync-project.prompt';
import { QFormDataPrompt } from '../../../../src/mcp/prompts/public/form-data.prompt';
import { QCheckDocsCoherencePrompt } from '../../../../src/mcp/prompts/public/check-docs-coherence.prompt';
import { QVerifyDeliveryPrompt } from '../../../../src/mcp/prompts/public/verify-delivery.prompt';
import { QRunScriptPrompt } from '../../../../src/mcp/prompts/public/run-script.prompt';
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

		execute(args: { input: string }): Promise<IQPromptResult> {
			return Promise.resolve({
				messages: [
					this.user(`Input: ${args.input}`),
					this.assistant('Done'),
				],
			});
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

// ── QAbstractInternalPrompt ─────────────────────────────────────────────────

describe('QAbstractInternalPrompt', () => {
	class ConcreteInternalPrompt extends QAbstractInternalPrompt<{
		msg: z.ZodString;
	}> {
		name = 'test_internal_prompt';
		title = 'Test Internal Prompt';
		description = 'A test internal prompt';
		argsSchema = { msg: z.string().describe('Message') };

		execute(args: { msg: string }): Promise<IQPromptResult> {
			return Promise.resolve({
				messages: [
					this.user(`First: ${args.msg}`),
					this.assistant('Acknowledged'),
					this.user(`Second: ${args.msg}`),
				],
			});
		}
	}

	it('injects INTERNAL_PROMPT_CONTEXT into the first user message', async () => {
		const prompt = new ConcreteInternalPrompt();
		const result = await prompt.execute({ msg: 'hello' });
		const firstUserText = result.messages[0]?.content.text ?? '';
		expect(firstUserText).toContain(
			'Contexto obligatorio del proyecto QuickModel'
		);
		expect(firstUserText).toContain('First: hello');
	});

	it('does NOT inject context into subsequent user messages', async () => {
		const prompt = new ConcreteInternalPrompt();
		const result = await prompt.execute({ msg: 'hello' });
		const secondUserText = result.messages[2]?.content.text ?? '';
		expect(secondUserText).not.toContain('Contexto obligatorio');
		expect(secondUserText).toContain('Second: hello');
	});

	it('context includes the tee rule for temp files', async () => {
		const prompt = new ConcreteInternalPrompt();
		const result = await prompt.execute({ msg: 'test' });
		const contextText = result.messages[0]?.content.text ?? '';
		expect(contextText).toContain('tee');
		expect(contextText).toContain('./tmp/');
	});

	it('context forbids the > redirect operator', async () => {
		const prompt = new ConcreteInternalPrompt();
		const result = await prompt.execute({ msg: 'test' });
		const contextText = result.messages[0]?.content.text ?? '';
		expect(contextText).toMatch(/NUNCA.*>|>.*NUNCA|aprobación manual/i);
	});

	it('does NOT re-inject context on a second execute() call on the same instance', async () => {
		const prompt = new ConcreteInternalPrompt();
		await prompt.execute({ msg: 'first run' });
		const result2 = await prompt.execute({ msg: 'second run' });
		// _contextSent stays true after first call — no double injection
		const textAfterSecondCall = result2.messages[0]?.content.text ?? '';
		expect(textAfterSecondCall).not.toContain('Contexto obligatorio');
		expect(textAfterSecondCall).toContain('First: second run');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('IOrder');
	});

	it('execute() includes model_name when provided', async () => {
		const prompt = new QFromTypescriptPrompt();
		const result = await prompt.execute({
			typescript: 'interface IOrder { total: number; }',
			model_name: 'OrderModel',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('OrderModel');
	});

	it('execute() references interface_to_model and validate_usage tools', async () => {
		const prompt = new QFromTypescriptPrompt();
		const result = await prompt.execute({
			typescript: 'interface IProduct { price: number; }',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
@Quick({ name: String }, { unknownPropertyPolicy: 'keep' })
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('inspect_model');
	});

	it('execute() references explain_error when error is provided', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			error: 'ValidationError: field "name" failed',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('explain_error');
	});

	it('execute() references simulate_transformation when sample_data is provided', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			sample_data: '{"name": "Alice"}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('simulate_transformation');
	});

	it('execute() includes all tools when all args are provided', async () => {
		const prompt = new QDebugModelPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			error: 'TypeError: X',
			sample_data: '{"name": "Bob"}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('inspect_model');
		expect(allText).toContain('explain_error');
		expect(allText).toContain('validate_usage');
		expect(allText).toContain('simulate_transformation');
	});
});

// ── QGenerateTestDataPrompt ──────────────────────────────────────────────────

describe('QGenerateTestDataPrompt', () => {
	const MODEL_CODE = `
@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('generate_mock');
	});

	it('execute() references inspect_model and simulate_transformation', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('inspect_model');
		expect(allText).toContain('simulate_transformation');
	});

	it('execute() includes count when provided', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			count: '5',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('5');
	});

	it('execute() includes context when provided', async () => {
		const prompt = new QGenerateTestDataPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			context: 'e-commerce checkout test',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('e-commerce checkout test');
	});
});

// ── QInspectAndSchemaPrompt ──────────────────────────────────────────────────

describe('QInspectAndSchemaPrompt', () => {
	const MODEL_CODE = `
@Quick({ price: Number }, { unknownPropertyPolicy: 'keep' })
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('inspect_model');
	});

	it('execute() references export_json_schema tool', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('export_json_schema');
	});

	it('execute() mentions requested formats when provided', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({
			model_code: MODEL_CODE,
			formats: 'json,zod',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('json');
		expect(allText).toContain('zod');
	});

	it('execute() returns all known formats when no formats provided', async () => {
		const prompt = new QInspectAndSchemaPrompt();
		const result = await prompt.execute({ model_code: MODEL_CODE });
		// Should mention multiple formats (the defaults)
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() references simulate_validation tool', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Payment form',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('simulate_validation');
	});

	it('execute() mentions @QRule in messages', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Profile form',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('@QRule');
	});

	it('execute() mentions @QField in messages', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Settings form',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('@QField');
	});

	it('execute() includes the form_description in messages', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'Unique survey form ABC123',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('Unique survey form ABC123');
	});

	it('execute() includes provided fields when fields param is given', async () => {
		const prompt = new QFormValidationPrompt();
		const result = await prompt.execute({
			form_description: 'User form',
			fields: 'username, email, birthDate',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('username');
		expect(allText).toContain('email');
	});
});

// ── QFullPipelinePrompt ───────────────────────────────────────────────────────

const PIPELINE_CODE = `
@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('create(');
	});

	it('execute() references check_integrity tool', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('check_integrity');
	});

	it('execute() references simulate_validation tool', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('simulate_validation');
	});

	it('execute() references serialize() or toJSON() in messages', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/serialize\(\)|toJSON\(\)/);
	});

	it('execute() includes sample_data in messages when provided', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({
			model_code: PIPELINE_CODE,
			sample_data: '{"id":"1","createdAt":"2024-01-01","total":99.9}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('2024-01-01');
	});

	it('execute() references simulate_transformation tool', async () => {
		const prompt = new QFullPipelinePrompt();
		const result = await prompt.execute({ model_code: PIPELINE_CODE });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('QModel.extends(');
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() mentions IQImplements in messages', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('IQImplements');
	});

	it('execute() includes the base_class name in messages', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({
			base_class: 'SpecialBaseClass999',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('SpecialBaseClass999');
	});

	it('execute() mentions instanceof caveat about QModel', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({ base_class: 'NgComponent' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/instanceof/);
	});

	it('execute() includes model_fields in messages when provided', async () => {
		const prompt = new QMixinPrompt();
		const result = await prompt.execute({
			base_class: 'MyBase',
			model_fields: 'createdAt: Date, status: string',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('@QAlias');
	});

	it('execute() mentions @QComputed in messages', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('@QComputed');
	});

	it('execute() references serialize() in messages', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/serialize\(\)|toJSON\(\)/);
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() includes model_code when provided', async () => {
		const prompt = new QAliasComputedPrompt();
		const result = await prompt.execute({
			model_code: 'class UniqueModelXYZ extends QModel',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('declare');
	});

	it('execute() mentions @Quick in messages', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class OldModel {}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('@Quick');
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class OldModel {}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() includes the legacy_code in messages', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({
			legacy_code: 'class LegacyModelXYZ9 {}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('LegacyModelXYZ9');
	});

	it('execute() mentions migration or v2 pattern', async () => {
		const prompt = new QMigrationPrompt();
		const result = await prompt.execute({ legacy_code: 'class Old {}' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		// Must explicitly warn: only use when predicates are truly async
		expect(allText).toMatch(/only|async.*predicate|predicate.*async/i);
	});

	it('execute() references checkRulesAsync()', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('checkRulesAsync(');
	});

	it('execute() explains timeoutMs option', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('timeoutMs');
	});

	it('execute() explains parallel vs serial mode', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/parallel|serial/);
	});

	it('execute() mentions NestJS or async context', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/NestJS|async context|database|API call/i);
	});

	it('execute() includes context in messages when provided', async () => {
		const prompt = new QAsyncRulesPrompt();
		const result = await prompt.execute({
			model_code: 'class M {}',
			context: 'NestJS service with TypeORM uniqueness check',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const parsed = prompt.argsSchema.group_name.safeParse(undefined);
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('@QGroup');
	});

	it('execute() mentions checkGroups() in messages', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('checkGroups');
	});

	it('execute() references validate_usage tool', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({ model_code: 'class M {}' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() includes group_name when provided', async () => {
		const prompt = new QAddQGroupPrompt();
		const result = await prompt.execute({
			model_code: 'class M {}',
			group_name: 'addressGroup',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const parsed = prompt.argsSchema.model_code.safeParse(undefined);
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('check_security');
	});

	it('execute() mentions unknownPropertyPolicy hardening', async () => {
		const prompt = new QSecurityReviewPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/unknownPropertyPolicy|strip|mass.?assign/i);
	});

	it('execute() includes model_code when provided', async () => {
		const prompt = new QSecurityReviewPrompt();
		const result = await prompt.execute({
			model_code:
				'@Quick({}) class UserModel extends QModel<UserModel> {}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('@Quick');
	});

	it('execute() references simulate_transformation tool', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({
			typescript_type: 'Map<string, Date>',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('simulate_transformation');
	});

	it('execute() mentions the requested type in messages', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({ typescript_type: 'Set<number>' });
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('Set');
	});

	it('execute() includes sample_data hint when provided', async () => {
		const prompt = new QTransformerGuidePrompt();
		const result = await prompt.execute({
			typescript_type: 'Date',
			sample_data: '{ "created": "2024-01-01" }',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
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
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('lint_check');
	});

	it('execute() mandates typecheck in messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('typecheck');
	});

	it('execute() mandates check_project_rules in messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('check_project_rules');
	});

	it('execute() mentions TDD workflow (write test first)', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText.toLowerCase()).toMatch(
			/test|tdd|red.*green|failing test/
		);
	});

	it('execute() includes DONE gate message (refuses to skip lint)', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add email validation',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText.toLowerCase()).toMatch(/done|complete|finish|ready/);
	});

	it('execute() includes feature_description in messages', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'AddUniqueEmailRule',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('AddUniqueEmailRule');
	});

	it('execute() includes file_paths when provided', async () => {
		const prompt = new QImplementFeaturePrompt();
		const result = (await prompt.execute({
			feature_description: 'Add validation',
			file_paths: 'src/mcp/tools/public/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('my-tool.ts');
	});
});

// ── QFixLintPrompt ────────────────────────────────────────────────────────────
describe('QFixLintPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QFixLintPrompt();
		expect(prompt.name).toBe('quickmodel_fix_lint');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.description.length).toBeGreaterThan(10);
	});

	it('should have required lint_errors schema field', () => {
		const prompt = new QFixLintPrompt();
		const schema = prompt.argsSchema;
		expect(schema.lint_errors).toBeDefined();
		const parsed = schema.lint_errors.safeParse('some lint errors text');
		expect(parsed.success).toBe(true);
	});

	it('should have optional file_paths schema field', () => {
		const prompt = new QFixLintPrompt();
		const schema = prompt.argsSchema;
		expect(schema.file_paths).toBeDefined();
		const parsed = schema.file_paths.safeParse(undefined);
		expect(parsed.success).toBe(true);
	});

	it('should return a valid IQPromptResult', async () => {
		const prompt = new QFixLintPrompt();
		const result = (await prompt.execute({
			lint_errors:
				"src/foo.ts\n  12:3  error  id-length: 'fn' is too short",
		})) as IQPromptResult;
		expect(result).toBeDefined();
		expect(result.messages).toBeDefined();
		expect(Array.isArray(result.messages)).toBe(true);
	});

	it('should have at least 3 messages', async () => {
		const prompt = new QFixLintPrompt();
		const result = (await prompt.execute({
			lint_errors: 'src/foo.ts  12:3  error  id-length',
		})) as IQPromptResult;
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('should reference lint_check in the messages', async () => {
		const prompt = new QFixLintPrompt();
		const result = (await prompt.execute({
			lint_errors: 'src/foo.ts  12:3  error  id-length',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('lint_check');
	});

	it('should reference pre_commit_check in the messages', async () => {
		const prompt = new QFixLintPrompt();
		const result = (await prompt.execute({
			lint_errors: 'src/foo.ts  12:3  error  id-length',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('pre_commit_check');
	});

	it('should enforce a DONE gate (passed: true)', async () => {
		const prompt = new QFixLintPrompt();
		const result = (await prompt.execute({
			lint_errors: 'src/foo.ts  12:3  error  id-length',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('passed: true');
	});

	it('should include the lint_errors content in the messages', async () => {
		const prompt = new QFixLintPrompt();
		const errText = 'src/mcp/tools/public/foo.ts  5:3  error  no-console';
		const result = (await prompt.execute({
			lint_errors: errText,
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain(errText);
	});

	it('should mention file_paths in messages when provided', async () => {
		const prompt = new QFixLintPrompt();
		const result = (await prompt.execute({
			lint_errors: 'src/foo.ts  5:3  error  no-console',
			file_paths: 'src/foo.ts,src/bar.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('foo.ts');
		expect(allText).toContain('bar.ts');
	});
});

// ── QFixTypecheckPrompt ───────────────────────────────────────────────────────
describe('QFixTypecheckPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QFixTypecheckPrompt();
		expect(prompt.name).toBe('quickmodel_fix_typecheck');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.description.length).toBeGreaterThan(10);
	});

	it('should have required type_errors schema field', () => {
		const prompt = new QFixTypecheckPrompt();
		const schema = prompt.argsSchema;
		expect(schema.type_errors).toBeDefined();
		const parsed = schema.type_errors.safeParse('some type errors text');
		expect(parsed.success).toBe(true);
		const missing = schema.type_errors.safeParse(undefined);
		expect(missing.success).toBe(false);
	});

	it('should have optional file_paths schema field', () => {
		const prompt = new QFixTypecheckPrompt();
		const schema = prompt.argsSchema;
		expect(schema.file_paths).toBeDefined();
		const parsed = schema.file_paths?.safeParse(undefined);
		expect(parsed?.success).toBe(true);
	});

	it('should return a valid IQPromptResult', async () => {
		const prompt = new QFixTypecheckPrompt();
		const result = (await prompt.execute({
			type_errors:
				"src/foo.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
		})) as IQPromptResult;
		assertValidResult(result);
	});

	it('should have at least 3 messages', async () => {
		const prompt = new QFixTypecheckPrompt();
		const result = (await prompt.execute({
			type_errors:
				"src/foo.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
		})) as IQPromptResult;
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('should reference typecheck tool in the messages', async () => {
		const prompt = new QFixTypecheckPrompt();
		const result = (await prompt.execute({
			type_errors: 'src/foo.ts(10,5): error TS2322',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('typecheck');
	});

	it('should reference pre_commit_check in the messages', async () => {
		const prompt = new QFixTypecheckPrompt();
		const result = (await prompt.execute({
			type_errors: 'src/foo.ts(10,5): error TS2322',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('pre_commit_check');
	});

	it('should enforce a DONE gate (passed: true)', async () => {
		const prompt = new QFixTypecheckPrompt();
		const result = (await prompt.execute({
			type_errors: 'src/foo.ts(10,5): error TS2345',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('passed: true');
	});

	it('should include the type_errors content in the messages', async () => {
		const prompt = new QFixTypecheckPrompt();
		const errText =
			"src/mcp/tools/public/foo.ts(5,3): error TS7006: Parameter 'x' implicitly has an 'any' type.";
		const result = (await prompt.execute({
			type_errors: errText,
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain(errText);
	});

	it('should mention file_paths in messages when provided', async () => {
		const prompt = new QFixTypecheckPrompt();
		const result = (await prompt.execute({
			type_errors: 'src/foo.ts(5,3): error TS2322',
			file_paths: 'src/foo.ts,src/bar.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('foo.ts');
		expect(allText).toContain('bar.ts');
	});

	it('should contain common TS error codes in messages', async () => {
		const prompt = new QFixTypecheckPrompt();
		const result = (await prompt.execute({
			type_errors: 'src/foo.ts(5,3): error TS2322',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/TS2322|TS7006|TS2339|TS2345/);
	});
});

// ── QRefactorPrompt ───────────────────────────────────────────────────────────
describe('QRefactorPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QRefactorPrompt();
		expect(prompt.name).toBe('quickmodel_refactor');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.description.length).toBeGreaterThan(10);
	});

	it('should have required description schema field', () => {
		const prompt = new QRefactorPrompt();
		const schema = prompt.argsSchema;
		expect(schema.description).toBeDefined();
		const parsed = schema.description.safeParse('Extract helper function');
		expect(parsed.success).toBe(true);
		const missing = schema.description.safeParse(undefined);
		expect(missing.success).toBe(false);
	});

	it('should have optional file_paths schema field', () => {
		const prompt = new QRefactorPrompt();
		const schema = prompt.argsSchema;
		expect(schema.file_paths).toBeDefined();
		const parsed = schema.file_paths?.safeParse(undefined);
		expect(parsed?.success).toBe(true);
	});

	it('should return a valid IQPromptResult', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Extract the parsing logic into a private helper',
		})) as IQPromptResult;
		assertValidResult(result);
	});

	it('should have at least 3 messages', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Move validation logic to a base class',
		})) as IQPromptResult;
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('should reference lint_check in the messages', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Refactor parseOutput method',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('lint_check');
	});

	it('should reference typecheck in the messages', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Refactor parseOutput method',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('typecheck');
	});

	it('should reference check_project_rules in the messages', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Split large tool file into helpers',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('check_project_rules');
	});

	it('should enforce a DONE gate (passed: true)', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Rename variables to comply with id-length',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('passed: true');
	});

	it('should include the refactor description in the messages', async () => {
		const prompt = new QRefactorPrompt();
		const descText = 'ExtractUniqueHelperFunction9999';
		const result = (await prompt.execute({
			description: descText,
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain(descText);
	});

	it('should mention file_paths in messages when provided', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Refactor helper',
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('my-tool.ts');
	});

	it('should mention run_tests in messages (refactor must not break tests)', async () => {
		const prompt = new QRefactorPrompt();
		const result = (await prompt.execute({
			description: 'Inline helper functions',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('run_tests');
	});
});

// ── QApplySolidPrompt ──────────────────────────────────────────────────────
describe('QApplySolidPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QApplySolidPrompt();
		expect(prompt.name).toBe('quickmodel_apply_solid');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.description.length).toBeGreaterThan(10);
	});

	it('should have required file_paths schema field', () => {
		const prompt = new QApplySolidPrompt();
		const schema = prompt.argsSchema;
		expect(schema.file_paths).toBeDefined();
		const parsed = schema.file_paths.safeParse(
			'src/mcp/tools/internal/my-tool.ts'
		);
		expect(parsed.success).toBe(true);
		const missing = schema.file_paths.safeParse(undefined);
		expect(missing.success).toBe(false);
	});

	it('should have optional concern schema field', () => {
		const prompt = new QApplySolidPrompt();
		const schema = prompt.argsSchema;
		expect(schema.concern).toBeDefined();
		const parsed = schema.concern?.safeParse(undefined);
		expect(parsed?.success).toBe(true);
	});

	it('should return a valid IQPromptResult', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		assertValidResult(result);
	});

	it('should have at least 3 messages', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('should mention all 5 SOLID principles', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('SRP');
		expect(allText).toContain('OCP');
		expect(allText).toContain('LSP');
		expect(allText).toContain('ISP');
		expect(allText).toContain('DIP');
	});

	it('should reference lint_check in messages', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('lint_check');
	});

	it('should reference typecheck in messages', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('typecheck');
	});

	it('should reference run_tests in messages', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('run_tests');
	});

	it('should enforce a DONE gate (passed: true)', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('passed: true');
	});

	it('should include file_paths in messages', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/unique-tool-xyz.ts',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('unique-tool-xyz.ts');
	});

	it('should include concern in messages when provided', async () => {
		const prompt = new QApplySolidPrompt();
		const result = (await prompt.execute({
			file_paths: 'src/mcp/tools/internal/my-tool.ts',
			concern: 'The class has too many responsibilities UniqueXYZ',
		})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('UniqueXYZ');
	});
});

// ── QSyncProjectPrompt ──────────────────────────────────────────────────────
describe('QSyncProjectPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QSyncProjectPrompt();
		expect(prompt.name).toBe('quickmodel_sync_project');
		expect(prompt.title).toBeDefined();
		expect(prompt.description).toBeDefined();
		expect(prompt.description.length).toBeGreaterThan(10);
	});

	it('should have an empty argsSchema (no required inputs)', () => {
		const prompt = new QSyncProjectPrompt();
		const schema = prompt.argsSchema;
		expect(schema).toBeDefined();
	});

	it('should return a valid IQPromptResult', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		assertValidResult(result);
	});

	it('should have at least 3 messages', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('should reference project_status tool in messages', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('project_status');
	});

	it('should reference sync_docs tool in messages', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('sync_docs');
	});

	it('should reference run_tests in messages', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('run_tests');
	});

	it('should reference lint_check in messages', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('lint_check');
	});

	it('should enforce a clear DONE condition (all passed)', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/passed.*true|all.*green|everything.*pass/i);
	});

	it('should mention documentation in messages', async () => {
		const prompt = new QSyncProjectPrompt();
		const result = (await prompt.execute({})) as IQPromptResult;
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/doc|documentation/i);
	});
});

// ── QFormDataPrompt ───────────────────────────────────────────────────────────

describe('QFormDataPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QFormDataPrompt();
		expect(prompt.name).toBe('quickmodel_form_data');
		expect(prompt.title).toContain('FormData');
		expect(prompt.description).toBeDefined();
		expect(prompt.description.length).toBeGreaterThan(20);
	});

	it('argsSchema.scenario is required', () => {
		const prompt = new QFormDataPrompt();
		const res = prompt.argsSchema.scenario.safeParse(undefined);
		expect(res.success).toBe(false);
	});

	it('argsSchema.model_fields is optional', () => {
		const prompt = new QFormDataPrompt();
		const res = prompt.argsSchema.model_fields?.safeParse(undefined);
		expect(res?.success).toBe(true);
	});

	it('argsSchema.file_size is optional', () => {
		const prompt = new QFormDataPrompt();
		const res = prompt.argsSchema.file_size?.safeParse(undefined);
		expect(res?.success).toBe(true);
	});

	it('execute() returns a valid result with only scenario', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'User uploads avatar from a browser form',
		});
		assertValidResult(result);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'Server receives file upload',
		});
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() mentions fromFormData in messages', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'Read profile form data',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('fromFormData');
	});

	it('execute() mentions toFormData in messages', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'Submit profile form data',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('toFormData');
	});

	it('execute() mentions fileMode or fileSource in messages', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'Avatar upload with binary mode',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/fileMode|fileSource/);
	});

	it('execute() mentions IQStreamProgress in messages', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'Large video upload',
			file_size: 'large',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('IQStreamProgress');
	});

	it('execute() mentions toReadableStream for large files', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'Pipe 1 GB file to S3',
			file_size: 'large',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('toReadableStream');
	});

	it('execute() mentions isValid or validationReport before network operation', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'Submit form before calling API',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/isValid|validationReport/);
	});

	it('execute() includes the scenario in the output messages', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'UniqueScenario_XYZ_987',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('UniqueScenario_XYZ_987');
	});

	it('execute() includes model_fields when provided', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({
			scenario: 'User form',
			model_fields: 'avatar: File, uniqueFieldZZZ: string',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('uniqueFieldZZZ');
	});

	it('execute() starts with a user role message', async () => {
		const prompt = new QFormDataPrompt();
		const result = await prompt.execute({ scenario: 'Test scenario' });
		expect(result.messages[0]?.role).toBe('user');
	});
});

// ── QDrizzlePrompt ────────────────────────────────────────────────────────────

import { QDrizzlePrompt } from '../../../../src/mcp/prompts/public/drizzle.prompt';

describe('QDrizzlePrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QDrizzlePrompt();
		expect(prompt.name).toBe('quickmodel_drizzle');
		expect(prompt.title).toBe(
			'Generate QuickModel DTO from Drizzle ORM schema'
		);
		expect(prompt.description).toContain('Drizzle ORM');
	});

	it('should be an instance of QAbstractPrompt', () => {
		const prompt = new QDrizzlePrompt();
		expect(prompt).toBeInstanceOf(QAbstractPrompt);
	});

	it('should have drizzle_schema as required arg and dto_name as optional', () => {
		const prompt = new QDrizzlePrompt();
		expect(prompt.argsSchema.drizzle_schema).toBeDefined();
		expect(prompt.argsSchema.dto_name).toBeDefined();
		expect(prompt.argsSchema.patterns).toBeDefined();
	});

	it('execute() returns a valid IQPromptResult with required arg', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
		});
		expect(result).toHaveProperty('messages');
		expect(result).toHaveProperty('description');
		expect(Array.isArray(result.messages)).toBe(true);
	});

	it('execute() returns at least 3 messages', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
		});
		expect(result.messages.length).toBeGreaterThanOrEqual(3);
	});

	it('execute() starts with a user role message', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
		});
		expect(result.messages[0]?.role).toBe('user');
	});

	it('execute() mentions validate_usage step', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('validate_usage');
	});

	it('execute() mentions simulate_transformation step', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('simulate_transformation');
	});

	it('execute() maps timestamp() to Date in messages', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const posts = pgTable('posts', { createdAt: timestamp().notNull() })",
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/timestamp.*Date|Date.*timestamp/i);
	});

	it('execute() mentions unknownPropertyPolicy strip', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('unknownPropertyPolicy');
		expect(allText).toContain('strip');
	});

	it('execute() includes dto_name hint when provided', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
			dto_name: 'UserDto',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('UserDto');
	});

	it('execute() includes insert pattern step when requested', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
			patterns: 'insert',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/insert|CreateDto/i);
	});

	it('execute() includes repository pattern step when requested', async () => {
		const prompt = new QDrizzlePrompt();
		const result = await prompt.execute({
			drizzle_schema:
				"export const users = pgTable('users', { id: integer() })",
			dto_name: 'UserDto',
			patterns: 'repository',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('Repository');
	});
});

// ── QCheckDocsCoherencePrompt ─────────────────────────────────────────────────

describe('QCheckDocsCoherencePrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QCheckDocsCoherencePrompt();
		expect(prompt.name).toBe('quickmodel_check_docs_coherence');
		expect(prompt.title).toContain('Coherence');
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema).toBeDefined();
	});

	it('execute() returns valid result structure', async () => {
		const prompt = new QCheckDocsCoherencePrompt();
		const result = await prompt.execute({});
		assertValidResult(result);
	});

	it('execute() mentions check_jsdocs tool', async () => {
		const prompt = new QCheckDocsCoherencePrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('check_jsdocs');
	});

	it('execute() references EN and ES docs directories', async () => {
		const prompt = new QCheckDocsCoherencePrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/docs-vitepress\/en|docs-vitepress\/es/);
	});

	it('execute() references sidebar config.ts', async () => {
		const prompt = new QCheckDocsCoherencePrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('config.ts');
	});

	it('execute() mentions MCP description accuracy', async () => {
		const prompt = new QCheckDocsCoherencePrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('description');
	});

	it('execute() includes a DONE checklist', async () => {
		const prompt = new QCheckDocsCoherencePrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('[ ]');
	});
});

// ── QVerifyDeliveryPrompt ─────────────────────────────────────────────────────

describe('QVerifyDeliveryPrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QVerifyDeliveryPrompt();
		expect(prompt.name).toBe('quickmodel_verify_delivery');
		expect(prompt.title).toContain('Verify');
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema).toBeDefined();
	});

	it('execute() returns valid result structure', async () => {
		const prompt = new QVerifyDeliveryPrompt();
		const result = await prompt.execute({});
		assertValidResult(result);
	});

	it('execute() mentions check_project_health gate', async () => {
		const prompt = new QVerifyDeliveryPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('check_project_health');
	});

	it('execute() mentions check_project_rules gate', async () => {
		const prompt = new QVerifyDeliveryPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('check_project_rules');
	});

	it('execute() mentions pre_commit_check gate', async () => {
		const prompt = new QVerifyDeliveryPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('pre_commit_check');
	});

	it('execute() redirects to quickmodel_fix_lint on failure', async () => {
		const prompt = new QVerifyDeliveryPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('quickmodel_fix_lint');
	});

	it('execute() redirects to quickmodel_fix_typecheck on failure', async () => {
		const prompt = new QVerifyDeliveryPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('quickmodel_fix_typecheck');
	});

	it('execute() enforces not-done constraint until all gates pass', async () => {
		const prompt = new QVerifyDeliveryPrompt();
		const result = await prompt.execute({});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/NOT declare done|DONE condition/);
	});
});

// ── QRunScriptPrompt ──────────────────────────────────────────────────────────

describe('QRunScriptPrompt', () => {
	const PURPOSE =
		'Inspect VS Code extension package.json to list config keys';
	const SCRIPT =
		"import json\nwith open('package.json') as fle:\n    pkg = json.load(fle)\nprint(pkg.get('contributes', {}))";

	it('should have correct metadata', () => {
		const prompt = new QRunScriptPrompt();
		expect(prompt.name).toBe('quickmodel_run_script');
		expect(prompt.title).toContain('Script');
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema).toBeDefined();
	});

	it('argsSchema requires purpose and script', () => {
		const prompt = new QRunScriptPrompt();
		expect(prompt.argsSchema.purpose).toBeDefined();
		expect(prompt.argsSchema.script).toBeDefined();
		expect(prompt.argsSchema.language).toBeDefined();
	});

	it('execute() returns valid result structure', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		assertValidResult(result);
	});

	it('execute() includes purpose in messages', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain(PURPOSE);
	});

	it('execute() includes script content in messages', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('package.json');
	});

	it('execute() mentions audit phase', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/[Aa]udit/);
	});

	it('execute() mentions exit code check', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/exit code|non-zero/);
	});

	it('execute() mentions clean up phase', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toMatch(/[Cc]lean up|working tree/);
	});

	it('execute() references quickmodel_verify_delivery after code changes', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('quickmodel_verify_delivery');
	});

	it('execute() includes language label when provided', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
			language: 'python',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('python');
	});

	it('execute() includes DONE checklist', async () => {
		const prompt = new QRunScriptPrompt();
		const result = await prompt.execute({
			purpose: PURPOSE,
			script: SCRIPT,
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('[ ]');
	});
});

// ── QIntegratePrompt ──────────────────────────────────────────────────────────

import { QIntegratePrompt } from '../../../../src/mcp/prompts/public/integrate.prompt';

describe('QIntegratePrompt', () => {
	it('should have correct metadata', () => {
		const prompt = new QIntegratePrompt();
		expect(prompt.name).toBe('quickmodel_integrate');
		expect(prompt.description).toBeDefined();
		expect(prompt.argsSchema).toBeDefined();
	});

	it('execute() returns valid result structure', async () => {
		const prompt = new QIntegratePrompt();
		const result = await prompt.execute({
			library: 'express',
			use_case: 'validate request body',
		});
		assertValidResult(result);
	});

	it('execute() includes library name in messages', async () => {
		const prompt = new QIntegratePrompt();
		const result = await prompt.execute({
			library: 'fastify',
			use_case: 'parse query params',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('fastify');
	});

	it('execute() includes model_code context when provided', async () => {
		const prompt = new QIntegratePrompt();
		const result = await prompt.execute({
			library: 'axios',
			use_case: 'transform API response',
			model_code:
				'class IResponseModel extends QModel<IResponseModel> {}',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('IResponseModel');
	});

	it('execute() references generate_integration_test in messages', async () => {
		const prompt = new QIntegratePrompt();
		const result = await prompt.execute({
			library: 'nestjs',
			use_case: 'DTO validation',
		});
		const allText = result.messages
			.map((msg) => msg.content.text)
			.join(' ');
		expect(allText).toContain('generate_integration_test');
	});
});

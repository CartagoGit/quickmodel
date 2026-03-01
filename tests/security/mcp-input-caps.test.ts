import { describe, test, expect } from 'bun:test';
import { QValidateUsageTool } from '../../src/mcp/tools/public/validate-usage.tool';
import { QJsonToModelTool } from '../../src/mcp/tools/public/json-to-model.tool';
import { QInterfaceToModelTool } from '../../src/mcp/tools/public/interface-to-model.tool';
import { QGenerateFeatureTestsTool } from '../../src/mcp/tools/public/generate-feature-tests.tool';
import { QGenerateIntegrationTestTool } from '../../src/mcp/tools/public/generate-integration-test.tool';
import { QInspectModelTool } from '../../src/mcp/tools/public/inspect-model.tool';
import { QExportJsonSchemaTool } from '../../src/mcp/tools/public/export-schema.tool';
import { QDiffModelsTool } from '../../src/mcp/tools/public/diff-models.tool';
import { QCreateModelTool } from '../../src/mcp/tools/public/create-model.tool';
import { QExplainErrorTool } from '../../src/mcp/tools/public/explain-error.tool';
import { QFromSchemaTool } from '../../src/mcp/tools/public/from-schema.tool';
import { QSimulateValidationTool } from '../../src/mcp/tools/public/simulate-validation.tool';
import { QSimulateRulesTool } from '../../src/mcp/tools/public/simulate-rules.tool';
import { QSimulateAsyncRulesTool } from '../../src/mcp/tools/public/simulate-async-rules.tool';
import { QCreateGuidePageTool } from '../../src/mcp/tools/internal/create-guide-page.tool';
import { QGetFormSchemaTool } from '../../src/mcp/tools/public/get-form-schema.tool';
import { QGetModelSchemaTool } from '../../src/mcp/tools/public/get-model-schema.tool';
import { QAgentCoordinateTool } from '../../src/mcp/tools/internal/agent-coordinate.tool';
import { QScaffoldFeatureTool } from '../../src/mcp/tools/internal/scaffold-feature.tool';
import { QListTodosTool } from '../../src/mcp/tools/internal/list-todos.tool';
import { QSuggestVersionMigrationTool } from '../../src/mcp/tools/public/suggest-version-migration.tool';
import { QCheckChangelogTool } from '../../src/mcp/tools/internal/check-changelog.tool';
import { QCheckProjectRulesTool } from '../../src/mcp/tools/internal/check-project-rules.tool';
import { QLintCheckTool } from '../../src/mcp/tools/internal/lint-check.tool';
import { QExplainTransformationTool } from '../../src/mcp/tools/public/explain-transformation.tool';
import { QCheckIntegrityTool } from '../../src/mcp/tools/public/check-integrity.tool';
import { QRoundtripTool } from '../../src/mcp/tools/public/roundtrip.tool';
import { QSimulateTransformationTool } from '../../src/mcp/tools/public/simulate-transformation.tool';
import { QPatchJSDocTool } from '../../src/mcp/tools/internal/patch-jsdoc.tool';
import { QManageProposalTool } from '../../src/mcp/tools/internal/manage-proposal.tool';
import { QGenerateTestTool } from '../../src/mcp/tools/internal/generate-test.tool';
import { QRunTestsTool } from '../../src/mcp/tools/internal/run-tests.tool';
import { QDeprecationTrackerTool } from '../../src/mcp/tools/internal/deprecation-tracker.tool';
import { QValidateExamplesTool } from '../../src/mcp/tools/internal/validate-examples.tool';

/**
 * LOW-05..09 — DoS via unbounded string inputs in code-analysis and code-generation tools.
 * Each tool must cap its string inputs at schema level to prevent regex/parser exhaustion.
 */

// LOW-05 ──────────────────────────────────────────────────────────────────────

describe('LOW-05 — validate_usage: code string must be capped', () => {
	const tool = new QValidateUsageTool();

	test('schema should reject code longer than 50 000 chars', () => {
		const huge = 'x'.repeat(50_001);
		const schema = (tool as any).schema;
		const result = schema.safeParse({ code: huge });
		expect(result.success).toBe(false);
	});

	test('schema should accept code within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			code: 'class Foo extends QModel<IFoo> {}',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-06 ──────────────────────────────────────────────────────────────────────

describe('LOW-06 — json_to_model: json/className strings must be capped', () => {
	const tool = new QJsonToModelTool();

	test('schema should reject json longer than 50 000 chars', () => {
		const huge = '{"x":"' + 'a'.repeat(50_001) + '"}';
		const schema = (tool as any).schema;
		const result = schema.safeParse({ json: huge });
		expect(result.success).toBe(false);
	});

	test('schema should reject className longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			json: '{}',
			className: 'A'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept json within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ json: '{"name":"Alice"}' });
		expect(result.success).toBe(true);
	});
});

// LOW-07 ──────────────────────────────────────────────────────────────────────

describe('LOW-07 — interface_to_model: code string must be capped', () => {
	const tool = new QInterfaceToModelTool();

	test('schema should reject code longer than 50 000 chars', () => {
		const huge = 'x'.repeat(50_001);
		const schema = (tool as any).schema;
		const result = schema.safeParse({ code: huge });
		expect(result.success).toBe(false);
	});

	test('schema should accept code within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			code: 'interface IFoo { name: string; }',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-08 ──────────────────────────────────────────────────────────────────────

describe('LOW-08 — generate_feature_tests: decorator/model_name strings must be capped', () => {
	const tool = new QGenerateFeatureTestsTool();

	test('schema should reject decorator longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ decorator: '@'.repeat(101) });
		expect(result.success).toBe(false);
	});

	test('schema should reject model_name longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			decorator: '@Quick',
			model_name: 'A'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept valid inputs', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			decorator: '@Quick',
			model_name: 'TestModel',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-09 ──────────────────────────────────────────────────────────────────────

describe('LOW-09 — generate_integration_test: model name strings must be capped', () => {
	const tool = new QGenerateIntegrationTestTool();

	test('schema should reject base_model longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ base_model: 'A'.repeat(101) });
		expect(result.success).toBe(false);
	});

	test('schema should reject child_model longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			base_model: 'BaseModel',
			child_model: 'A'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept valid inputs', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			base_model: 'UserModel',
			child_model: 'AdminModel',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-10 ──────────────────────────────────────────────────────────────────────

describe('LOW-10 — inspect_model: code string must be capped at 50 000 chars', () => {
	const tool = new QInspectModelTool();

	test('schema should reject code longer than 50 000 chars', () => {
		const huge = 'x'.repeat(50_001);
		const schema = (tool as any).schema;
		const result = schema.safeParse({ code: huge });
		expect(result.success).toBe(false);
	});

	test('schema should accept code within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			code: 'class Foo extends QModel<IFoo> {}',
		});
		expect(result.success).toBe(true);
	});
});

describe('LOW-10 — export_json_schema: code string must be capped at 50 000 chars', () => {
	const tool = new QExportJsonSchemaTool();

	test('schema should reject code longer than 50 000 chars', () => {
		const huge = 'x'.repeat(50_001);
		const schema = (tool as any).schema;
		const result = schema.safeParse({ code: huge });
		expect(result.success).toBe(false);
	});

	test('schema should accept code within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			code: 'class Bar extends QModel<IBar> {}',
		});
		expect(result.success).toBe(true);
	});
});

describe('LOW-10 — diff_models: model_a and model_b must be capped at 50 000 chars', () => {
	const tool = new QDiffModelsTool();

	test('schema should reject model_a longer than 50 000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			model_a: 'x'.repeat(50_001),
			model_b: 'class A {}',
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject model_b longer than 50 000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			model_a: 'class A {}',
			model_b: 'x'.repeat(50_001),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept both within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			model_a: 'class A {}',
			model_b: 'class B {}',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-11 ──────────────────────────────────────────────────────────────────────

describe('LOW-11 — create_model: className must be capped at 100 chars', () => {
	const tool = new QCreateModelTool();

	test('schema should reject className longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			className: 'A'.repeat(101),
			properties: {},
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept className within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			className: 'UserModel',
			properties: {},
		});
		expect(result.success).toBe(true);
	});
});

describe('LOW-11 — explain_error: error string must be capped at 10 000 chars', () => {
	const tool = new QExplainErrorTool();

	test('schema should reject error longer than 10 000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ error: 'e'.repeat(10_001) });
		expect(result.success).toBe(false);
	});

	test('schema should accept error within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			error: 'TypeError: Cannot read properties of undefined',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-12 ──────────────────────────────────────────────────────────────────────

describe('LOW-12 — from_schema: schema and className must be capped', () => {
	const tool = new QFromSchemaTool();

	test('schema should reject schema string longer than 50 000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			schema: 'x'.repeat(50_001),
			format: 'json',
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject className longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			schema: '{}',
			format: 'json',
			className: 'A'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept valid inputs', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			schema: '{"name":"string"}',
			format: 'json',
			className: 'UserModel',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-13 ──────────────────────────────────────────────────────────────────────

describe('LOW-13 — create_guide_page: slug must be capped at 100 chars', () => {
	const tool = new QCreateGuidePageTool();

	test('schema should reject slug longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			slug: 'a'.repeat(101),
			title_en: 'Test',
			title_es: 'Prueba',
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept slug within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			slug: 'my-guide',
			title_en: 'My Guide',
			title_es: 'Mi Guía',
		});
		expect(result.success).toBe(true);
	});
});

// MED-11 ──────────────────────────────────────────────────────────────────────

describe('MED-11 — simulate_validation: rules array and item strings must be capped', () => {
	const tool = new QSimulateValidationTool();

	test('schema should reject rules array with more than 50 items', () => {
		const schema = (tool as any).schema;
		const rule = {
			field: 'name',
			predicate: 'return true;',
			message: 'err',
		};
		const result = schema.safeParse({
			data: {},
			rules: Array.from({ length: 51 }, () => rule),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject rule.field longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: {},
			rules: [
				{
					field: 'a'.repeat(101),
					predicate: 'return true;',
					message: 'err',
				},
			],
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject rule.predicate longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: {},
			rules: [
				{ field: 'name', predicate: 'x'.repeat(501), message: 'err' },
			],
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject rule.message longer than 200 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: {},
			rules: [
				{
					field: 'name',
					predicate: 'return true;',
					message: 'm'.repeat(201),
				},
			],
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept rules within all limits', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: { name: 'Alice' },
			rules: [
				{
					field: 'name',
					predicate: 'return val !== undefined;',
					message: 'Required',
				},
			],
		});
		expect(result.success).toBe(true);
	});
});

describe('MED-11 — simulate_rules: rules array and item strings must be capped', () => {
	const tool = new QSimulateRulesTool();

	test('schema should reject rules array with more than 50 items', () => {
		const schema = (tool as any).schema;
		const rule = {
			field: 'name',
			predicate: 'return true;',
			message: 'err',
		};
		const result = schema.safeParse({
			data: {},
			rules: Array.from({ length: 51 }, () => rule),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject rule.field longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: {},
			rules: [
				{
					field: 'a'.repeat(101),
					predicate: 'return true;',
					message: 'err',
				},
			],
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject rule.predicate longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: {},
			rules: [
				{ field: 'name', predicate: 'x'.repeat(501), message: 'err' },
			],
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept rules within all limits', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: { name: 'Alice' },
			rules: [
				{
					field: 'name',
					predicate: 'return val !== undefined;',
					message: 'Required',
				},
			],
		});
		expect(result.success).toBe(true);
	});
});

describe('MED-11 — simulate_async_rules: rules array and item strings must be capped', () => {
	const tool = new QSimulateAsyncRulesTool();

	test('schema should reject rules array with more than 50 items', () => {
		const schema = (tool as any).schema;
		const rule = {
			field: 'name',
			predicate: 'return true;',
			message: 'err',
		};
		const result = schema.safeParse({
			data: {},
			rules: Array.from({ length: 51 }, () => rule),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject rule.predicate longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: {},
			rules: [
				{ field: 'name', predicate: 'x'.repeat(501), message: 'err' },
			],
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept rules within all limits', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: { name: 'Alice' },
			rules: [
				{
					field: 'name',
					predicate: 'return Promise.resolve(true);',
					message: 'Required',
				},
			],
		});
		expect(result.success).toBe(true);
	});
});

// LOW-14 ──────────────────────────────────────────────────────────────────────

describe('LOW-14 — get_form_schema: code string must be capped at 50 000 chars', () => {
	const tool = new QGetFormSchemaTool();

	test('schema should reject code longer than 50 000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ code: 'x'.repeat(50_001) });
		expect(result.success).toBe(false);
	});

	test('schema should accept code within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			code: 'class Foo extends QModel<IFoo> {}',
		});
		expect(result.success).toBe(true);
	});
});

describe('LOW-14 — get_model_schema: code string must be capped at 50 000 chars', () => {
	const tool = new QGetModelSchemaTool();

	test('schema should reject code longer than 50 000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			code: 'x'.repeat(50_001),
			format: 'json',
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept code within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			code: '@Quick({ name: "string" }) class Foo extends QModel<IFoo> {}',
			format: 'json',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-15 ──────────────────────────────────────────────────────────────────────

describe('LOW-15 — agent_coordinate: string fields must be capped to prevent JSON persistence DoS', () => {
	const tool = new QAgentCoordinateTool();

	test('schema should reject agentId longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'check',
			agentId: 'a'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject task longer than 200 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'claim',
			agentId: 'agent-1',
			task: 't'.repeat(201),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject files array with more than 50 items', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'claim',
			agentId: 'agent-1',
			task: 'my task',
			files: Array.from({ length: 51 }, () => 'src/file.ts'),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject a files item longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'claim',
			agentId: 'agent-1',
			task: 'my task',
			files: ['a'.repeat(501)],
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject ttlMs greater than 600 000ms (10 min)', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'claim',
			agentId: 'agent-1',
			task: 'task',
			ttlMs: 600_001,
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept valid inputs within all limits', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'claim',
			agentId: 'copilot-session-1',
			task: 'migrate docs',
			files: ['src/core/**', 'tests/**'],
			ttlMs: 300_000,
		});
		expect(result.success).toBe(true);
	});
});

// LOW-16 ──────────────────────────────────────────────────────────────────────

describe('LOW-16 — scaffold_feature: name must be capped at 100 chars', () => {
	const tool = new QScaffoldFeatureTool();

	test('schema should reject name longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			type: 'tool',
			name: 'a'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept name within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			type: 'tool',
			name: 'validate-user',
		});
		expect(result.success).toBe(true);
	});
});

describe('LOW-16 — list_todos: extensions array must be capped', () => {
	const tool = new QListTodosTool();

	test('schema should reject extensions array with more than 20 items', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			extensions: Array.from({ length: 21 }, (_, idx) => `.t${idx}`),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject extension item longer than 10 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ extensions: ['.typescript-long'] });
		expect(result.success).toBe(false);
	});

	test('schema should accept valid extensions', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ extensions: ['.ts', '.js', '.tsx'] });
		expect(result.success).toBe(true);
	});
});

describe('LOW-16 — suggest_version_migration: from_version must be capped at 1000', () => {
	const tool = new QSuggestVersionMigrationTool();

	test('schema should reject from_version greater than 1000', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			current_model: 'class Foo {}',
			next_model: 'class Foo {}',
			from_version: 1001,
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept from_version within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			current_model: 'class Foo {}',
			next_model: 'class Foo {}',
			from_version: 5,
		});
		expect(result.success).toBe(true);
	});
});

// LOW-17 ──────────────────────────────────────────────────────────────────────

describe('LOW-17 — check_changelog: projectDir must be capped at 500 chars', () => {
	const tool = new QCheckChangelogTool();

	test('schema should reject projectDir longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ projectDir: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('schema should accept projectDir within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ projectDir: './valid' });
		expect(result.success).toBe(true);
	});
});

// LOW-18 ──────────────────────────────────────────────────────────────────────

describe('LOW-18 — check_project_rules: targetDir must be capped at 500 chars', () => {
	const tool = new QCheckProjectRulesTool();

	test('schema should reject targetDir longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ targetDir: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('schema should accept targetDir within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ targetDir: 'src' });
		expect(result.success).toBe(true);
	});
});

// LOW-19 ──────────────────────────────────────────────────────────────────────

describe('LOW-19 — simulate_validation: top-level group must be capped at 100 chars', () => {
	const tool = new QSimulateValidationTool();

	test('schema should reject group longer than 100 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: { name: 'Alice' },
			rules: [],
			group: 'x'.repeat(101),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept group within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			data: { name: 'Alice' },
			rules: [],
			group: 'admins',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-20 ──────────────────────────────────────────────────────────────────────

describe('LOW-20 — lint_check: targetDir and targetFiles must be capped', () => {
	const tool = new QLintCheckTool();

	test('schema should reject targetDir longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ targetDir: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('schema should accept targetDir within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ targetDir: 'src' });
		expect(result.success).toBe(true);
	});

	test('schema should reject targetFiles array with more than 100 items', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			targetFiles: new Array(101).fill('src/file.ts'),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject a targetFiles item longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ targetFiles: ['x'.repeat(501)] });
		expect(result.success).toBe(false);
	});

	test('schema should accept valid targetFiles', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			targetFiles: ['src/foo.ts', 'src/bar.ts'],
		});
		expect(result.success).toBe(true);
	});
});

// LOW-21 ──────────────────────────────────────────────────────────────────────

describe('LOW-21 — create_model: properties record must be capped at 200 entries', () => {
	const tool = new QCreateModelTool();

	test('execute should throw when properties has more than 200 entries', async () => {
		const bigProps: Record<string, string> = {};
		for (let idx = 0; idx < 201; idx++) {
			bigProps[`field${idx}`] = 'string';
		}
		let message = '';
		try {
			await tool.execute({ className: 'MyModel', properties: bigProps });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/too many properties/i);
	});

	test('execute should succeed with 200 properties or fewer', async () => {
		const props: Record<string, string> = {};
		for (let idx = 0; idx < 10; idx++) {
			props[`field${idx}`] = 'string';
		}
		const result = await tool.execute({
			className: 'MyModel',
			properties: props,
		});
		expect(result.code).toBeDefined();
	});
});

// MED-13 ──────────────────────────────────────────────────────────────────────

describe('MED-13 — explain_transformation: large arrays in data must be capped (not OOM)', () => {
	const tool = new QExplainTransformationTool();

	test('execute should cap arrays and complete without OOM', async () => {
		const bigArray = new Array(100_000).fill(1);
		const result = await tool.execute({
			data: { items: bigArray },
			options: {},
		});
		expect(result).toBeDefined();
	});
});

// MED-14 ──────────────────────────────────────────────────────────────────────

describe('MED-14 — check_integrity: large arrays in data must be capped (not OOM)', () => {
	const tool = new QCheckIntegrityTool();

	test('execute should cap arrays and complete without OOM', async () => {
		const bigArray = new Array(100_000).fill('2024-01-01');
		const result = await tool.execute({
			data: { birth: bigArray },
			options: { birth: 'Date' },
		});
		expect(result).toBeDefined();
	});
});

// MED-15 ──────────────────────────────────────────────────────────────────────

describe('MED-15 — simulate_async_rules: timeoutMs must be capped at 60 000 ms', () => {
	const tool = new QSimulateAsyncRulesTool();

	test('schema should reject timeoutMs above 60 000', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			rules: [
				{ field: 'email', predicate: 'return true', message: 'ok' },
			],
			data: {},
			options: { timeoutMs: 999_999 },
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept timeoutMs of 60 000', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			rules: [
				{ field: 'email', predicate: 'return true', message: 'ok' },
			],
			data: {},
			options: { timeoutMs: 60_000 },
		});
		expect(result.success).toBe(true);
	});
});

// MED-16 ──────────────────────────────────────────────────────────────────────

describe('MED-16 — options record key-count DoS: check_integrity, roundtrip, simulate_transformation, explain_transformation', () => {
	test('check_integrity: execute should reject options with more than 500 keys', async () => {
		const tool = new QCheckIntegrityTool();
		const bigOptions: Record<string, string> = {};
		for (let idx = 0; idx < 501; idx++) {
			bigOptions[`field${idx}`] = 'string';
		}
		let message = '';
		try {
			await tool.execute({ data: {}, options: bigOptions });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/too many options keys/i);
	});

	test('check_integrity: execute should succeed with 500 options keys', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { field0: 'hello' },
			options: { field0: 'string' },
		});
		expect(result).toBeDefined();
	});

	test('roundtrip: execute should reject options with more than 500 keys', async () => {
		const tool = new QRoundtripTool();
		const bigOptions: Record<string, string> = {};
		for (let idx = 0; idx < 501; idx++) {
			bigOptions[`field${idx}`] = 'string';
		}
		let message = '';
		try {
			await tool.execute({ data: {}, options: bigOptions });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/too many options keys/i);
	});

	test('simulate_transformation: execute should reject options with more than 500 keys', async () => {
		const tool = new QSimulateTransformationTool();
		const bigOptions: Record<string, string> = {};
		for (let idx = 0; idx < 501; idx++) {
			bigOptions[`field${idx}`] = 'string';
		}
		let message = '';
		try {
			await tool.execute({ data: {}, options: bigOptions });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/too many options keys/i);
	});

	test('explain_transformation: execute should reject options with more than 500 keys', async () => {
		const tool = new QExplainTransformationTool();
		const bigOptions: Record<string, string> = {};
		for (let idx = 0; idx < 501; idx++) {
			bigOptions[`field${idx}`] = 'string';
		}
		let message = '';
		try {
			await tool.execute({ data: {}, options: bigOptions });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/too many options keys/i);
	});
});

// LOW-23 ──────────────────────────────────────────────────────────────────────

describe('LOW-23 — patch_jsdoc: file_path, symbol_name, jsdoc must be capped', () => {
	const tool = new QPatchJSDocTool();

	test('schema should reject file_path longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			file_path: 'x'.repeat(501),
			symbol_name: 'MyClass',
			action: 'add',
			jsdoc: '/** doc */',
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject symbol_name longer than 200 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			file_path: 'src/foo.ts',
			symbol_name: 'x'.repeat(201),
			action: 'add',
			jsdoc: '/** doc */',
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject jsdoc longer than 100 000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			file_path: 'src/foo.ts',
			symbol_name: 'MyClass',
			action: 'add',
			jsdoc: '/** ' + 'x'.repeat(100_001) + ' */',
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept valid inputs within limits', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			file_path: 'src/foo.ts',
			symbol_name: 'MyClass',
			action: 'add',
			jsdoc: '/** A valid jsdoc comment. */',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-24 ──────────────────────────────────────────────────────────────────────

describe('LOW-24 — manage_proposal: title, description, impact, effort must be capped', () => {
	const tool = new QManageProposalTool();

	test('schema should reject title longer than 200 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'add',
			title: 'x'.repeat(201),
			description: 'A description.',
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject description longer than 2000 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'add',
			title: 'My Proposal',
			description: 'x'.repeat(2001),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject impact longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'add',
			title: 'My Proposal',
			description: 'Desc.',
			impact: 'x'.repeat(501),
		});
		expect(result.success).toBe(false);
	});

	test('schema should reject effort longer than 200 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'add',
			title: 'My Proposal',
			description: 'Desc.',
			effort: 'x'.repeat(201),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept valid inputs within limits', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			action: 'add',
			title: 'New Feature',
			description: 'Add support for X.',
			priority: 'media',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-25 ──────────────────────────────────────────────────────────────────────

describe('LOW-25 — generate_test: sourceFile must be capped at 500 chars', () => {
	const tool = new QGenerateTestTool();

	test('schema should reject sourceFile longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ sourceFile: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('schema should accept sourceFile within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ sourceFile: 'src/core/user.ts' });
		expect(result.success).toBe(true);
	});
});

// LOW-26 ──────────────────────────────────────────────────────────────────────

describe('LOW-26 — scaffold_feature: location must be capped at 500 chars', () => {
	const tool = new QScaffoldFeatureTool();

	test('schema should reject location longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			type: 'tool',
			name: 'my-tool',
			location: 'x'.repeat(501),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept location within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			type: 'tool',
			name: 'my-tool',
			location: 'src/mcp/tools/internal',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-27 ──────────────────────────────────────────────────────────────────────

describe('LOW-27 — run_tests: pattern must be capped at 500 chars', () => {
	const tool = new QRunTestsTool();

	test('schema should reject pattern longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ pattern: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('schema should accept pattern within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ pattern: 'tests/unit' });
		expect(result.success).toBe(true);
	});
});

// LOW-28 ──────────────────────────────────────────────────────────────────────

describe('LOW-28 — create_guide_page: base_path must be capped at 500 chars', () => {
	const tool = new QCreateGuidePageTool();

	test('schema should reject base_path longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			slug: 'my-feature',
			title_en: 'My Feature',
			title_es: 'Mi Funcionalidad',
			base_path: 'x'.repeat(501),
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept base_path within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			slug: 'my-feature',
			title_en: 'My Feature',
			title_es: 'Mi Funcionalidad',
			base_path: '/home/user/project',
		});
		expect(result.success).toBe(true);
	});
});

// LOW-29 ──────────────────────────────────────────────────────────────────────

describe('LOW-29 — deprecation_tracker: target_dir must be capped at 500 chars', () => {
	const tool = new QDeprecationTrackerTool();

	test('schema should reject target_dir longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ target_dir: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('schema should accept target_dir within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ target_dir: 'src' });
		expect(result.success).toBe(true);
	});
});

// LOW-30 ──────────────────────────────────────────────────────────────────────

describe('LOW-30 — validate_examples: target_dir must be capped at 500 chars', () => {
	const tool = new QValidateExamplesTool();

	test('schema should reject target_dir longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ target_dir: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('schema should accept target_dir within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({ target_dir: 'src' });
		expect(result.success).toBe(true);
	});
});

// LOW-31 ──────────────────────────────────────────────────────────────────────

describe('LOW-31 — simulate_async_rules: timeoutMessage must be capped at 500 chars', () => {
	const tool = new QSimulateAsyncRulesTool();

	test('schema should reject timeoutMessage longer than 500 chars', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			rules: [
				{ field: 'email', predicate: 'return true', message: 'ok' },
			],
			data: {},
			options: { timeoutMessage: 'x'.repeat(501) },
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept timeoutMessage within limit', () => {
		const schema = (tool as any).schema;
		const result = schema.safeParse({
			rules: [
				{ field: 'email', predicate: 'return true', message: 'ok' },
			],
			data: {},
			options: { timeoutMessage: 'Predicate timed out.' },
		});
		expect(result.success).toBe(true);
	});
});

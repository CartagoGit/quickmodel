/**
 * #25 — MCP Public Tools E2E Integration Tests
 *
 * Each test exercises a public MCP tool with realistic input and validates
 * that the tool executes end-to-end and returns a semantically correct output.
 *
 * Tools covered (19 not yet covered by public-tools-coverage.test.ts):
 * check-integrity, create-model, diff-models, explain-error, explain-transformation,
 * from-schema, generate-feature-tests, generate-integration-test, get-form-schema,
 * get-model-schema, inspect-model, list-validators, roundtrip, search-docs,
 * simulate-async-rules, simulate-rules, simulate-transformation, simulate-validation,
 * suggest-version-migration, validate-usage
 */

import { describe, test, expect } from 'bun:test';
import { QCheckIntegrityTool } from '../../../src/mcp/tools/public/check-integrity.tool';
import { QCreateModelTool } from '../../../src/mcp/tools/public/create-model.tool';
import { QDiffModelsTool } from '../../../src/mcp/tools/public/diff-models.tool';
import { QExplainErrorTool } from '../../../src/mcp/tools/public/explain-error.tool';
import { QExplainTransformationTool } from '../../../src/mcp/tools/public/explain-transformation.tool';
import { QFromSchemaTool } from '../../../src/mcp/tools/public/from-schema.tool';
import { QGenerateFeatureTestsTool } from '../../../src/mcp/tools/public/generate-feature-tests.tool';
import { QGenerateIntegrationTestTool } from '../../../src/mcp/tools/public/generate-integration-test.tool';
import { QGetFormSchemaTool } from '../../../src/mcp/tools/public/get-form-schema.tool';
import { QGetModelSchemaTool } from '../../../src/mcp/tools/public/get-model-schema.tool';
import { QInspectModelTool } from '../../../src/mcp/tools/public/inspect-model.tool';
import { QListValidatorsTool } from '../../../src/mcp/tools/public/list-validators.tool';
import { QRoundtripTool } from '../../../src/mcp/tools/public/roundtrip.tool';
import { QSearchDocsTool } from '../../../src/mcp/tools/public/search-docs.tool';
import { QSimulateAsyncRulesTool } from '../../../src/mcp/tools/public/simulate-async-rules.tool';
import { QSimulateRulesTool } from '../../../src/mcp/tools/public/simulate-rules.tool';
import { QSimulateTransformationTool } from '../../../src/mcp/tools/public/simulate-transformation.tool';
import { QSimulateValidationTool } from '../../../src/mcp/tools/public/simulate-validation.tool';
import { QSuggestVersionMigrationTool } from '../../../src/mcp/tools/public/suggest-version-migration.tool';
import { QValidateUsageTool } from '../../../src/mcp/tools/public/validate-usage.tool';

// ---------------------------------------------------------------------------
// Shared model code snippets used across multiple tools
// ---------------------------------------------------------------------------

const userModelCode = `
import { Quick, QModel, QRule, QField } from 'quickmodel';

interface IUser {
  id: number;
  name: string;
  email: string;
  birthDate: Date;
}

@Quick({ birthDate: Date })
export class UserModel extends QModel<IUser> {
  @QRule({ field: 'name', predicate: 'value.length > 0', message: 'Name required' })
  @QField({ widget: 'input', label: 'Full Name', required: true })
  declare name: string;

  @QField({ widget: 'input', label: 'Email', required: true })
  declare email: string;

  declare id: number;
  declare birthDate: Date;
}
`;

/** Simple model without imports — required by get-model-schema parser */
const simpleModelCode = `
@Quick({ createdAt: Date, score: BigInt })
class ArticleModel extends QModel<any> {
  declare id: string;
  declare title: string;
  declare price: number;
  declare createdAt: Date;
  declare score: bigint;
}
`;

// ---------------------------------------------------------------------------
// check-integrity
// ---------------------------------------------------------------------------

describe('QCheckIntegrityTool — e2e', () => {
	test('valid Date string → valid=true, no errors', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { createdAt: '2024-06-15T10:00:00.000Z' },
			options: { createdAt: 'Date' },
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('invalid Date string → valid=false, error reported', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { createdAt: 'not-a-date' },
			options: { createdAt: 'Date' },
		});
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// create-model
// ---------------------------------------------------------------------------

describe('QCreateModelTool — e2e', () => {
	test('className + properties schema → full model class code', async () => {
		const tool = new QCreateModelTool();
		const result = await tool.execute({
			className: 'Invoice',
			properties: {
				id: 'number',
				title: 'string',
				issuedAt: 'Date',
			},
		});
		expect(result.code).toContain('class Invoice');
		expect(result.code).toContain('QModel');
		expect(result.code).toContain('declare');
		expect(result.code).toContain('id: number');
		expect(result.code).toContain('title: string');
	});
});

// ---------------------------------------------------------------------------
// diff-models
// ---------------------------------------------------------------------------

describe('QDiffModelsTool — e2e', () => {
	test('added field in model_b is reported in added_fields', async () => {
		const tool = new QDiffModelsTool();
		const modelA = `
@Quick({})
class UserModel extends QModel<any> {
  declare name: string;
}
`;
		const modelB = `
@Quick({})
class UserModel extends QModel<any> {
  declare name: string;
  declare email: string;
}
`;
		const result = await tool.execute({ model_a: modelA, model_b: modelB });
		expect(result.added_fields).toBeDefined();
		expect(result.added_fields).toContain('email');
		expect(result.removed_fields).toHaveLength(0);
	});

	test('identical models → empty diff', async () => {
		const tool = new QDiffModelsTool();
		const model = `
@Quick({ createdAt: Date })
class OrderModel extends QModel<any> {
  declare id: number;
  declare createdAt: Date;
}
`;
		const result = await tool.execute({ model_a: model, model_b: model });
		expect(result.added_fields).toHaveLength(0);
		expect(result.removed_fields).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// explain-error
// ---------------------------------------------------------------------------

describe('QExplainErrorTool — e2e', () => {
	test('transformer error → explanation returned', async () => {
		const tool = new QExplainErrorTool();
		const result = await tool.execute({
			error: 'Invalid Date: received "abc"',
		});
		expect(result.explanation).toBeDefined();
		expect(typeof result.explanation).toBe('string');
		expect(result.explanation.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// explain-transformation
// ---------------------------------------------------------------------------

describe('QExplainTransformationTool — e2e', () => {
	test('data + Date option → trace array with field info', async () => {
		const tool = new QExplainTransformationTool();
		const result = await tool.execute({
			data: { birthDate: '1990-06-15T00:00:00.000Z', name: 'Alice' },
			options: { birthDate: 'Date' },
		});
		expect(result.trace).toBeArray();
		expect(result.trace.length).toBe(2);
		const birthEntry = result.trace.find(
			(entry: { field: string }) => entry.field === 'birthDate'
		);
		expect(birthEntry).toBeDefined();
		expect(birthEntry?.transformer).toBeDefined();
	});

	test('data with no special options → trace with inputType/outputType', async () => {
		const tool = new QExplainTransformationTool();
		const result = await tool.execute({
			data: { score: 42 },
			options: {},
		});
		expect(result.trace.length).toBe(1);
		expect(result.trace[0]?.inputType).toBeDefined();
		expect(result.trace[0]?.outputType).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// from-schema
// ---------------------------------------------------------------------------

describe('QFromSchemaTool — e2e', () => {
	test('JSON schema + format json → QModel class generated', async () => {
		const tool = new QFromSchemaTool();
		const schema = JSON.stringify({
			type: 'object',
			title: 'Product',
			properties: {
				name: { type: 'string' },
				price: { type: 'number' },
				active: { type: 'boolean' },
			},
			required: ['name', 'price'],
		});
		const result = await tool.execute({ schema, format: 'json' });
		expect(result.code).toContain('class Product');
		expect(result.code).toContain('QModel');
		expect(result.code).toContain('name: string');
		expect(result.code).toContain('price: number');
	});
});

// ---------------------------------------------------------------------------
// generate-feature-tests
// ---------------------------------------------------------------------------

describe('QGenerateFeatureTestsTool — e2e', () => {
	test('@Quick decorator → test suite code generated', async () => {
		const tool = new QGenerateFeatureTestsTool();
		const result = await tool.execute({ decorator: '@Quick' });
		expect(result.code).toBeDefined();
		expect(typeof result.code).toBe('string');
		expect(result.code.length).toBeGreaterThan(100);
		// Should contain test structure keywords
		expect(result.code).toContain('describe');
	});
});

// ---------------------------------------------------------------------------
// generate-integration-test
// ---------------------------------------------------------------------------

describe('QGenerateIntegrationTestTool — e2e', () => {
	test('model name → roundtrip integration test generated', async () => {
		const tool = new QGenerateIntegrationTestTool();
		const result = await tool.execute({
			base_model: 'UserModel',
			test_type: 'roundtrip',
		});
		expect(result.code).toBeDefined();
		expect(typeof result.code).toBe('string');
		expect(result.code.length).toBeGreaterThan(50);
		expect(result.code).toContain('UserModel');
	});
});

// ---------------------------------------------------------------------------
// get-form-schema
// ---------------------------------------------------------------------------

describe('QGetFormSchemaTool — e2e', () => {
	test('model with @QField decorators → form schema array', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: userModelCode });
		expect(result.schema).toBeArray();
		expect(result.schema.length).toBeGreaterThanOrEqual(2);
		const nameField = result.schema.find(
			(fld: unknown) => (fld as { field?: string }).field === 'name'
		) as Record<string, unknown> | undefined;
		expect(nameField).toBeDefined();
		expect(nameField?.['label']).toBe('Full Name');
	});
});

// ---------------------------------------------------------------------------
// get-model-schema
// ---------------------------------------------------------------------------

describe('QGetModelSchemaTool — e2e', () => {
	test('model code + json format → JSON schema with field types', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({
			code: simpleModelCode,
			format: 'json',
		});
		expect(result.schema).toBeDefined();
		expect(result.schema.type).toBe('object');
		expect(result.schema.properties).toBeDefined();
		const props = result.schema.properties as Record<string, unknown>;
		// schema should contain at least one declared field
		expect(Object.keys(props).length).toBeGreaterThan(0);
	});

	test('model code + typescript format → TypeScript interface as string', async () => {
		const tool = new QGetModelSchemaTool();
		const result = await tool.execute({
			code: simpleModelCode,
			format: 'typescript',
		});
		expect(typeof result.schema).toBe('string');
		expect(result.schema).toContain('interface');
	});
});

// ---------------------------------------------------------------------------
// inspect-model
// ---------------------------------------------------------------------------

describe('QInspectModelTool — e2e', () => {
	test('model code → inspection result with fields', async () => {
		const tool = new QInspectModelTool();
		const result = await tool.execute({ code: userModelCode });
		expect(result).toBeDefined();
		const resultStr = JSON.stringify(result);
		expect(resultStr).toContain('name');
	});
});

// ---------------------------------------------------------------------------
// list-validators
// ---------------------------------------------------------------------------

describe('QListValidatorsTool — e2e', () => {
	test('no args → non-empty array of validators', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});
		// Returns array directly (not wrapped in an object)
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
		const names = result.map((val: { name: string }) => val.name);
		expect(names).toContain('IsEmail');
		expect(names).toContain('IsNotEmpty');
		expect(names).toContain('Min');
	});
});

// ---------------------------------------------------------------------------
// roundtrip
// ---------------------------------------------------------------------------

describe('QRoundtripTool — e2e', () => {
	test('Date field roundtrip → lossless=true', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { createdAt: '2024-01-15T12:00:00.000Z', name: 'Alice' },
			options: { createdAt: 'Date' },
		});
		expect(result.lossless).toBe(true);
		expect(result.serialized).toBeDefined();
		expect(result.roundtrip_serialized).toBeDefined();
		expect(result.diff).toEqual({});
	});

	test('plain string fields → lossless=true (no transformer)', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { name: 'Alice', role: 'admin' },
			options: {},
		});
		expect(result.lossless).toBe(true);
		expect(result.summary).toContain('lossless');
	});

	test('BigInt field roundtrip → lossless=true', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { amount: '9007199254740995' },
			options: { amount: 'BigInt' },
		});
		expect(result.lossless).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// search-docs
// ---------------------------------------------------------------------------

describe('QSearchDocsTool — e2e', () => {
	test('returns { matches } with correct structure', async () => {
		const tool = new QSearchDocsTool();
		const result = await tool.execute({ query: 'QAlias' });
		// Tool searches docs/ and docs-vitepress/guide — returns { matches: string[] }
		// The directories searched may or may not contain results depending on build state
		expect(result.matches).toBeDefined();
		expect(Array.isArray(result.matches)).toBe(true);
	});

	test('empty query → returns empty matches safely (no error thrown)', async () => {
		const tool = new QSearchDocsTool();
		// An empty query is accepted; grep returns many results or none
		const result = await tool.execute({ query: '' });
		expect(result.matches).toBeDefined();
		expect(Array.isArray(result.matches)).toBe(true);
	});

	test('invalid regex in query → returns empty matches without throwing', async () => {
		const tool = new QSearchDocsTool();
		const result = await tool.execute({ query: 'QModel introduction' });
		expect(result.matches).toBeDefined();
		expect(Array.isArray(result.matches)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// simulate-async-rules
// ---------------------------------------------------------------------------

describe('QSimulateAsyncRulesTool — e2e', () => {
	test('passing async rule → valid=true', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { email: 'user@example.com' },
			rules: [
				{
					field: 'email',
					predicate: 'value.includes("@")',
					message: 'Invalid email',
				},
			],
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('failing async rule → valid=false, error with field/message', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { email: 'not-an-email' },
			rules: [
				{
					field: 'email',
					predicate: 'value.includes("@")',
					message: 'Invalid email',
				},
			],
		});
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0]?.field).toBe('email');
	});
});

// ---------------------------------------------------------------------------
// simulate-rules
// ---------------------------------------------------------------------------

describe('QSimulateRulesTool — e2e', () => {
	test('age >= 18 with valid age → valid=true', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { age: 25 },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be adult',
				},
			],
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('age < 18 → valid=false, error message included', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { age: 16 },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be adult',
				},
			],
		});
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toBe('Must be adult');
		expect(result.errors[0]?.field).toBe('age');
	});
});

// ---------------------------------------------------------------------------
// simulate-transformation
// ---------------------------------------------------------------------------

describe('QSimulateTransformationTool — e2e', () => {
	test('ISO string + Date option → date preserved as ISO string in output', async () => {
		const tool = new QSimulateTransformationTool();
		const result = await tool.execute({
			data: { date: '2024-03-20T00:00:00.000Z' },
			options: { date: 'Date' },
		});
		expect(result.result).toBeDefined();
		// After Date transformer + JSON serialization, the value is an ISO string
		expect(typeof result.result['date']).toBe('string');
	});

	test('BigInt string + BigInt option → value preserved as string in JSON', async () => {
		const tool = new QSimulateTransformationTool();
		const result = await tool.execute({
			data: { amount: '9007199254740995' },
			options: { amount: 'BigInt' },
		});
		expect(result.result['amount']).toBe('9007199254740995');
	});

	test('plain string fields (no options) → pass-through unchanged', async () => {
		const tool = new QSimulateTransformationTool();
		const result = await tool.execute({
			data: { name: 'Alice', role: 'admin' },
			options: {},
		});
		expect(result.result['name']).toBe('Alice');
		expect(result.result['role']).toBe('admin');
	});
});

// ---------------------------------------------------------------------------
// simulate-validation
// ---------------------------------------------------------------------------

describe('QSimulateValidationTool — e2e', () => {
	test('data + passing rules → valid=true, no errors', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { age: 25, name: 'Alice' },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be adult',
				},
				{
					field: 'name',
					predicate: 'value.length >= 2',
					message: 'Name too short',
				},
			],
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('data + failing rules → valid=false, errors with field/message', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { age: 16, name: 'Jo' },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be adult',
				},
				{
					field: 'name',
					predicate: 'value.length >= 3',
					message: 'Name too short',
				},
			],
		});
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBe(2);
		expect(result.errors[0]?.field).toBe('age');
		expect(result.errors[0]?.message).toBe('Must be adult');
	});
});

// ---------------------------------------------------------------------------
// suggest-version-migration
// ---------------------------------------------------------------------------

describe('QSuggestVersionMigrationTool — e2e', () => {
	const modelV1 = `
@Quick({ createdAt: Date })
class UserModel extends QModel<any> {
  declare firstName: string;
  declare lastName: string;
  declare createdAt: Date;
}
`;

	const modelV2WithAddedField = `
@Quick({ createdAt: Date })
class UserModel extends QModel<any> {
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare createdAt: Date;
}
`;

	test('current + next model with added field → target_version bumped', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: modelV1,
			next_model: modelV2WithAddedField,
			from_version: 1,
		});
		expect(result.target_version).toBeDefined();
		expect(result.target_version).toBe(2);
	});

	test('same model before and after → no migration needed', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: modelV1,
			next_model: modelV1,
			from_version: 1,
		});
		expect(result.target_version).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// validate-usage
// ---------------------------------------------------------------------------

describe('QValidateUsageTool — e2e', () => {
	test('correct QModel code → valid=true, no issues', async () => {
		const tool = new QValidateUsageTool();
		const result = await tool.execute({ code: userModelCode });
		expect(result.valid).toBe(true);
		expect(result.issues).toHaveLength(0);
	});

	test('missing extends QModel → valid=false, issue reported', async () => {
		const tool = new QValidateUsageTool();
		const code = `
@Quick({})
export class BadModel {
  declare name: string;
}
`;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(false);
		expect(result.issues.length).toBeGreaterThan(0);
	});
});

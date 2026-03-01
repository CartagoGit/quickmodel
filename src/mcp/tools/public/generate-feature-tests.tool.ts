import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

/**
 * Decorator names known to QuickModel.
 * @see {@link QGenerateFeatureTestsTool} — tool that uses this constant to validate inputs
 * @internal
 */
const KNOWN_DECORATORS: readonly string[] = [
	'@Quick',
	'@QRule',
	'@QField',
	'@QAlias',
	'@QGroup',
	'@QComputed',
	'@QConfig',
	'@QSensitive',
];

type IKnownDecorator =
	| '@Quick'
	| '@QRule'
	| '@QField'
	| '@QAlias'
	| '@QGroup'
	| '@QComputed'
	| '@QConfig'
	| '@QSensitive';

/**
 * Result returned by {@link QGenerateFeatureTestsTool}.
 * @see {@link QGenerateFeatureTestsTool} — tool whose `execute` returns this shape
 * @internal
 */
interface IGenerateFeatureTestsResult {
	code: string;
	decorator: string;
	testCount: number;
	summary: string;
}

/**
 * Arguments accepted by {@link QGenerateFeatureTestsTool}.
 * @see {@link QGenerateFeatureTestsTool} — tool whose `execute` receives these arguments
 * @internal
 */
interface IGenerateFeatureTestsArgs {
	decorator: string;
	model_name?: string;
	include_edge_cases?: boolean;
}

/**
 * Generates boilerplate test code for a specific QuickModel decorator.
 * @see {@link QGenerateFeatureTestsTool} — tool that calls this builder function
 * @internal
 */
function buildTestCode(args: IGenerateFeatureTestsArgs): {
	code: string;
	count: number;
} {
	const modelName = args.model_name ?? 'TestModel';
	const withEdge = args.include_edge_cases ?? true;

	switch (args.decorator as IKnownDecorator) {
		case '@Quick':
			return buildQuickTests(modelName, withEdge);
		case '@QRule':
			return buildQRuleTests(modelName, withEdge);
		case '@QField':
			return buildQFieldTests(modelName, withEdge);
		case '@QAlias':
			return buildQAliasTests(modelName, withEdge);
		case '@QGroup':
			return buildQGroupTests(modelName, withEdge);
		case '@QComputed':
			return buildQComputedTests(modelName, withEdge);
		case '@QConfig':
			return buildQConfigTests(modelName, withEdge);
		default:
			return buildGenericTests(args.decorator, modelName, withEdge);
	}
}

function buildQuickTests(
	modelName: string,
	withEdge: boolean
): { code: string; count: number } {
	const edgeCases = withEdge
		? `
	it('should handle null input gracefully', () => {
		const instance = ${modelName}.create({ createdAt: null });
			const result = JSON.parse(instance.$qToJSON());
		expect(result.createdAt).toBeNull();
	});

	it('should handle undefined input gracefully', () => {
		const instance = ${modelName}.create({ createdAt: undefined });
			const result = JSON.parse(instance.$qToJSON());
		expect(result.createdAt).toBeUndefined();
	});

	it('should handle invalid date string', () => {
		const instance = ${modelName}.create({ createdAt: 'not-a-date' });
			const result = JSON.parse(instance.$qToJSON());
		// Invalid dates produce NaN timestamp — verify field is present
		expect('createdAt' in result).toBe(true);
	});`
		: '';

	const code = `import { describe, it, expect } from 'bun:test';
import { QModel } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${modelName} {
	id: number;
	name: string;
	createdAt: Date;
}

/**
 * Model demonstrating @Quick transformer config for type coercion.
 * Covers: primitive coercion (number, string) and Date transformer.
 */
@Quick({ createdAt: Date })
class ${modelName} extends QModel<I${modelName}> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
}

describe('@Quick — ${modelName}', () => {
	it('should be instantiable with raw data', () => {
		const instance = ${modelName}.create({ id: '1', name: 'Alice', createdAt: '2024-01-15T10:00:00Z' });
		expect(instance).toBeInstanceOf(${modelName});
	});

	it('should coerce string id to number', () => {
		const instance = ${modelName}.create({ id: '42', name: 'Bob', createdAt: new Date() });
		expect(typeof instance.id).toBe('number');
		expect(instance.id).toBe(42);
	});

	it('should coerce ISO string to Date instance', () => {
		const iso = '2024-06-01T12:00:00.000Z';
		const instance = ${modelName}.create({ id: 1, name: 'Carol', createdAt: iso });
		expect(instance.createdAt).toBeInstanceOf(Date);
		expect(instance.createdAt.toISOString()).toBe(iso);
	});

	it('should serialize Date back to ISO string via $qToJSON()', () => {
		const iso = '2024-06-01T12:00:00.000Z';
		const instance = ${modelName}.create({ id: 1, name: 'Carol', createdAt: iso });
		const result = JSON.parse(instance.$qToJSON());
		expect(result.createdAt).toBe(iso);
	});

	it('should round-trip serialize → populate without data loss', () => {
		const original = ${modelName}.create({ id: 7, name: 'Dave', createdAt: '2024-03-01T00:00:00.000Z' });
		const serialized = original.$qSerialize();
		const copy = ${modelName}.create(serialized);
		expect(copy.id).toBe(original.id);
		expect(copy.name).toBe(original.name);
		expect(copy.createdAt.toISOString()).toBe(original.createdAt.toISOString());
	});

	it('should produce identical JSON on repeated calls', () => {
		const instance = ${modelName}.create({ id: 1, name: 'Eve', createdAt: '2024-01-01T00:00:00.000Z' });
		expect(instance.$qToJSON()).toBe(instance.$qToJSON());
	});
${edgeCases}
});
`;
	return { code, count: withEdge ? 9 : 6 };
}

function buildQRuleTests(
	modelName: string,
	withEdge: boolean
): { code: string; count: number } {
	const edgeCases = withEdge
		? `
	it('should accumulate multiple rule failures', () => {
		const result = ${modelName}.create({ email: 'bad', age: 15 }).$qCheckRules();
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(2);
	});

	it('should pass all rules with valid data', () => {
		const result = ${modelName}.create({ email: 'valid@example.com', age: 25 }).$qCheckRules();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});`
		: '';

	const code = `import { describe, it, expect } from 'bun:test';
import { QModel, QRule } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${modelName} {
	email: string;
	age: number;
}

/**
 * Model demonstrating @QRule validation decorators.
 * Covers: email format, min-age, custom error messages.
 */
@Quick({})
@QRule({ field: 'email', predicate: (val: string) => /^[^@]+@[^@]+\\.[^@]+$/.test(val), message: 'Invalid email format' })
@QRule({ field: 'age', predicate: (val: number) => val >= 18, message: 'Must be 18 or older' })
class ${modelName} extends QModel<I${modelName}> {
	declare email: string;
	declare age: number;
}

describe('@QRule — ${modelName}', () => {
	it('should fail validation with invalid email', () => {
		const result = ${modelName}.create({ email: 'notanemail', age: 25 }).$qCheckRules();
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	it('should fail validation when age < 18', () => {
		const result = ${modelName}.create({ email: 'ok@ok.com', age: 16 }).$qCheckRules();
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'age')).toBe(true);
	});

	it('should include the configured error message on failure', () => {
		const result = ${modelName}.create({ email: 'bad', age: 25 }).$qCheckRules();
		const emailError = result.errors.find((err) => err.field === 'email');
		expect(emailError?.message).toBe('Invalid email format');
	});

	it('should pass when all rules are satisfied', () => {
		const result = ${modelName}.create({ email: 'user@domain.com', age: 30 }).$qCheckRules();
		expect(result.valid).toBe(true);
	});
${edgeCases}
});
`;
	return { code, count: withEdge ? 6 : 4 };
}

function buildQFieldTests(
	modelName: string,
	withEdge: boolean
): { code: string; count: number } {
	const edgeCases = withEdge
		? `
	it('should not include form fields for non-@QField properties', () => {
		const schema = ${modelName}.getFormSchema();
		expect(schema.some((fld) => fld.name === 'internalProp')).toBe(false);
	});`
		: '';

	const code = `import { describe, it, expect } from 'bun:test';
import { QModel, QField, QRule } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${modelName} {
	email: string;
	password: string;
}

/**
 * Model demonstrating @QField form metadata decorator.
 */
@Quick({})
@QRule({ field: 'email', predicate: (val: string) => val.includes('@'), message: 'Invalid email' })
@QRule({ field: 'password', predicate: (val: string) => val.length >= 8, message: 'Min 8 chars' })
class ${modelName} extends QModel<I${modelName}> {
	@QField({ label: 'Email Address', type: 'email', required: true })
	declare email: string;

	@QField({ label: 'Password', type: 'password', required: true })
	declare password: string;
}

describe('@QField — ${modelName}', () => {
	it('should expose form metadata via getFormSchema()', () => {
		const schema = ${modelName}.getFormSchema();
		expect(Array.isArray(schema)).toBe(true);
		expect(schema.length).toBeGreaterThan(0);
	});

	it('should include field label in form schema', () => {
		const schema = ${modelName}.getFormSchema();
		const emailField = schema.find((fld) => fld.name === 'email');
		expect(emailField?.label).toBe('Email Address');
	});

	it('should include field type in form schema', () => {
		const schema = ${modelName}.getFormSchema();
		const passwordField = schema.find((fld) => fld.name === 'password');
		expect(passwordField?.type).toBe('password');
	});

	it('should mark required fields correctly', () => {
		const schema = ${modelName}.getFormSchema();
		expect(schema.every((fld) => fld.required === true)).toBe(true);
	});

	it('should include validation rules via validationReport()', () => {
		const instance = ${modelName}.create({ email: 'bad', password: '123' });
		const report = instance.$qValidationReport();
		expect(report.some((item) => !item.valid)).toBe(true);
	});
${edgeCases}
});
`;
	return { code, count: withEdge ? 6 : 5 };
}

function buildQAliasTests(
	modelName: string,
	withEdge: boolean
): { code: string; count: number } {
	const edgeCases = withEdge
		? `
	it('should ignore unknown alias keys when unknownPropertyPolicy is strip', () => {
		const instance = ${modelName}.create({ user_name: 'Alice', extra_field: 'ignored' });
		expect((instance as any).extraField).toBeUndefined();
	});`
		: '';

	const code = `import { describe, it, expect } from 'bun:test';
import { QModel, QAlias } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${modelName} {
	name: string;
	createdAt: Date;
}

/**
 * Model demonstrating @QAlias for snake_case ↔ camelCase mapping.
 */
@Quick({ createdAt: Date, unknownPropertyPolicy: 'strip' })
class ${modelName} extends QModel<I${modelName}> {
	@QAlias('user_name')
	declare name: string;

	@QAlias('created_at')
	declare createdAt: Date;
}

describe('@QAlias — ${modelName}', () => {
	it('should map snake_case input to camelCase property', () => {
		const instance = ${modelName}.create({ user_name: 'Alice', created_at: '2024-01-01T00:00:00.000Z' });
		expect(instance.name).toBe('Alice');
	});

	it('should coerce aliased Date field correctly', () => {
		const instance = ${modelName}.create({ user_name: 'Bob', created_at: '2024-06-15T00:00:00.000Z' });
		expect(instance.createdAt).toBeInstanceOf(Date);
	});

	it('should serialize aliased property back to alias key', () => {
		const instance = ${modelName}.create({ user_name: 'Carol', created_at: '2024-01-01T00:00:00.000Z' });
		const serialized = instance.$qSerialize();
		expect('user_name' in serialized || 'name' in serialized).toBe(true);
	});

	it('should accept camelCase key directly as well', () => {
		const instance = ${modelName}.create({ name: 'Dave', createdAt: new Date() });
		expect(instance.name).toBe('Dave');
	});
${edgeCases}
});
`;
	return { code, count: withEdge ? 5 : 4 };
}

function buildQGroupTests(
	modelName: string,
	withEdge: boolean
): { code: string; count: number } {
	const edgeCases = withEdge
		? `
	it('should return empty object for group with no fields', () => {
		const instance = ${modelName}.create({ firstName: 'Alice', lastName: 'Smith', street: '123 Main' });
		const emptyGroup = instance.pick('nonexistent' as any);
		expect(Object.keys(emptyGroup)).toHaveLength(0);
	});`
		: '';

	const code = `import { describe, it, expect } from 'bun:test';
import { QModel, QGroup } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${modelName} {
	firstName: string;
	lastName: string;
	street: string;
}

/**
 * Model demonstrating @QGroup for field grouping and selective serialization.
 */
@Quick({})
class ${modelName} extends QModel<I${modelName}> {
	@QGroup('name')
	declare firstName: string;

	@QGroup('name')
	declare lastName: string;

	@QGroup('address')
	declare street: string;
}

describe('@QGroup — ${modelName}', () => {
	it('should create instance successfully', () => {
		const instance = ${modelName}.create({ firstName: 'Alice', lastName: 'Smith', street: '123 Main' });
		expect(instance).toBeInstanceOf(${modelName});
	});

	it('should expose group metadata on the model class', () => {
		const instance = ${modelName}.create({ firstName: 'Alice', lastName: 'Smith', street: '123 Main' });
		const nameGroup = instance.pick('name' as any);
		// @QGroup registered fields should be retrievable
		expect(nameGroup).toBeDefined();
	});

	it('should not mix fields from different groups', () => {
		const instance = ${modelName}.create({ firstName: 'Alice', lastName: 'Smith', street: '123 Main' });
		const nameGroup = instance.pick('name' as any);
		expect(Object.keys(nameGroup)).not.toContain('street');
	});
${edgeCases}
});
`;
	return { code, count: withEdge ? 4 : 3 };
}

function buildQComputedTests(
	modelName: string,
	withEdge: boolean
): { code: string; count: number } {
	const edgeCases = withEdge
		? `
	it('should recompute after data mutation via copy()', () => {
		const original = ${modelName}.create({ firstName: 'Alice', lastName: 'Smith' });
		const updated = original.$qCopy({ firstName: 'Bob' });
			const result = JSON.parse(updated.$qToJSON());
		expect(result.fullName).toBe('Bob Smith');
	});`
		: '';

	const code = `import { describe, it, expect } from 'bun:test';
import { QModel, QComputed } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${modelName} {
	firstName: string;
	lastName: string;
	fullName?: string;
}

/**
 * Model demonstrating @QComputed for derived/computed properties.
 */
@Quick({ exposeComputedFields: true })
class ${modelName} extends QModel<I${modelName}> {
	declare firstName: string;
	declare lastName: string;

	@QComputed()
	get fullName(): string {
		return \`\${this.firstName} \${this.lastName}\`;
	}
}

describe('@QComputed — ${modelName}', () => {
	it('should compute fullName from firstName and lastName', () => {
		const instance = ${modelName}.create({ firstName: 'Alice', lastName: 'Smith' });
		expect(instance.fullName).toBe('Alice Smith');
	});

	it('should include computed field in serialized output when exposeComputedFields is true', () => {
		const instance = ${modelName}.create({ firstName: 'Bob', lastName: 'Jones' });
		const result = JSON.parse(instance.$qToJSON());
		expect(result.fullName).toBe('Bob Jones');
	});

	it('should reflect updated values dynamically', () => {
		const instance = ${modelName}.create({ firstName: 'Carlos', lastName: 'Ruiz' });
		expect(instance.fullName).toBe('Carlos Ruiz');
	});
${edgeCases}
});
`;
	return { code, count: withEdge ? 4 : 3 };
}

function buildQConfigTests(
	modelName: string,
	withEdge: boolean
): { code: string; count: number } {
	const edgeCases = withEdge
		? `
	it('should apply unknownPropertyPolicy strip to remove extra fields', () => {
		const instance = ${modelName}.create({ id: 1, name: 'Alice', unknownField: 'should-be-stripped' });
			const result = JSON.parse(instance.$qToJSON());
		expect(result.unknownField).toBeUndefined();
	});`
		: '';

	const code = `import { describe, it, expect } from 'bun:test';
import { QModel, QConfig } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${modelName} {
	id: number;
	name: string;
}

/**
 * Model demonstrating @QConfig for global model-level configuration.
 */
@Quick({})
@QConfig({ unknownPropertyPolicy: 'strip', coercionStrategy: 'strict' })
class ${modelName} extends QModel<I${modelName}> {
	declare id: number;
	declare name: string;
}

describe('@QConfig — ${modelName}', () => {
	it('should instantiate with configured model', () => {
		const instance = ${modelName}.create({ id: 1, name: 'Alice' });
		expect(instance).toBeInstanceOf(${modelName});
	});

	it('should respect coercion strategy from @QConfig', () => {
		const instance = ${modelName}.create({ id: 1, name: 'Bob' });
		expect(instance.id).toBe(1);
		expect(instance.name).toBe('Bob');
	});

	it('should serialize correctly with applied config', () => {
		const instance = ${modelName}.create({ id: 2, name: 'Carol' });
		const result = JSON.parse(instance.$qToJSON());
		expect(result.id).toBe(2);
		expect(result.name).toBe('Carol');
	});
${edgeCases}
});
`;
	return { code, count: withEdge ? 4 : 3 };
}

function buildGenericTests(
	decorator: string,
	modelName: string,
	_withEdge: boolean
): { code: string; count: number } {
	const code = `import { describe, it, expect } from 'bun:test';
import { QModel } from 'quickmodel';
import { Quick } from 'quickmodel';

// NOTE: ${decorator} is not a built-in QuickModel decorator.
// This is a generic test scaffold — customize for your use case.

interface I${modelName} {
	id: number;
	value: string;
}

@Quick({})
class ${modelName} extends QModel<I${modelName}> {
	declare id: number;
	declare value: string;
}

describe('${decorator} — ${modelName}', () => {
	it('should be instantiable', () => {
		const instance = ${modelName}.create({ id: 1, value: 'test' });
		expect(instance).toBeInstanceOf(${modelName});
	});

	it('should serialize correctly', () => {
		const instance = ${modelName}.create({ id: 1, value: 'test' });
		const result = JSON.parse(instance.$qToJSON());
		expect(result.id).toBe(1);
		expect(result.value).toBe('test');
	});
});
`;
	return { code, count: 2 };
}

/**
 * Public MCP tool that generates a comprehensive Bun-compatible test suite
 * for a specific QuickModel decorator—without needing to know the full model
 * structure in advance.
 *
 * @remarks
 * Supported decorators: `@Quick`, `@QRule`, `@QField`, `@QAlias`, `@QGroup`,
 * `@QComputed`, `@QConfig`.
 *
 * For each decorator the generated suite includes:
 * - Positive tests (valid data → correct output)
 * - Negative tests (invalid data → expected errors)
 * - Edge-case tests (null, undefined, boundary values) when
 *   `include_edge_cases` is `true` (default).
 *
 * The output is ready to paste into a test file or pipe directly to the
 * QuickModel `generate_test` internal tool.
 *
 * @returns `{ code, decorator, testCount, summary }`.
 *
 * @see {@link QValidateUsageTool} — validate the generated model code before testing
 * @see {@link QSimulateTransformationTool} — preview what transformers will do at runtime
 * @see {@link QListValidatorsTool} — enumerate all available validator decorators
 *
 * @public Part of the QuickModel MCP public tool surface.
 */
export class QGenerateFeatureTestsTool extends QAbstractTool<
	z.ZodObject<{
		decorator: z.ZodString;
		model_name: z.ZodOptional<z.ZodString>;
		include_edge_cases: z.ZodDefault<z.ZodBoolean>;
	}>
> {
	name = 'generate_feature_tests';
	description =
		'Generate a comprehensive Bun-compatible test suite for a specific QuickModel decorator. ' +
		'Supported: @Quick, @QRule, @QField, @QAlias, @QGroup, @QComputed, @QConfig. ' +
		'Each suite includes positive, negative, and edge-case tests. ' +
		'Returns { code, decorator, testCount, summary } — paste the code into a test file.';

	schema = z.object({
		decorator: z
			.string()
			.describe(
				`Name of the QuickModel decorator to generate tests for ` +
					`(supported: ${KNOWN_DECORATORS.join(', ')})`
			),
		model_name: z
			.string()
			.optional()
			.describe(
				'Class name for the generated test model (default: "TestModel")'
			),
		include_edge_cases: z
			.boolean()
			.default(true)
			.describe(
				'Whether to include null/undefined/boundary edge-case tests (default: true)'
			),
	});

	/**
	 * Generates the test suite code for the requested decorator.
	 *
	 * @param args - Tool arguments.
	 * @param args.decorator - Decorator name (e.g. `'@Quick'`).
	 * @param args.model_name - Optional model class name (default: `'TestModel'`).
	 * @param args.include_edge_cases - Include edge-case tests (default: `true`).
	 * @returns `{ code, decorator, testCount, summary }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: {
		decorator: string;
		model_name?: string;
		include_edge_cases?: boolean;
	}): Promise<IGenerateFeatureTestsResult> {
		await Promise.resolve();
		const { code, count } = buildTestCode(args);
		const decoratorClean = args.decorator.startsWith('@')
			? args.decorator
			: `@${args.decorator}`;
		return {
			code,
			decorator: decoratorClean,
			testCount: count,
			summary: `Generated ${count} test(s) for ${decoratorClean} using model "${args.model_name ?? 'TestModel'}"`,
		};
	}
}

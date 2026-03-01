import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

/**
 * Supported integration test types for {@link QGenerateIntegrationTestTool}.
 * @see {@link QGenerateIntegrationTestTool} — tool that uses this type as input
 * @internal
 */
type IIntegrationTestType = 'inheritance' | 'composition' | 'roundtrip';

/**
 * Result returned by {@link QGenerateIntegrationTestTool}.
 * @see {@link QGenerateIntegrationTestTool} — tool whose `execute` returns this shape
 * @internal
 */
interface IGenerateIntegrationTestResult {
	code: string;
	testType: IIntegrationTestType;
	testCount: number;
	summary: string;
}

/**
 * Generates an inheritance integration test suite.
 * @see {@link QGenerateIntegrationTestTool} — tool that calls this builder function
 * @internal
 */
function buildInheritanceTests(
	baseModel: string,
	childModel: string
): { code: string; count: number } {
	const code = `import { describe, it, expect } from 'bun:test';
import { QModel } from 'quickmodel';
import { Quick } from 'quickmodel';

// ── Base model ────────────────────────────────────────────────────────────────

interface I${baseModel} {
	id: number;
	createdAt: Date;
}

@Quick({ createdAt: Date })
class ${baseModel} extends QModel<I${baseModel}> {
	declare id: number;
	declare createdAt: Date;
}

// ── Child model (extends ${baseModel}) ────────────────────────────────────────

interface I${childModel} extends I${baseModel} {
	name: string;
	email: string;
}

@Quick({ createdAt: Date })
class ${childModel} extends ${baseModel}.extends<I${childModel}>() {
	declare name: string;
	declare email: string;
}

// ── Integration tests ─────────────────────────────────────────────────────────

describe('Inheritance — ${childModel} extends ${baseModel}', () => {
	it('${childModel} should be an instance of ${baseModel}', () => {
		const instance = ${childModel}.create({ id: 1, createdAt: '2024-01-01T00:00:00.000Z', name: 'Alice', email: 'a@b.com' });
		expect(instance).toBeInstanceOf(${baseModel});
		expect(instance).toBeInstanceOf(${childModel});
	});

	it('child should inherit base field coercions', () => {
		const instance = ${childModel}.create({ id: '42', createdAt: '2024-03-15T00:00:00.000Z', name: 'Bob', email: 'b@c.com' });
		expect(typeof instance.id).toBe('number');
		expect(instance.id).toBe(42);
		expect(instance.createdAt).toBeInstanceOf(Date);
	});

	it('child should serialize all base + child fields', () => {
		const instance = ${childModel}.create({ id: 1, createdAt: new Date('2024-01-01'), name: 'Carol', email: 'c@d.com' });
		const result = JSON.parse(instance.$qToJSON());
		expect(result).toHaveProperty('id');
		expect(result).toHaveProperty('createdAt');
		expect(result).toHaveProperty('name');
		expect(result).toHaveProperty('email');
	});

	it('child should round-trip without data loss', () => {
		const original = ${childModel}.create({ id: 5, createdAt: '2024-06-01T00:00:00.000Z', name: 'Dave', email: 'd@e.com' });
		const serialized = original.$qSerialize();
		const copy = ${childModel}.create(serialized);
		expect(copy.id).toBe(original.id);
		expect(copy.name).toBe(original.name);
		expect(copy.email).toBe(original.email);
		expect(copy.createdAt.toISOString()).toBe(original.createdAt.toISOString());
	});

	it('base model should not include child-only fields', () => {
		const baseInstance = ${baseModel}.create({ id: 1, createdAt: new Date() });
		const baseResult = JSON.parse(baseInstance.$qToJSON());
		expect(baseResult).not.toHaveProperty('name');
		expect(baseResult).not.toHaveProperty('email');
	});

	it('child mock() should include all fields', () => {
		const mockInstance = ${childModel}.mock().random();
		expect(mockInstance).toBeDefined();
		expect(mockInstance).toHaveProperty('id');
		expect(mockInstance).toHaveProperty('name');
	});
});
`;
	return { code, count: 6 };
}

/**
 * Generates a composition integration test suite.
 * @see {@link QGenerateIntegrationTestTool} — tool that calls this builder function
 * @internal
 */
function buildCompositionTests(
	baseModel: string,
	childModel: string
): { code: string; count: number } {
	const code = `import { describe, it, expect } from 'bun:test';
import { QModel } from 'quickmodel';
import { Quick } from 'quickmodel';

// ── Address model (composed into ${baseModel}) ────────────────────────────────

interface I${childModel} {
	street: string;
	city: string;
}

@Quick({})
class ${childModel} extends QModel<I${childModel}> {
	declare street: string;
	declare city: string;
}

// ── ${baseModel} — composes ${childModel} ─────────────────────────────────────

interface I${baseModel} {
	id: number;
	name: string;
	address: I${childModel};
}

@Quick({})
class ${baseModel} extends QModel<I${baseModel}> {
	declare id: number;
	declare name: string;
	declare address: I${childModel};
}

// ── Integration tests ─────────────────────────────────────────────────────────

describe('Composition — ${baseModel} contains ${childModel}', () => {
	const sampleData = {
		id: 1,
		name: 'Alice',
		address: { street: '123 Main St', city: 'Springfield' },
	};

	it('parent should instantiate with nested object', () => {
		const instance = ${baseModel}.create(sampleData);
		expect(instance).toBeInstanceOf(${baseModel});
		expect(instance.address).toBeDefined();
	});

	it('nested object should have correct field values', () => {
		const instance = ${baseModel}.create(sampleData);
		expect(instance.address.street).toBe('123 Main St');
		expect(instance.address.city).toBe('Springfield');
	});

	it('parent should serialize nested object correctly', () => {
		const instance = ${baseModel}.create(sampleData);
		const result = JSON.parse(instance.$qToJSON());
		expect(result.address).toBeDefined();
		expect(result.address.street).toBe('123 Main St');
	});

	it('round-trip should preserve nested data', () => {
		const original = ${baseModel}.create(sampleData);
		const serialized = original.$qSerialize();
		const copy = ${baseModel}.create(serialized);
		expect(copy.address.city).toBe(original.address.city);
		expect(copy.address.street).toBe(original.address.street);
	});

	it('${childModel} standalone should also work independently', () => {
		const addr = ${childModel}.create({ street: '456 Oak Ave', city: 'Shelbyville' });
		expect(addr.city).toBe('Shelbyville');
	});
});
`;
	return { code, count: 5 };
}

/**
 * Generates a roundtrip integration test suite.
 * @see {@link QGenerateIntegrationTestTool} — tool that calls this builder function
 * @internal
 */
function buildRoundtripTests(baseModel: string): {
	code: string;
	count: number;
} {
	const code = `import { describe, it, expect } from 'bun:test';
import { QModel } from 'quickmodel';
import { Quick } from 'quickmodel';

interface I${baseModel} {
	id: number;
	name: string;
	createdAt: Date;
	score: number;
	active: boolean;
}

/**
 * Full-featured model for round-trip integration testing.
 * Tests that serialize → populate → serialize produces identical results.
 */
@Quick({ createdAt: Date })
class ${baseModel} extends QModel<I${baseModel}> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare score: number;
	declare active: boolean;
}

describe('Round-trip — ${baseModel}', () => {
	const rawData = {
		id: '7',
		name: 'Alice Wonderland',
		createdAt: '2024-06-15T08:30:00.000Z',
		score: '99.5',
		active: true,
	};

	it('should coerce all fields on creation', () => {
		const instance = ${baseModel}.create(rawData);
		expect(typeof instance.id).toBe('number');
		expect(instance.createdAt).toBeInstanceOf(Date);
	});

	it('$qToJSON() === JSON.stringify($qm.serialize())', () => {
		const instance = ${baseModel}.create(rawData);
		const viaToJson = instance.$qToJSON();
		const viaSer = JSON.stringify(instance.$qSerialize());
		expect(viaToJson).toBe(viaSer);
	});

	it('serialize → create should produce identical field values', () => {
		const original = ${baseModel}.create(rawData);
		const copy = ${baseModel}.create(original.$qSerialize());
		expect(copy.id).toBe(original.id);
		expect(copy.name).toBe(original.name);
		expect(copy.score).toBe(original.score);
		expect(copy.active).toBe(original.active);
		expect(copy.createdAt.toISOString()).toBe(original.createdAt.toISOString());
	});

	it('triple round-trip should be stable (idempotent)', () => {
		const first = ${baseModel}.create(rawData);
		const second = ${baseModel}.create(first.$qSerialize());
			const third = ${baseModel}.create(second.$qSerialize());
		expect(third.$qToJSON()).toBe(first.$qToJSON());
	});

	it('mock() + round-trip should be stable', () => {
		const mock = ${baseModel}.mock().random();
			const serialized = (${baseModel}.create(mock as any)).$qSerialize();
		const copy = ${baseModel}.create(serialized);
		expect(copy.$qToJSON()).toBeDefined();
	});

	it('copy() should not mutate original', () => {
		const original = ${baseModel}.create(rawData);
		const modified = original.$qCopy({ name: 'Bob' });
		expect(original.name).toBe('Alice Wonderland');
		expect(modified.name).toBe('Bob');
	});
});
`;
	return { code, count: 6 };
}

/**
 * Public MCP tool that generates integration test code for two QuickModel
 * classes based on a selected test strategy.
 *
 * @remarks
 * Three test strategies are supported:
 * - **inheritance** — tests that a child model correctly inherits and extends
 *   its parent, including field coercions, serialization, and round-trips.
 * - **composition** — tests that a parent model properly composes a nested
 *   child model (embedded objects), including serialization of nested data.
 * - **roundtrip** — tests that a single model survives serialize → create →
 *   serialize without data loss (idempotency).
 *
 * The generated code is ready to paste into a test file under `tests/integration/`.
 *
 * @returns `{ code, testType, testCount, summary }`.
 *
 * @see {@link QGenerateFeatureTestsTool} — generate unit tests for a specific decorator
 * @see {@link QRoundtripTool} — live round-trip simulation tool
 * @see {@link QDiffModelsTool} — compare two model definitions for structural differences
 *
 * @public Part of the QuickModel MCP public tool surface.
 */
export class QGenerateIntegrationTestTool extends QAbstractTool<
	z.ZodObject<{
		base_model: z.ZodString;
		child_model: z.ZodOptional<z.ZodString>;
		test_type: z.ZodDefault<
			z.ZodEnum<{
				inheritance: 'inheritance';
				composition: 'composition';
				roundtrip: 'roundtrip';
			}>
		>;
	}>
> {
	name = 'generate_integration_test';
	description =
		'Generate integration test code for QuickModel models based on a strategy. ' +
		'test_type="inheritance": child extends base — coercions, serialization, round-trip. ' +
		'test_type="composition": parent embeds child as nested object — serialization, round-trip. ' +
		'test_type="roundtrip": single model serialize→create idempotency (child_model optional). ' +
		'Returns { code, testType, testCount, summary } — paste code into tests/integration/.';

	schema = z.object({
		base_model: z
			.string()
			.describe(
				'Class name of the base (or only) model (e.g. "UserModel", "BaseEntityModel")'
			),
		child_model: z
			.string()
			.optional()
			.describe(
				'Class name of the child/nested model. Required for inheritance and composition; optional for roundtrip.'
			),
		test_type: z
			.enum(['inheritance', 'composition', 'roundtrip'])
			.default('roundtrip')
			.describe(
				'Integration test strategy: "inheritance" | "composition" | "roundtrip" (default)'
			),
	});

	/**
	 * Generates integration test code for the requested strategy.
	 *
	 * @param args - Tool arguments.
	 * @param args.base_model - Base model class name.
	 * @param args.child_model - Child/nested model class name (required for inheritance/composition).
	 * @param args.test_type - Test strategy.
	 * @returns `{ code, testType, testCount, summary }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: {
		base_model: string;
		child_model?: string;
		test_type?: IIntegrationTestType;
	}): Promise<IGenerateIntegrationTestResult> {
		const testType: IIntegrationTestType = args.test_type ?? 'roundtrip';
		await Promise.resolve();

		if (
			(testType === 'inheritance' || testType === 'composition') &&
			!args.child_model
		) {
			return {
				code: `// ERROR: test_type="${testType}" requires a child_model argument.`,
				testType,
				testCount: 0,
				summary: `child_model is required for test_type="${testType}"`,
			};
		}

		const childName = args.child_model ?? `${args.base_model}Child`;
		let code: string;
		let count: number;

		if (testType === 'inheritance') {
			({ code, count } = buildInheritanceTests(
				args.base_model,
				childName
			));
		} else if (testType === 'composition') {
			({ code, count } = buildCompositionTests(
				args.base_model,
				childName
			));
		} else {
			({ code, count } = buildRoundtripTests(args.base_model));
		}

		return {
			code,
			testType,
			testCount: count,
			summary: `Generated ${count} ${testType} test(s) for ${args.base_model}${args.child_model ? ` / ${args.child_model}` : ''}`,
		};
	}
}

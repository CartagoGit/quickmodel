/**
 * Integration Test: QuickModel + AVA (simulation)
 *
 * AVA is a concurrent test runner that does not use `expect.extend()`.
 * Instead, it provides built-in `t.is()`, `t.true()`, `t.throws()`, and
 * supports macros — reusable test functions.
 *
 * This file:
 * 1. Implements `qModelMacros` — macro-style helpers for AVA.
 * 2. Implements a minimal AVA-like `test()` executor for simulation.
 * 3. Demonstrates the full AVA workflow with QuickModel.
 *
 * In a real AVA project:
 * ```typescript
 * // test/helpers/quickmodel.ts
 * import type { ExecutionContext } from 'ava';
 * import { quickmodelMatchers } from 'quickmodel/matchers';
 *
 * export function assertValid(ctl: ExecutionContext, model: object) {
 *   const result = quickmodelMatchers.toBeValidQModel(model);
 *   ctl.true(result.pass, result.message());
 * }
 *
 * // test/order.test.ts
 * import test from 'ava';
 * import { assertValid } from './helpers/quickmodel';
 *
 * test('valid order', (ctl) => assertValid(ctl, new OrderDto({ ... })));
 * ```
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField } from '@/decorators';
import { quickmodelMatchers } from '@/matchers';

// ---------------------------------------------------------------------------
// AVA-style execution context simulator
// ---------------------------------------------------------------------------

interface IAvaContext {
	true(val: unknown, msg?: string): void;
	false(val: unknown, msg?: string): void;
	is<T>(actual: T, expected: T, msg?: string): void;
	pass(msg?: string): void;
	fail(msg?: string): void;
	notThrows(fn: () => unknown, msg?: string): void;
	throws(fn: () => unknown, msg?: string): void;
	results: { passed: number; failed: number; messages: string[] };
}

function createAvaContext(): IAvaContext {
	const results = { passed: 0, failed: 0, messages: [] as string[] };

	const ctx: IAvaContext = {
		results,
		true(val: unknown, msg = 'Expected truthy') {
			if (!val) throw new Error(`AVA assertion failed: ${msg}`);
			results.passed++;
		},
		false(val: unknown, msg = 'Expected falsy') {
			if (val) throw new Error(`AVA assertion failed: ${msg}`);
			results.passed++;
		},
		is<T>(actual: T, expected: T, msg = 'Expected values to be equal') {
			if (actual !== expected)
				throw new Error(
					`AVA assertion failed: ${msg} — got ${String(actual)}, expected ${String(expected)}`
				);
			results.passed++;
		},
		pass(msg = 'Pass') {
			results.passed++;
			results.messages.push(msg);
		},
		fail(msg = 'Fail') {
			results.failed++;
			throw new Error(`AVA assertion failed: ${msg}`);
		},
		notThrows(func: () => unknown, msg = 'Function threw unexpectedly') {
			try {
				func();
				results.passed++;
			} catch {
				throw new Error(`AVA assertion failed: ${msg}`);
			}
		},
		throws(func: () => unknown, msg = 'Function did not throw') {
			let threw = false;
			try {
				func();
			} catch {
				threw = true;
			}
			if (!threw) throw new Error(`AVA assertion failed: ${msg}`);
			results.passed++;
		},
	};

	return ctx;
}

// ---------------------------------------------------------------------------
// qModelMacros — AVA macro helpers for QuickModel
// ---------------------------------------------------------------------------

interface IAssertRuleErrorOpts {
	model: object;
	field: string;
	message?: string;
}

/**
 * AVA macro helpers for QuickModel assertions.
 * Each helper receives an AVA `ExecutionContext` (ctl) as first argument.
 */
const qModelMacros = {
	/**
	 * `t.true(result.pass)` — asserts the model passes all @QRule checks.
	 */
	assertValid(ctl: IAvaContext, model: object): void {
		const result = quickmodelMatchers.toBeValidQModel(model);
		ctl.true(result.pass, result.message());
	},

	/**
	 * `t.false(result.pass)` — asserts the model fails at least one @QRule check.
	 */
	assertInvalid(ctl: IAvaContext, model: object): void {
		const result = quickmodelMatchers.toBeValidQModel(model);
		ctl.false(result.pass, result.message());
	},

	/**
	 * Asserts that `field` has a `@QRule` error, optionally matching `message`.
	 */
	assertRuleError(ctl: IAvaContext, opts: IAssertRuleErrorOpts): void {
		const result = quickmodelMatchers.toHaveQRuleError(
			opts.model,
			opts.field,
			opts.message
		);
		ctl.true(result.pass, result.message());
	},

	/**
	 * Asserts that `field` has a `@QField` decorator.
	 */
	assertHasField(ctl: IAvaContext, model: object, field: string): void {
		const result = quickmodelMatchers.toHaveQField(model, field);
		ctl.true(result.pass, result.message());
	},

	/**
	 * Asserts deep equality via `serialize()`.
	 */
	assertMatches(ctl: IAvaContext, received: object, expected: object): void {
		const result = quickmodelMatchers.toMatchQModel(received, expected);
		ctl.true(result.pass, result.message());
	},

	/**
	 * Asserts `hasIntegrity()` returns true.
	 */
	assertIntact(ctl: IAvaContext, model: object): void {
		const result = quickmodelMatchers.toBeIntact(model);
		ctl.true(result.pass, result.message());
	},

	/**
	 * Asserts `isDirty(field)` returns true.
	 */
	assertDirty(ctl: IAvaContext, model: object, field: string): void {
		const result = quickmodelMatchers.toHaveDirtyField(model, field);
		ctl.true(result.pass, result.message());
	},

	/**
	 * Asserts `isDirty(field)` returns false.
	 */
	assertClean(ctl: IAvaContext, model: object, field: string): void {
		const result = quickmodelMatchers.toHaveDirtyField(model, field);
		ctl.false(result.pass, result.message());
	},
};

// ---------------------------------------------------------------------------
// Test models
// ---------------------------------------------------------------------------

interface IReportDto {
	reportId: string;
	title: string;
	score: number;
	generatedAt: Date;
}

@Quick(
	{ reportId: 'string', title: 'string', score: 'number', generatedAt: Date },
	{ unknownPropertyPolicy: 'strip' }
)
class ReportDto extends QModel<IReportDto> {
	@QField({ widget: 'input', label: 'Report ID', required: true })
	@QRule((val: string) => /^RPT-[A-Z0-9]{6}$/.test(val), 'Invalid report ID')
	declare reportId: string;

	@QField({ widget: 'input', label: 'Title', required: true })
	@QRule((val: string) => val.trim().length >= 3, 'Title too short')
	@QRule((val: string) => val.length <= 200, 'Title too long')
	declare title: string;

	@QField({ widget: 'input', label: 'Score' })
	@QRule((val: number) => val >= 0 && val <= 100, 'Score must be 0-100')
	declare score: number;

	declare generatedAt: Date;
}

function makeValidReport(): ReportDto {
	return new ReportDto({
		reportId: 'RPT-AB1234',
		title: 'Q4 Analysis',
		score: 87,
		generatedAt: '2025-12-15T08:00:00Z',
	});
}

function makeInvalidReport(): ReportDto {
	return new ReportDto({
		reportId: 'bad', // wrong format
		title: 'X', // too short
		score: 150, // > 100
		generatedAt: '2025-12-15T08:00:00Z',
	});
}

// ---------------------------------------------------------------------------
// qModelMacros contract tests
// ---------------------------------------------------------------------------

describe('AVA Integration: qModelMacros API', () => {
	test('qModelMacros exposes all expected helpers', () => {
		const methods: Array<keyof typeof qModelMacros> = [
			'assertValid',
			'assertInvalid',
			'assertRuleError',
			'assertHasField',
			'assertMatches',
			'assertIntact',
			'assertDirty',
			'assertClean',
		];
		for (const method of methods) {
			expect(typeof qModelMacros[method]).toBe('function');
		}
	});
});

// ---------------------------------------------------------------------------
// AVA-style test simulations
// ---------------------------------------------------------------------------

describe('AVA Integration: assertValid / assertInvalid', () => {
	test('valid report passes assertValid', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertValid(ctl, makeValidReport())
		).not.toThrow();
		expect(ctl.results.passed).toBe(1);
	});

	test('invalid report fails assertValid', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertValid(ctl, makeInvalidReport())
		).toThrow();
	});

	test('invalid report passes assertInvalid', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertInvalid(ctl, makeInvalidReport())
		).not.toThrow();
		expect(ctl.results.passed).toBe(1);
	});

	test('valid report fails assertInvalid', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertInvalid(ctl, makeValidReport())
		).toThrow();
	});
});

describe('AVA Integration: assertRuleError', () => {
	let report: ReportDto;

	beforeEach(() => {
		report = makeInvalidReport();
	});

	test('detects report ID format error', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertRuleError(ctl, {
				model: report,
				field: 'reportId',
				message: 'Invalid report ID',
			})
		).not.toThrow();
	});

	test('detects title too short error', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertRuleError(ctl, {
				model: report,
				field: 'title',
				message: 'Title too short',
			})
		).not.toThrow();
	});

	test('detects score out-of-range error', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertRuleError(ctl, {
				model: report,
				field: 'score',
				message: 'Score must be 0-100',
			})
		).not.toThrow();
	});

	test('does not report errors on valid report', () => {
		const ctl = createAvaContext();
		const validReport = makeValidReport();
		// For a valid report, toHaveQRuleError returns pass=false — meaning this
		// assertRuleError call SHOULD throw (there is no error to assert about)
		expect(() =>
			qModelMacros.assertRuleError(ctl, {
				model: validReport,
				field: 'reportId',
			})
		).toThrow();
	});
});

describe('AVA Integration: assertHasField', () => {
	test('QField-decorated properties pass', () => {
		const ctl = createAvaContext();
		const report = makeValidReport();
		expect(() =>
			qModelMacros.assertHasField(ctl, report, 'reportId')
		).not.toThrow();
		expect(() =>
			qModelMacros.assertHasField(ctl, report, 'title')
		).not.toThrow();
		expect(() =>
			qModelMacros.assertHasField(ctl, report, 'score')
		).not.toThrow();
		expect(ctl.results.passed).toBe(3);
	});

	test('non-decorated field throws', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertHasField(ctl, makeValidReport(), 'generatedAt')
		).toThrow();
	});
});

describe('AVA Integration: assertMatches', () => {
	test('identical reports match', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertMatches(
				ctl,
				makeValidReport(),
				makeValidReport()
			)
		).not.toThrow();
	});

	test('reports with different scores do not match', () => {
		const ctl = createAvaContext();
		const reportA = makeValidReport();
		const reportB = new ReportDto({
			reportId: 'RPT-AB1234',
			title: 'Q4 Analysis',
			score: 50, // different
			generatedAt: '2025-12-15T08:00:00Z',
		});
		expect(() =>
			qModelMacros.assertMatches(ctl, reportA, reportB)
		).toThrow();
	});
});

describe('AVA Integration: assertIntact', () => {
	test('new report is intact', () => {
		const ctl = createAvaContext();
		expect(() =>
			qModelMacros.assertIntact(ctl, makeValidReport())
		).not.toThrow();
	});
});

describe('AVA Integration: assertDirty / assertClean', () => {
	test('fresh report has clean fields', () => {
		const ctl = createAvaContext();
		const report = makeValidReport();
		expect(() =>
			qModelMacros.assertClean(ctl, report, 'score')
		).not.toThrow();
		expect(() =>
			qModelMacros.assertClean(ctl, report, 'title')
		).not.toThrow();
	});

	test('mutated field is dirty', () => {
		const ctl = createAvaContext();
		const report = makeValidReport();
		report.score = 100;
		expect(() =>
			qModelMacros.assertDirty(ctl, report, 'score')
		).not.toThrow();
	});

	test('only mutated field is dirty', () => {
		const ctl = createAvaContext();
		const report = makeValidReport();
		report.title = 'Updated Title';
		expect(() =>
			qModelMacros.assertDirty(ctl, report, 'title')
		).not.toThrow();
		expect(() =>
			qModelMacros.assertClean(ctl, report, 'score')
		).not.toThrow();
	});
});

describe('AVA Integration: AVA context accumulates pass count', () => {
	test('context tracks assertion count correctly', () => {
		const ctl = createAvaContext();
		const report = makeValidReport();
		qModelMacros.assertValid(ctl, report);
		qModelMacros.assertIntact(ctl, report);
		qModelMacros.assertHasField(ctl, report, 'title');
		expect(ctl.results.passed).toBe(3);
		expect(ctl.results.failed).toBe(0);
	});
});

describe('AVA Integration: type coercion', () => {
	test('Date fields are proper Date instances', () => {
		const report = makeValidReport();
		expect(report.generatedAt).toBeInstanceOf(Date);
		expect(report.generatedAt.getFullYear()).toBe(2025);
	});

	test('roundtrip: serialize() + re-create passes assertMatches', () => {
		const ctl = createAvaContext();
		const original = makeValidReport();
		const restored = new ReportDto(original.$qm.serialize());
		expect(() =>
			qModelMacros.assertMatches(ctl, original, restored)
		).not.toThrow();
	});
});

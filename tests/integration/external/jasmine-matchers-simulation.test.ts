/**
 * Integration Test: QuickModel + Jasmine (simulation)
 *
 * Jasmine uses a different matcher API than Jest/Vitest/Bun:
 *   `jasmine.addMatchers(matcherFactories)` where each factory is:
 *   `() => ({ compare: (actual, ...args) => ({ pass, message }) })`
 *
 * This file:
 * 1. Implements a `toJasmineMatchers()` adapter that converts `quickmodelMatchers`
 *    to Jasmine's factory format.
 * 2. Validates the adapter produces correct results.
 * 3. Simulates Jasmine-style test assertions using a mini Jasmine-like `expect()`.
 *
 * In a real Jasmine project the setup is:
 * ```typescript
 * // jasmine.setup.ts  (or in beforeAll())
 * import { quickmodelMatchers } from '@cartago-git/quickmodel/matchers';
 * import { toJasmineMatchers } from '@cartago-git/quickmodel/matchers'; // adapter
 * jasmine.addMatchers(toJasmineMatchers(quickmodelMatchers));
 * ```
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QField } from '@/index';
import { quickmodelMatchers } from '@/matchers';

// ---------------------------------------------------------------------------
// Jasmine matcher adapter
// ---------------------------------------------------------------------------
// The adapter converts { pass, message() } → Jasmine's factory format.
// This is what you'd ship in a real @cartago-git/quickmodel/jasmine-matchers module.

type IQuickMatcher = (
	received: object,
	...args: unknown[]
) => { pass: boolean; message: () => string };

interface IJasmineCompareResult {
	pass: boolean;
	message: string;
}

interface IJasmineMatcherFactory {
	compare: (actual: unknown, ...args: unknown[]) => IJasmineCompareResult;
	negativeCompare?: (
		actual: object,
		...args: unknown[]
	) => IJasmineCompareResult;
}

type IJasmineMatchersObject = Record<string, () => IJasmineMatcherFactory>;

/**
 * Converts QuickModel's `{ pass, message() }` matchers to Jasmine's factory format.
 *
 * @example
 * ```typescript
 * import { jasmine } from 'jasmine';
 * import { quickmodelMatchers, toJasmineMatchers } from '@cartago-git/quickmodel/matchers';
 *
 * beforeAll(() => jasmine.addMatchers(toJasmineMatchers(quickmodelMatchers)));
 * ```
 */
function toJasmineMatchers(
	matchers: Record<string, IQuickMatcher>
): IJasmineMatchersObject {
	const result: IJasmineMatchersObject = {};

	for (const [name, matcherFn] of Object.entries(matchers)) {
		result[name] = () => ({
			compare: (
				actual: unknown,
				...args: unknown[]
			): IJasmineCompareResult => {
				const outcome = (
					matcherFn as (
						r: unknown,
						...rest: unknown[]
					) => { pass: boolean; message: () => string }
				)(actual, ...args);
				return {
					pass: outcome.pass,
					message: outcome.message(),
				};
			},
		});
	}

	return result;
}

// ---------------------------------------------------------------------------
// Minimal Jasmine-like expect wrapper (for simulation without Jasmine installed)
// ---------------------------------------------------------------------------

interface IJasmineExpect {
	toBeValidQModel(): void;
	toHaveQRuleError(field: string, message?: string): void;
	toHaveQField(fieldName: string): void;
	toMatchQModel(expected: object): void;
	toBeIntact(): void;
	toHaveDirtyField(field: string): void;
	not: IJasmineExpect;
}

function jasmineExpect(actual: unknown): IJasmineExpect {
	const jasmineMatchers = toJasmineMatchers(
		quickmodelMatchers as unknown as Record<string, IQuickMatcher>
	);

	function call(name: string, negate: boolean, ...args: unknown[]): void {
		const factory = jasmineMatchers[name];
		if (!factory) throw new Error(`Matcher '${name}' not found`);
		const result = factory().compare(actual, ...args);

		if (negate ? result.pass : !result.pass) {
			throw new Error(
				`Jasmine matcher ${negate ? '.not.' : '.'}${name}() failed: ${result.message}`
			);
		}
	}

	const pos: IJasmineExpect = {
		toBeValidQModel: () => call('toBeValidQModel', false),
		toHaveQRuleError: (fld: string, msg?: string) =>
			call('toHaveQRuleError', false, fld, msg),
		toHaveQField: (fld: string) => call('toHaveQField', false, fld),
		toMatchQModel: (exp: Record<string, unknown>) =>
			call('toMatchQModel', false, exp),
		toBeIntact: () => call('toBeIntact', false),
		toHaveDirtyField: (fld: string) => call('toHaveDirtyField', false, fld),
		get not() {
			return neg;
		},
	};

	const neg: IJasmineExpect = {
		toBeValidQModel: () => call('toBeValidQModel', true),
		toHaveQRuleError: (fld: string, msg?: string) =>
			call('toHaveQRuleError', true, fld, msg),
		toHaveQField: (fld: string) => call('toHaveQField', true, fld),
		toMatchQModel: (exp: Record<string, unknown>) =>
			call('toMatchQModel', true, exp),
		toBeIntact: () => call('toBeIntact', true),
		toHaveDirtyField: (fld: string) => call('toHaveDirtyField', true, fld),
		get not() {
			return pos;
		},
	};

	return pos;
}

// ---------------------------------------------------------------------------
// Test models
// ---------------------------------------------------------------------------

interface IProductDto {
	sku: string;
	price: number;
	stock: number;
	category: string;
}

@Quick(
	{ sku: 'string', price: 'number', stock: 'number', category: 'string' },
	{ unknownPropertyPolicy: 'strip' }
)
class ProductDto extends QModel<IProductDto> {
	@QField({ widget: 'input', label: 'SKU', required: true })
	@QRule(
		(val: string) => /^[A-Z]{2,4}-\d{4,8}$/.test(val),
		'Invalid SKU format'
	)
	declare sku: string;

	@QField({ widget: 'input', label: 'Price', required: true })
	@QRule((val: number) => val > 0, 'Price must be positive')
	@QRule((val: number) => val < 100_000, 'Price too high')
	declare price: number;

	@QField({ widget: 'input', label: 'Stock' })
	@QRule((val: number) => Number.isInteger(val), 'Stock must be an integer')
	@QRule((val: number) => val >= 0, 'Stock cannot be negative')
	declare stock: number;

	declare category: string;
}

function makeValidProduct(): ProductDto {
	return new ProductDto({
		sku: 'ELEC-0042',
		price: 299.99,
		stock: 10,
		category: 'electronics',
	});
}

function makeInvalidProduct(): ProductDto {
	return new ProductDto({ sku: 'bad', price: -1, stock: -5, category: 'x' });
}

// ---------------------------------------------------------------------------
// Adapter contract tests
// ---------------------------------------------------------------------------

describe('Jasmine Integration: toJasmineMatchers() adapter', () => {
	test('adapter produces a factory for every matcher', () => {
		const adapted = toJasmineMatchers(
			quickmodelMatchers as unknown as Record<string, IQuickMatcher>
		);
		const expectedKeys = [
			'toBeValidQModel',
			'toHaveQRuleError',
			'toHaveQField',
			'toMatchQModel',
			'toBeIntact',
			'toHaveDirtyField',
		];
		for (const key of expectedKeys) {
			expect(typeof adapted[key]).toBe('function');
			expect(typeof adapted[key]().compare).toBe('function');
		}
	});

	test('each compare() returns { pass: boolean, message: string }', () => {
		const adapted = toJasmineMatchers(
			quickmodelMatchers as unknown as Record<string, IQuickMatcher>
		);
		const product = makeValidProduct();

		const result = adapted['toBeValidQModel']().compare(product);
		expect(typeof result.pass).toBe('boolean');
		expect(typeof result.message).toBe('string');
	});

	test('compare() for valid model returns pass=true', () => {
		const adapted = toJasmineMatchers(
			quickmodelMatchers as unknown as Record<string, IQuickMatcher>
		);
		const product = makeValidProduct();
		const result = adapted['toBeValidQModel']().compare(product);
		expect(result.pass).toBe(true);
	});

	test('compare() for invalid model returns pass=false with message', () => {
		const adapted = toJasmineMatchers(
			quickmodelMatchers as unknown as Record<string, IQuickMatcher>
		);
		const product = makeInvalidProduct();
		const result = adapted['toBeValidQModel']().compare(product);
		expect(result.pass).toBe(false);
		expect(result.message.length).toBeGreaterThan(0);
	});

	test('toHaveQRuleError compare() passes extra args correctly', () => {
		const adapted = toJasmineMatchers(
			quickmodelMatchers as unknown as Record<string, IQuickMatcher>
		);
		const product = makeInvalidProduct();
		const result = adapted['toHaveQRuleError']().compare(
			product,
			'sku',
			'Invalid SKU format'
		);
		expect(result.pass).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Jasmine-style test assertions (simulated with jasmineExpect wrapper)
// ---------------------------------------------------------------------------

describe('Jasmine Integration: toBeValidQModel()', () => {
	test('valid product passes', () => {
		expect(() =>
			jasmineExpect(makeValidProduct()).toBeValidQModel()
		).not.toThrow();
	});

	test('invalid product fails (should throw)', () => {
		expect(() =>
			jasmineExpect(makeInvalidProduct()).toBeValidQModel()
		).toThrow();
	});

	test('invalid product passes with .not.toBeValidQModel()', () => {
		expect(() =>
			jasmineExpect(makeInvalidProduct()).not.toBeValidQModel()
		).not.toThrow();
	});
});

describe('Jasmine Integration: toHaveQRuleError(field, message?)', () => {
	let product: ProductDto;

	beforeEach(() => {
		product = makeInvalidProduct();
	});

	test('detects sku format error', () => {
		expect(() =>
			jasmineExpect(product).toHaveQRuleError('sku', 'Invalid SKU format')
		).not.toThrow();
	});

	test('detects price error', () => {
		expect(() =>
			jasmineExpect(product).toHaveQRuleError(
				'price',
				'Price must be positive'
			)
		).not.toThrow();
	});

	test('detects stock error', () => {
		expect(() =>
			jasmineExpect(product).toHaveQRuleError(
				'stock',
				'Stock cannot be negative'
			)
		).not.toThrow();
	});

	test('valid product has no sku errors', () => {
		expect(() =>
			jasmineExpect(makeValidProduct()).not.toHaveQRuleError('sku')
		).not.toThrow();
	});
});

describe('Jasmine Integration: toHaveQField(fieldName)', () => {
	test('decorated fields are detected', () => {
		const product = makeValidProduct();
		expect(() => jasmineExpect(product).toHaveQField('sku')).not.toThrow();
		expect(() =>
			jasmineExpect(product).toHaveQField('price')
		).not.toThrow();
		expect(() =>
			jasmineExpect(product).toHaveQField('stock')
		).not.toThrow();
	});

	test('non-decorated field is not detected', () => {
		const product = makeValidProduct();
		expect(() =>
			jasmineExpect(product).not.toHaveQField('category')
		).not.toThrow();
	});
});

describe('Jasmine Integration: toMatchQModel(expected)', () => {
	test('identical products match', () => {
		const productA = makeValidProduct();
		const productB = makeValidProduct();
		expect(() =>
			jasmineExpect(productA).toMatchQModel(productB)
		).not.toThrow();
	});

	test('products with different prices do not match', () => {
		const productA = makeValidProduct();
		const productB = new ProductDto({
			sku: 'ELEC-0042',
			price: 999,
			stock: 10,
			category: 'electronics',
		});
		expect(() =>
			jasmineExpect(productA).not.toMatchQModel(productB)
		).not.toThrow();
	});
});

describe('Jasmine Integration: toBeIntact()', () => {
	test('new model is intact', () => {
		expect(() =>
			jasmineExpect(makeValidProduct()).toBeIntact()
		).not.toThrow();
	});
});

describe('Jasmine Integration: toHaveDirtyField(field)', () => {
	test('fresh model has no dirty fields', () => {
		const product = makeValidProduct();
		expect(() =>
			jasmineExpect(product).not.toHaveDirtyField('price')
		).not.toThrow();
	});

	test('mutated field is detected as dirty', () => {
		const product = makeValidProduct();
		product.price = 500;
		expect(() =>
			jasmineExpect(product).toHaveDirtyField('price')
		).not.toThrow();
	});

	test('only mutated field is dirty', () => {
		const product = makeValidProduct();
		product.stock = 99;
		expect(() =>
			jasmineExpect(product).toHaveDirtyField('stock')
		).not.toThrow();
		expect(() =>
			jasmineExpect(product).not.toHaveDirtyField('price')
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Error message quality checks
// ---------------------------------------------------------------------------

describe('Jasmine Integration: error message quality', () => {
	test('toBeValidQModel failure message lists field errors', () => {
		const adapted = toJasmineMatchers(
			quickmodelMatchers as unknown as Record<string, IQuickMatcher>
		);
		const product = makeInvalidProduct();
		const result = adapted['toBeValidQModel']().compare(product);
		expect(result.pass).toBe(false);
		expect(result.message).toContain('sku');
	});

	test('toHaveQRuleError negated message is descriptive', () => {
		const adapted = toJasmineMatchers(
			quickmodelMatchers as unknown as Record<string, IQuickMatcher>
		);
		const product = makeValidProduct();
		const result = adapted['toHaveQRuleError']().compare(product, 'price');
		expect(result.pass).toBe(false);
		expect(result.message).toContain('price');
	});
});

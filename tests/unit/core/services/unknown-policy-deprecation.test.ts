/**
 * Task #22 — unknownPropertyPolicy deprecation warning (v1.x → v2.0.0)
 *
 * When neither the model nor the global config explicitly sets
 * `unknownPropertyPolicy`, QuickModel falls back to 'keep' — the current
 * default that WILL change to 'strip' in v2.0.0.
 * A deprecation warning must be emitted to encourage explicit configuration.
 *
 * TDD: tests written first, implementation follows.
 */
import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { Quick, QModel, QConfig } from '@/index';
import { Logger } from '@/core/helpers/logger.helper';
import { PopulationService } from '@/core/services/population.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface IProduct {
	name: string;
	price: number;
}

/** No unknownPropertyPolicy at all */
@Quick({ name: String, price: Number })
class ProductNoPolicyModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

/** Explicit 'keep' — should NOT warn */
@Quick({ name: String, price: Number }, { unknownPropertyPolicy: 'keep' })
class ProductKeepModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

/** Explicit 'strip' — should NOT warn */
@Quick({ name: String, price: Number }, { unknownPropertyPolicy: 'strip' })
class ProductStripModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

/** Explicit 'error' — should NOT warn */
@Quick({ name: String, price: Number }, { unknownPropertyPolicy: 'error' })
class ProductErrorModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Task #22 — unknownPropertyPolicy deprecation warning', () => {
	let warnSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		warnSpy = spyOn(Logger, 'warn').mockImplementation(() => {});
		QConfig.reset();
		// Reset per-class deduplication so each test sees fresh warnings
		PopulationService._clearWarnedPolicyCache();
	});

	afterEach(() => {
		warnSpy.mockRestore();
		QConfig.reset();
		PopulationService._clearWarnedPolicyCache();
	});

	// ── 1. Warning fires when policy is absent ────────────────────────────

	test('emits a deprecation warning when unknownPropertyPolicy is not set', () => {
		ProductNoPolicyModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasDeprecation = warnings.some((msg) =>
			msg.includes('unknownPropertyPolicy')
		);
		expect(hasDeprecation).toBe(true);
	});

	test('deprecation warning mentions v2.0.0', () => {
		ProductNoPolicyModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasVersion = warnings.some(
			(msg) => msg.includes('v2.0.0') || msg.includes('v2')
		);
		expect(hasVersion).toBe(true);
	});

	test('deprecation warning mentions the model class name', () => {
		ProductNoPolicyModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasClassName = warnings.some((msg) =>
			msg.includes('ProductNoPolicyModel')
		);
		expect(hasClassName).toBe(true);
	});

	// ── 2. Warning does NOT fire when policy is explicitly configured ─────

	test('does NOT warn when unknownPropertyPolicy is explicitly set to "keep"', () => {
		ProductKeepModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasDeprecation = warnings.some((msg) =>
			msg.includes('unknownPropertyPolicy')
		);
		expect(hasDeprecation).toBe(false);
	});

	test('does NOT warn when unknownPropertyPolicy is explicitly set to "strip"', () => {
		ProductStripModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasDeprecation = warnings.some((msg) =>
			msg.includes('unknownPropertyPolicy')
		);
		expect(hasDeprecation).toBe(false);
	});

	test('does NOT warn when unknownPropertyPolicy is explicitly set to "error"', () => {
		// Pass only declared properties to avoid the error policy throwing
		ProductErrorModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasDeprecation = warnings.some((msg) =>
			msg.includes('unknownPropertyPolicy')
		);
		expect(hasDeprecation).toBe(false);
	});

	// ── 3. Global config suppresses the warning ───────────────────────────

	test('does NOT warn when global config sets unknownPropertyPolicy', () => {
		QConfig.configure({ defaults: { unknownPropertyPolicy: 'strip' } });

		ProductNoPolicyModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasDeprecation = warnings.some((msg) =>
			msg.includes('unknownPropertyPolicy')
		);
		expect(hasDeprecation).toBe(false);
	});

	// ── 4. Warning fires only on root call (not recursion) ────────────────

	test('warning fires only once per create() call, not repeatedly during recursion', () => {
		interface IOrder {
			id: number;
			product: IProduct;
		}

		@Quick({ id: Number, product: ProductNoPolicyModel })
		class OrderModel extends QModel<IOrder> {
			declare id: number;
			declare product: IProduct;
		}

		OrderModel.create({ id: 1, product: { name: 'Widget', price: 9.99 } });

		const calls = warnSpy.mock.calls as string[][];
		const deprecationWarnings = calls.filter((args) =>
			String(args[0]).includes('unknownPropertyPolicy')
		);
		// Should fire at most once per root call per class
		// (two classes without policy: OrderModel + ProductNoPolicyModel → at most 2 warnings, 1 each)
		expect(deprecationWarnings.length).toBeGreaterThan(0);
		expect(deprecationWarnings.length).toBeLessThanOrEqual(2);
	});

	// ── 5. Recommended call to action in the warning ─────────────────────

	test('deprecation warning recommends setting the policy explicitly', () => {
		ProductNoPolicyModel.create({ name: 'Widget', price: 9.99 });

		const calls = warnSpy.mock.calls as string[][];
		const warnings = calls.map((args) => String(args[0]));
		const hasRecommendation = warnings.some(
			(msg) =>
				msg.includes("'strip'") ||
				msg.includes('"strip"') ||
				msg.includes('strip') ||
				msg.includes('explicit')
		);
		expect(hasRecommendation).toBe(true);
	});
});

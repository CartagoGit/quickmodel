/**
 * Integration tests for QConfig global configuration propagation.
 * Covers: cross-feature/C
 *
 * Tests that changing QConfig globally affects all models without explicit config,
 * while models with explicit config maintain their override.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { QConfig, QModel, Quick } from '@/index';
import { QRule } from '@/decorators';

// ─── Models defined with explicit config (should NOT be affected by globals) ──

interface IExplicit {
	name: string;
	extra: string;
}

// This model always keeps unknowns — not affected by global 'error' policy
@Quick({}, { unknownPropertyPolicy: 'keep' })
class ExplicitKeepModel extends QModel<IExplicit> {
	declare name: string;
	declare extra: string;
}

// ─── Models defined without explicit unknownPropertyPolicy ───────────────────

interface IFlexible {
	title: string;
	value: number;
}

@Quick({ title: String, value: Number })
class FlexibleModel extends QModel<IFlexible> {
	declare title: string;
	declare value: number;
}

// ─── Models for QRule validation ─────────────────────────────────────────────

interface IProduct {
	name: string;
	price: number;
}

@Quick({ price: Number }, { unknownPropertyPolicy: 'keep' })
class ProductModel extends QModel<IProduct> {
	@QRule(
		(val: string) => typeof val === 'string' && val.length > 0,
		'Name is required'
	)
	declare name: string;

	@QRule(
		(val: number) => typeof val === 'number' && val > 0,
		'Price must be positive'
	)
	declare price: number;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: QConfig global propagation (qconfig/C)', () => {
	afterEach(() => {
		QConfig.reset();
	});

	describe('C-2: Explicit model config overrides global', () => {
		test('model with explicit unknownPropertyPolicy:keep ignores global error policy', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'error' } });

			// ExplicitKeepModel was defined with 'keep' → should not throw
			const model = new ExplicitKeepModel({
				name: 'Test',
				extra: 'allowed',
			});
			expect(model.name).toBe('Test');
		});
	});

	describe('C-4: QConfig.reset() clears without contamination', () => {
		test('after configure() → reset(), model uses factory defaults', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'error' } });
			QConfig.reset();

			// After reset, FlexibleModel should use factory defaults (strip)
			const model = new FlexibleModel({ title: 'Test', value: 42 });
			expect(model.title).toBe('Test');
			expect(model.value).toBe(42);
		});

		test('QConfig.reset() is idempotent', () => {
			QConfig.reset();
			QConfig.reset();
			const model = new FlexibleModel({ title: 'Safe', value: 1 });
			expect(model.title).toBe('Safe');
		});
	});

	describe('C-3: unknownPropertyPolicy error global affects models without explicit policy', () => {
		test('FlexibleModel throws on unknown property when global policy is error', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'error' } });
			expect(() => {
				new FlexibleModel({
					title: 'T',
					value: 1,
					unknown: 'bad',
				} as unknown as IFlexible);
			}).toThrow();
		});
	});

	describe('C-5: Model rules work independently of QConfig', () => {
		test('$qCheckRules() validates using declared @QRule regardless of config', () => {
			const valid = new ProductModel({ name: 'Widget', price: 10 });
			const { valid: isValid } = valid.$qCheckRules();
			expect(isValid).toBe(true);
		});

		test('$qCheckRules() finds errors in invalid model', () => {
			const invalid = new ProductModel({ name: '', price: -1 });
			const { valid: isValid, errors } = invalid.$qCheckRules();
			expect(isValid).toBe(false);
			expect(errors.length).toBeGreaterThan(0);
		});

		test('after QConfig.reset(), rules still work correctly', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'keep' } });
			QConfig.reset();
			const valid = new ProductModel({ name: 'Widget', price: 10 });
			const { valid: isValid } = valid.$qCheckRules();
			expect(isValid).toBe(true);
		});
	});
});

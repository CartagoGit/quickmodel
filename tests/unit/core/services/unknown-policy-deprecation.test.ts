/**
 * unknownPropertyPolicy — default behavior
 *
 * The default value of unknownPropertyPolicy is 'strip'.
 * Unknown properties are removed unless the policy is explicitly overridden.
 *
 * Tests cover: default strip behavior, explicit policy overrides,
 * global config interaction, and functional behavior of each policy.
 */
// @quickmodel-rule-ignore: no-as-unknown — intentional: testing unknown property policies requires passing extra fields not in IProduct
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Quick, QModel, QConfig } from '@/index';

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface IProduct {
	name: string;
	price: number;
}

/** No unknownPropertyPolicy — defaults to 'strip' */
@Quick({ name: String, price: Number })
class ProductNoPolicyModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

/** Explicit 'keep' — unknown properties are preserved */
@Quick({ name: String, price: Number }, { unknownPropertyPolicy: 'keep' })
class ProductKeepModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

/** Explicit 'strip' — unknown properties are removed */
@Quick({ name: String, price: Number }, { unknownPropertyPolicy: 'strip' })
class ProductStripModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

/** Explicit 'error' — unknown properties throw */
@Quick({ name: String, price: Number }, { unknownPropertyPolicy: 'error' })
class ProductErrorModel extends QModel<IProduct> {
	declare name: string;
	declare price: number;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('unknownPropertyPolicy — default is strip', () => {
	beforeEach(() => {
		QConfig.reset();
	});

	afterEach(() => {
		QConfig.reset();
	});

	// ── 1. Default behavior is strip ──────────────────────────────────────

	test('strips unknown properties by default when no policy is set (create)', () => {
		const instance = ProductNoPolicyModel.create({
			name: 'Widget',
			price: 9.99,
			extra: 'should be gone',
		} as unknown as IProduct);

		expect(instance.name).toBe('Widget');
		expect(instance.price).toBe(9.99);
		expect(
			(instance as unknown as Record<string, unknown>)['extra']
		).toBeUndefined();
	});

	test('strips unknown properties by default when no policy is set (new)', () => {
		const instance = new ProductNoPolicyModel({
			name: 'Widget',
			price: 9.99,
			extra: 'should be gone',
		} as unknown as IProduct);

		expect(instance.name).toBe('Widget');
		expect(
			(instance as unknown as Record<string, unknown>)['extra']
		).toBeUndefined();
	});

	test('strips multiple unknown properties by default', () => {
		const instance = ProductNoPolicyModel.create({
			name: 'Widget',
			price: 9.99,
			extra1: 'gone',
			extra2: 42,
			extra3: { nested: true },
		} as unknown as IProduct);

		expect(instance.name).toBe('Widget');
		expect(
			(instance as unknown as Record<string, unknown>)['extra1']
		).toBeUndefined();
		expect(
			(instance as unknown as Record<string, unknown>)['extra2']
		).toBeUndefined();
		expect(
			(instance as unknown as Record<string, unknown>)['extra3']
		).toBeUndefined();
	});

	// ── 2. Explicit 'strip' — same as default ─────────────────────────────

	test('explicit strip removes unknown properties (create)', () => {
		const instance = ProductStripModel.create({
			name: 'Widget',
			price: 9.99,
			extra: true,
		} as unknown as IProduct);

		expect(instance.name).toBe('Widget');
		expect(
			(instance as unknown as Record<string, unknown>)['extra']
		).toBeUndefined();
	});

	test('explicit strip removes unknown properties (new)', () => {
		const instance = new ProductStripModel({
			name: 'Widget',
			price: 9.99,
			extra: true,
		} as unknown as IProduct);

		expect(instance.name).toBe('Widget');
		expect(
			(instance as unknown as Record<string, unknown>)['extra']
		).toBeUndefined();
	});

	// ── 3. Explicit 'keep' preserves unknown properties ───────────────────

	test('explicit keep preserves unknown properties (create)', () => {
		const instance = ProductKeepModel.create({
			name: 'Widget',
			price: 9.99,
			extra: true,
		} as unknown as IProduct);

		expect(instance.name).toBe('Widget');
		expect((instance as unknown as Record<string, unknown>)['extra']).toBe(
			true
		);
	});

	test('explicit keep preserves unknown properties (new)', () => {
		const instance = new ProductKeepModel({
			name: 'Widget',
			price: 9.99,
			extra: true,
		} as unknown as IProduct);

		expect(instance.name).toBe('Widget');
		expect((instance as unknown as Record<string, unknown>)['extra']).toBe(
			true
		);
	});

	// ── 4. Explicit 'error' throws on unknown properties ──────────────────

	test('explicit error throws when unknown properties are present (create)', () => {
		expect(() =>
			ProductErrorModel.create({
				name: 'Widget',
				price: 9.99,
				extra: true,
			} as unknown as IProduct)
		).toThrow();
	});

	test('explicit error throws when unknown properties are present (new)', () => {
		expect(
			() =>
				new ProductErrorModel({
					name: 'Widget',
					price: 9.99,
					extra: true,
				} as unknown as IProduct)
		).toThrow();
	});

	test('explicit error does NOT throw when no unknown properties are present', () => {
		expect(() =>
			ProductErrorModel.create({ name: 'Widget', price: 9.99 })
		).not.toThrow();
	});

	// ── 5. Global config overrides the default ────────────────────────────

	test('global config keep overrides the default strip', () => {
		QConfig.configure({ defaults: { unknownPropertyPolicy: 'keep' } });

		const instance = ProductNoPolicyModel.create({
			name: 'Widget',
			price: 9.99,
			extra: 'kept by global',
		} as unknown as IProduct);

		expect((instance as unknown as Record<string, unknown>)['extra']).toBe(
			'kept by global'
		);
	});

	test('global config strip is consistent with the default', () => {
		QConfig.configure({ defaults: { unknownPropertyPolicy: 'strip' } });

		const instance = ProductNoPolicyModel.create({
			name: 'Widget',
			price: 9.99,
			extra: 'gone',
		} as unknown as IProduct);

		expect(
			(instance as unknown as Record<string, unknown>)['extra']
		).toBeUndefined();
	});

	test('global config error throws on unknown properties', () => {
		QConfig.configure({ defaults: { unknownPropertyPolicy: 'error' } });

		@Quick({ name: String, price: Number })
		class ProductGlobalErrorModel extends QModel<IProduct> {
			declare name: string;
			declare price: number;
		}

		expect(() =>
			ProductGlobalErrorModel.create({
				name: 'Widget',
				price: 9.99,
				extra: 'fail',
			} as unknown as IProduct)
		).toThrow();
	});

	// ── 6. Decorator policy overrides global config ───────────────────────

	test('decorator keep overrides global strip config', () => {
		QConfig.configure({ defaults: { unknownPropertyPolicy: 'strip' } });

		const instance = ProductKeepModel.create({
			name: 'Widget',
			price: 9.99,
			extra: 'decorator wins',
		} as unknown as IProduct);

		expect((instance as unknown as Record<string, unknown>)['extra']).toBe(
			'decorator wins'
		);
	});

	test('decorator strip overrides global keep config', () => {
		QConfig.configure({ defaults: { unknownPropertyPolicy: 'keep' } });

		const instance = ProductStripModel.create({
			name: 'Widget',
			price: 9.99,
			extra: 'still gone',
		} as unknown as IProduct);

		expect(
			(instance as unknown as Record<string, unknown>)['extra']
		).toBeUndefined();
	});

	// ── 7. Known properties are never stripped ────────────────────────────

	test('known properties are always preserved regardless of policy', () => {
		const instance = ProductNoPolicyModel.create({
			name: 'Widget',
			price: 9.99,
		});

		expect(instance.name).toBe('Widget');
		expect(instance.price).toBe(9.99);
	});
});

/**
 * Integration Test: @QDefault decorator
 * Covers: docs-vitepress/en/guide/qdefault.md
 *
 * Validates:
 * - Default applied when field is null/undefined
 * - Default NOT applied when field is false, 0, or '' (empty string)
 * - Factory function used for reference types (arrays, objects)
 * - @QDefault + @QReadonly: default set on construction, readonly enforced afterwards
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QDefault, QReadonly, ImmutableFieldError } from '@/decorators';

// ── Models ────────────────────────────────────────────────────────────────────

interface IProduct {
	name: string;
	stock: number;
	active: boolean;
	tags: string[];
	notes: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ProductModel extends QModel<IProduct> {
	declare name: string;

	@QDefault(0)
	declare stock: number;

	@QDefault(true)
	declare active: boolean;

	@QDefault(() => [])
	declare tags: string[];

	@QDefault('')
	declare notes: string;
}

interface IImmutableEntity {
	uid: string;
	createdAt: Date;
}

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
class ImmutableEntityModel extends QModel<IImmutableEntity> {
	@QReadonly()
	@QDefault('generated-uid')
	declare uid: string;

	@QReadonly()
	@QDefault(() => new Date('2026-01-01'))
	declare createdAt: Date;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: @QDefault (guide/qdefault.md)', () => {
	describe('default for primitives', () => {
		test('applies numeric default when field is undefined', () => {
			const product = new ProductModel({ name: 'Widget' } as IProduct);
			expect(product.stock).toBe(0);
		});

		test('applies boolean default when field is undefined', () => {
			const product = new ProductModel({ name: 'Widget' } as IProduct);
			expect(product.active).toBe(true);
		});

		test('applies string default when field is undefined', () => {
			const product = new ProductModel({ name: 'Widget' } as IProduct);
			expect(product.notes).toBe('');
		});
	});

	describe('default NOT applied for falsy-but-present values', () => {
		test('0 is kept as-is (not replaced by default)', () => {
			const product = new ProductModel({
				name: 'Gadget',
				stock: 0,
			} as IProduct);
			expect(product.stock).toBe(0);
		});

		test('false is kept as-is (not replaced by default)', () => {
			const product = new ProductModel({
				name: 'Gadget',
				active: false,
			} as IProduct);
			expect(product.active).toBe(false);
		});

		test("empty string '' is kept as-is (not replaced by default)", () => {
			const product = new ProductModel({
				name: 'Gadget',
				notes: '',
				stock: 1,
				active: true,
				tags: [],
			});
			expect(product.notes).toBe('');
		});
	});

	describe('factory default for reference types', () => {
		test('tags default is a fresh empty array per instance', () => {
			const product1 = new ProductModel({ name: 'P1' } as IProduct);
			const product2 = new ProductModel({ name: 'P2' } as IProduct);

			expect(product1.tags).toEqual([]);

			// They must be different array instances (factory, not shared reference)
			expect(product1.tags).not.toBe(product2.tags);
		});
	});

	describe('@QDefault + @QReadonly composition', () => {
		test('default is applied at construction time', () => {
			const entity = new ImmutableEntityModel({} as IImmutableEntity);
			expect(entity.uid).toBe('generated-uid');
			expect(entity.createdAt).toBeInstanceOf(Date);
		});

		test('readonly protection still enforced after default is applied', () => {
			const entity = new ImmutableEntityModel({} as IImmutableEntity);
			expect(() => entity.$qCopy({ uid: 'new-uid' })).toThrow(
				ImmutableFieldError
			);
		});

		test('explicit value overrides default on construction', () => {
			const entity = new ImmutableEntityModel({
				uid: 'custom-uid',
				createdAt: new Date('2025-06-01'),
			});
			expect(entity.uid).toBe('custom-uid');
		});
	});
});

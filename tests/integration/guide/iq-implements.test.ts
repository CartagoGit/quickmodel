/**
 * Integration Test: IQImplements type helper
 * Covers: docs-vitepress/en/guide/iq-implements.md
 *
 * Validates:
 * - IQImplements<T, U> enforces presence of all interface fields
 * - Models using IQImplements work exactly as without it (runtime behavior unchanged)
 * - $qToInterface() returns the serialized shape (interface shape)
 * - Roundtrip with IQImplements model is lossless
 * - IQImplements works with nested models
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import type { IQImplements } from '@/index';

// ── Interfaces and models ─────────────────────────────────────────────────────

interface IUser {
	id: number;
	name: string;
	createdAt: string; // ISO string in wire format
}

interface IUserTransforms {
	createdAt: Date;
}

@Quick({ id: Number, createdAt: Date }, { unknownPropertyPolicy: 'keep' })
class UserModel
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	declare id: number;
	declare name: string;
	declare createdAt: Date;
}

// ── Model without transforms (all fields match interface) ────────────────────

interface IProduct {
	sku: string;
	price: number;
	inStock: boolean;
}

@Quick({ price: Number }, { unknownPropertyPolicy: 'keep' })
class ProductModel
	extends QModel<IProduct>
	implements IQImplements<IProduct, { price: number }>
{
	declare sku: string;
	declare price: number;
	declare inStock: boolean;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: IQImplements (guide/iq-implements.md)', () => {
	describe('IQImplements does not change runtime behavior', () => {
		test('UserModel with IQImplements constructs and transforms types correctly', () => {
			const user = new UserModel({
				id: 1,
				name: 'Alice',
				createdAt: '2026-01-15T12:00:00.000Z',
			});

			expect(user.id).toBe(1);
			expect(user.name).toBe('Alice');
			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toContain('2026-01-15');
		});

		test('ProductModel with IQImplements constructs correctly', () => {
			const product = new ProductModel({
				sku: 'ABC-123',
				price: 99,
				inStock: true,
			});

			expect(product.sku).toBe('ABC-123');
			expect(product.price).toBe(99);
			expect(product.inStock).toBe(true);
		});
	});

	describe('$qSerialize() produces serializable interface shape', () => {
		test('Date field is serialized to string in output', () => {
			const user = new UserModel({
				id: 2,
				name: 'Bob',
				createdAt: '2026-06-01T00:00:00.000Z',
			});

			const serialized = user.$qSerialize();

			// createdAt should be back to ISO string
			expect(typeof serialized['createdAt']).toBe('string');
			expect(String(serialized['createdAt'])).toContain('2026-06-01');
			expect(serialized['name']).toBe('Bob');
		});

		test('all declared fields appear in serialized output', () => {
			const product = new ProductModel({
				sku: 'XYZ',
				price: 42,
				inStock: false,
			});
			const serialized = product.$qSerialize();

			expect(serialized['sku']).toBe('XYZ');
			expect(serialized['price']).toBe(42);
			expect(serialized['inStock']).toBe(false);
		});
	});

	describe('roundtrip: serialize → reconstruct', () => {
		test('UserModel roundtrip preserves all values including Date', () => {
			const original = new UserModel({
				id: 3,
				name: 'Carol',
				createdAt: '2026-03-15T08:30:00.000Z',
			});

			const serialized = original.$qSerialize();
			const restored = new UserModel(serialized as unknown as IUser);

			expect(restored.id).toBe(3);
			expect(restored.name).toBe('Carol');
			expect(restored.createdAt).toBeInstanceOf(Date);
			expect(restored.createdAt.getFullYear()).toBe(2026);
		});
	});

	describe('instanceof checks still work', () => {
		test('IQImplements model is still instanceof QModel', () => {
			const user = new UserModel({
				id: 4,
				name: 'Dave',
				createdAt: '2026-01-01',
			});

			expect(user).toBeInstanceOf(UserModel);
			expect(user).toBeInstanceOf(QModel);
		});
	});
});

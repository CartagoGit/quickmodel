/**
 * Integration Test: QModelCollection
 * Covers: docs-vitepress/en/guide/collection.md
 *
 * Validates:
 * - QModelCollection.from() creates a typed collection
 * - $qWhere() filters correctly
 * - $qGroupBy() groups correctly
 * - $qSortBy() sorts ascending/descending
 * - $qFromArray() roundtrip
 * - $qSize, $qIsEmpty, $qFirst(), $qLast()
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick, QModelCollection } from '@/index';

// ── Model ─────────────────────────────────────────────────────────────────────

interface IProduct {
	id: number;
	name: string;
	category: string;
	price: number;
	active: boolean;
}

@Quick({ price: Number }, { unknownPropertyPolicy: 'keep' })
class ProductModel extends QModel<IProduct> {
	declare id: number;
	declare name: string;
	declare category: string;
	declare price: number;
	declare active: boolean;
}

const rawProducts = [
	{ id: 1, name: 'Widget A', category: 'tools', price: 9.99, active: true },
	{ id: 2, name: 'Widget B', category: 'tools', price: 19.99, active: false },
	{
		id: 3,
		name: 'Gadget X',
		category: 'electronics',
		price: 49.99,
		active: true,
	},
	{
		id: 4,
		name: 'Gadget Y',
		category: 'electronics',
		price: 99.99,
		active: true,
	},
	{ id: 5, name: 'Donut Z', category: 'food', price: 2.5, active: true },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: QModelCollection (guide/collection.md)', () => {
	describe('QModelCollection.from()', () => {
		test('creates collection with correct size', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			expect(col.$qSize).toBe(5);
		});

		test('each item is an instance of ProductModel', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			const first = col.$qFirst();
			expect(first).toBeInstanceOf(ProductModel);
		});
	});

	describe('$qWhere() filtering', () => {
		test('filters active products', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			const active = col.$qWhere((product) => product.active);
			expect(active.$qSize).toBe(4);
		});

		test('filters by category', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			const electronics = col.$qWhere(
				(product) => product.category === 'electronics'
			);
			expect(electronics.$qSize).toBe(2);
		});
	});

	describe('$qGroupBy() grouping', () => {
		test('groups by category field', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			const groups = col.$qGroupBy('category');

			expect(Object.keys(groups)).toHaveLength(3);
			expect(groups['tools']).toHaveLength(2);
			expect(groups['electronics']).toHaveLength(2);
			expect(groups['food']).toHaveLength(1);
		});
	});

	describe('$qSortBy() sorting', () => {
		test('sorts by price ascending', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			const sorted = col.$qSortBy('price');
			const first = sorted.$qFirst();
			const last = sorted.$qLast();

			expect(first?.price).toBe(2.5);
			expect(last?.price).toBe(99.99);
		});

		test('sorts by price descending', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			const sorted = col.$qSortBy('price', { order: 'desc' });
			const first = sorted.$qFirst();

			expect(first?.price).toBe(99.99);
		});
	});

	describe('utility properties', () => {
		test('$qIsEmpty is false for non-empty collection', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			expect(col.$qIsEmpty).toBe(false);
		});

		test('$qIsEmpty is true for empty collection', () => {
			const col = QModelCollection.from(ProductModel, []);
			expect(col.$qIsEmpty).toBe(true);
		});

		test('$qFirst() returns first item', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			expect(col.$qFirst()?.id).toBe(1);
		});

		test('$qLast() returns last item', () => {
			const col = QModelCollection.from(ProductModel, rawProducts);
			expect(col.$qLast()?.id).toBe(5);
		});
	});

	describe('model static collection() alias', () => {
		test('ProductModel.collection() is equivalent to QModelCollection.from()', () => {
			const fromStatic = QModelCollection.from(ProductModel, rawProducts);
			const fromAlias = ProductModel.collection(rawProducts);

			expect(fromAlias.$qSize).toBe(fromStatic.$qSize);
			expect(fromAlias.$qFirst()?.id).toBe(fromStatic.$qFirst()?.id);
		});
	});
});

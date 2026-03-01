/**
 * TDD Tests: QModelCollection — functional utility methods
 *
 * Covers: map(), reduce(), every(), some(), count(), first(), last(),
 * isEmpty, unique(), toMap(), sum(), min(), max(), flatMap()
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QModelCollection } from '@/core/models/quick-collection.model';

// ─── Test models ────────────────────────────────────────────────────────────

interface IProduct {
	id: number;
	name: string;
	category: string;
	price: number;
	stock: number;
	active: boolean;
}

@Quick()
class ProductModel extends QModel<IProduct> {
	declare id: number;
	declare name: string;
	declare category: string;
	declare price: number;
	declare stock: number;
	declare active: boolean;
}

const PRODUCTS = [
	{
		id: 1,
		name: 'Apple',
		category: 'fruit',
		price: 1.5,
		stock: 100,
		active: true,
	},
	{
		id: 2,
		name: 'Banana',
		category: 'fruit',
		price: 0.5,
		stock: 200,
		active: true,
	},
	{
		id: 3,
		name: 'Carrot',
		category: 'vegetable',
		price: 0.8,
		stock: 50,
		active: false,
	},
	{
		id: 4,
		name: 'Daikon',
		category: 'vegetable',
		price: 1.2,
		stock: 30,
		active: true,
	},
	{
		id: 5,
		name: 'Elderberry',
		category: 'fruit',
		price: 3.0,
		stock: 10,
		active: true,
	},
];

// ─── map() ──────────────────────────────────────────────────────────────────

describe('QModelCollection — map()', () => {
	it('map() transforms each item and returns a plain array', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const names = col.map((prod) => prod.name);
		expect(names).toEqual([
			'Apple',
			'Banana',
			'Carrot',
			'Daikon',
			'Elderberry',
		]);
	});

	it('map() on empty collection returns empty array', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.map((prod) => prod.id)).toEqual([]);
	});

	it('map() can extract numeric values', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const prices = col.map((prod) => prod.price);
		expect(prices).toHaveLength(5);
		expect(prices[0]).toBe(1.5);
	});
});

// ─── reduce() ───────────────────────────────────────────────────────────────

describe('QModelCollection — reduce()', () => {
	it('reduce() aggregates values with initial accumulator', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const total = col.reduce((acc, prod) => acc + prod.price, 0);
		expect(total).toBeCloseTo(7.0, 2);
	});

	it('reduce() can build an object accumulator', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const byId = col.reduce<Record<number, string>>(
			(acc, prod) => ({ ...acc, [prod.id]: prod.name }),
			{}
		);
		expect(byId[1]).toBe('Apple');
		expect(byId[5]).toBe('Elderberry');
	});
});

// ─── every() + some() ───────────────────────────────────────────────────────

describe('QModelCollection — every() and some()', () => {
	it('every() returns true when all items satisfy predicate', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.every((prod) => prod.price > 0)).toBe(true);
	});

	it('every() returns false when at least one item fails', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.every((prod) => prod.active)).toBe(false);
	});

	it('every() returns true for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.every(() => false)).toBe(true);
	});

	it('some() returns true when at least one item satisfies predicate', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.some((prod) => prod.price > 2)).toBe(true);
	});

	it('some() returns false when no item satisfies predicate', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.some((prod) => prod.price > 100)).toBe(false);
	});

	it('some() returns false for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.some(() => true)).toBe(false);
	});
});

// ─── count() ────────────────────────────────────────────────────────────────

describe('QModelCollection — count()', () => {
	it('count() without predicate returns collection size', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.count()).toBe(5);
	});

	it('count() with predicate counts matching items', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.count((prod) => prod.active)).toBe(4);
	});

	it('count() with predicate that matches none returns 0', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.count((prod) => prod.price > 100)).toBe(0);
	});
});

// ─── first() + last() ───────────────────────────────────────────────────────

describe('QModelCollection — first() and last()', () => {
	it('first() returns the first instance', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.first()?.name).toBe('Apple');
	});

	it('first() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.first()).toBeUndefined();
	});

	it('last() returns the last instance', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.last()?.name).toBe('Elderberry');
	});

	it('last() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.last()).toBeUndefined();
	});
});

// ─── isEmpty ────────────────────────────────────────────────────────────────

describe('QModelCollection — isEmpty', () => {
	it('isEmpty is true for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.isEmpty).toBe(true);
	});

	it('isEmpty is false for non-empty collection', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.isEmpty).toBe(false);
	});
});

// ─── unique() ───────────────────────────────────────────────────────────────

describe('QModelCollection — unique()', () => {
	it('unique() by field returns collection without duplicates', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const uniq = col.unique('category');
		// Only 2 unique categories: fruit, vegetable
		expect(uniq.size).toBe(2);
	});

	it('unique() preserves first occurrence', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const uniq = col.unique('category');
		const names = uniq.map((prod) => prod.name);
		// First fruit = Apple, first vegetable = Carrot
		expect(names).toContain('Apple');
		expect(names).toContain('Carrot');
	});

	it('unique() with all distinct field preserves all items', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.unique('id').size).toBe(5);
	});

	it('unique() on empty collection returns empty', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.unique('id').size).toBe(0);
	});
});

// ─── toMap() ────────────────────────────────────────────────────────────────

describe('QModelCollection — toMap()', () => {
	it('toMap() indexes items by a field value', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const byId = col.toMap('id');
		expect(byId.size).toBe(5);
		expect(byId.get(1)?.name).toBe('Apple');
		expect(byId.get(3)?.name).toBe('Carrot');
	});

	it('toMap() on empty collection returns empty Map', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.toMap('id').size).toBe(0);
	});

	it('toMap() with duplicate keys keeps last occurrence', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const byCat = col.toMap('category');
		// 3 fruits → last fruit = Elderberry; 2 vegetables → last veg = Daikon
		expect(byCat.get('fruit')?.name).toBe('Elderberry');
		expect(byCat.get('vegetable')?.name).toBe('Daikon');
	});
});

// ─── sum() ──────────────────────────────────────────────────────────────────

describe('QModelCollection — sum()', () => {
	it('sum() returns the sum of a numeric field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const total = col.sum('price');
		expect(total).toBeCloseTo(7.0, 2);
	});

	it('sum() on empty collection returns 0', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.sum('price')).toBe(0);
	});

	it('sum() by stock field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.sum('stock')).toBe(390);
	});
});

// ─── min() + max() ──────────────────────────────────────────────────────────

describe('QModelCollection — min() and max()', () => {
	it('min() returns item with the lowest value of field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.min('price')?.name).toBe('Banana');
	});

	it('min() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.min('price')).toBeUndefined();
	});

	it('max() returns item with the highest value of field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.max('price')?.name).toBe('Elderberry');
	});

	it('max() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.max('price')).toBeUndefined();
	});

	it('max() by stock returns item with most stock', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.max('stock')?.name).toBe('Banana');
	});
});

// ─── flatMap() ──────────────────────────────────────────────────────────────

describe('QModelCollection — flatMap()', () => {
	it('flatMap() maps and flattens one level', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		// Generate two tag strings per product
		const tags = col.flatMap((prod) => [
			prod.category,
			`${prod.category}-alt`,
		]);
		expect(tags).toHaveLength(10);
		expect(tags[0]).toBe('fruit');
		expect(tags[1]).toBe('fruit-alt');
	});

	it('flatMap() on empty collection returns empty array', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.flatMap((prod) => [prod.name])).toEqual([]);
	});
});

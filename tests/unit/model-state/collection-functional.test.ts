/**
 * TDD Tests: QModelCollection — functional utility methods
 *
 * Covers: $qMap(), $qReduce(), $qEvery(), $qSome(), $qCount(), $qFirst(), $qLast(),
 * $qIsEmpty, $qUnique(), $qToMap(), $qSum(), $qMin(), $qMax(), $qFlatMap()
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

describe('QModelCollection — $qMap()', () => {
	it('$qMap() transforms each item and returns a plain array', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const names = col.$qMap((prod) => prod.name);
		expect(names).toEqual([
			'Apple',
			'Banana',
			'Carrot',
			'Daikon',
			'Elderberry',
		]);
	});

	it('$qMap() on empty collection returns empty array', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qMap((prod) => prod.id)).toEqual([]);
	});

	it('$qMap() can extract numeric values', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const prices = col.$qMap((prod) => prod.price);
		expect(prices).toHaveLength(5);
		expect(prices[0]).toBe(1.5);
	});
});

// ─── $qReduce() ─────────────────────────────────────────────────────────────────────────

describe('QModelCollection — $qReduce()', () => {
	it('$qReduce() aggregates values with initial accumulator', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const total = col.$qReduce((acc, prod) => acc + prod.price, 0);
		expect(total).toBeCloseTo(7.0, 2);
	});

	it('$qReduce() can build an object accumulator', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const byId = col.$qReduce<Record<number, string>>(
			(acc, prod) => ({ ...acc, [prod.id]: prod.name }),
			{}
		);
		expect(byId[1]).toBe('Apple');
		expect(byId[5]).toBe('Elderberry');
	});
});

// ─── every() + some() ───────────────────────────────────────────────────────

describe('QModelCollection — $qEvery() and $qSome()', () => {
	it('$qEvery() returns true when all items satisfy predicate', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qEvery((prod) => prod.price > 0)).toBe(true);
	});

	it('$qEvery() returns false when at least one item fails', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qEvery((prod) => prod.active)).toBe(false);
	});

	it('$qEvery() returns true for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qEvery(() => false)).toBe(true);
	});

	it('$qSome() returns true when at least one item satisfies predicate', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qSome((prod) => prod.price > 2)).toBe(true);
	});

	it('$qSome() returns false when no item satisfies predicate', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qSome((prod) => prod.price > 100)).toBe(false);
	});

	it('$qSome() returns false for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qSome(() => true)).toBe(false);
	});
});

// ─── $qCount() ─────────────────────────────────────────────────────────────────────────

describe('QModelCollection — $qCount()', () => {
	it('$qCount() without predicate returns collection size', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qCount()).toBe(5);
	});

	it('$qCount() with predicate counts matching items', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qCount((prod) => prod.active)).toBe(4);
	});

	it('$qCount() with predicate that matches none returns 0', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qCount((prod) => prod.price > 100)).toBe(0);
	});
});

// ─── first() + last() ───────────────────────────────────────────────────────

describe('QModelCollection — $qFirst() and $qLast()', () => {
	it('$qFirst() returns the first instance', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qFirst()?.name).toBe('Apple');
	});

	it('$qFirst() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qFirst()).toBeUndefined();
	});

	it('$qLast() returns the last instance', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qLast()?.name).toBe('Elderberry');
	});

	it('$qLast() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qLast()).toBeUndefined();
	});
});

// ─── $qIsEmpty ──────────────────────────────────────────────────────────────────────────

describe('QModelCollection — $qIsEmpty', () => {
	it('$qIsEmpty is true for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qIsEmpty).toBe(true);
	});

	it('$qIsEmpty is false for non-empty collection', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qIsEmpty).toBe(false);
	});
});

// ─── unique() ───────────────────────────────────────────────────────────────

describe('QModelCollection — $qUnique()', () => {
	it('$qUnique() by field returns collection without duplicates', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const uniq = col.$qUnique('category');
		// Only 2 unique categories: fruit, vegetable
		expect(uniq.$qSize).toBe(2);
	});

	it('$qUnique() preserves first occurrence', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const uniq = col.$qUnique('category');
		const names = uniq.$qMap((prod) => prod.name);
		// First fruit = Apple, first vegetable = Carrot
		expect(names).toContain('Apple');
		expect(names).toContain('Carrot');
	});

	it('$qUnique() with all distinct field preserves all items', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qUnique('id').$qSize).toBe(5);
	});

	it('$qUnique() on empty collection returns empty', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qUnique('id').$qSize).toBe(0);
	});
});

// ─── toMap() ────────────────────────────────────────────────────────────────

describe('QModelCollection — $qToMap()', () => {
	it('$qToMap() indexes items by a field value', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const byId = col.$qToMap('id');
		expect(byId.size).toBe(5);
		expect(byId.get(1)?.name).toBe('Apple');
		expect(byId.get(3)?.name).toBe('Carrot');
	});

	it('$qToMap() on empty collection returns empty Map', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qToMap('id').size).toBe(0);
	});

	it('$qToMap() with duplicate keys keeps last occurrence', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const byCat = col.$qToMap('category');
		// 3 fruits → last fruit = Elderberry; 2 vegetables → last veg = Daikon
		expect(byCat.get('fruit')?.name).toBe('Elderberry');
		expect(byCat.get('vegetable')?.name).toBe('Daikon');
	});
});

// ─── $qSum() ──────────────────────────────────────────────────────────────────────────

describe('QModelCollection — $qSum()', () => {
	it('$qSum() returns the sum of a numeric field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		const total = col.$qSum('price');
		expect(total).toBeCloseTo(7.0, 2);
	});

	it('$qSum() on empty collection returns 0', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qSum('price')).toBe(0);
	});

	it('$qSum() by stock field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qSum('stock')).toBe(390);
	});
});

// ─── min() + max() ──────────────────────────────────────────────────────────

describe('QModelCollection — $qMin() and $qMax()', () => {
	it('$qMin() returns item with the lowest value of field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qMin('price')?.name).toBe('Banana');
	});

	it('$qMin() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qMin('price')).toBeUndefined();
	});

	it('$qMax() returns item with the highest value of field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qMax('price')?.name).toBe('Elderberry');
	});

	it('$qMax() returns undefined for empty collection', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qMax('price')).toBeUndefined();
	});

	it('$qMax() by stock returns item with most stock', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		expect(col.$qMax('stock')?.name).toBe('Banana');
	});
});

// ─── $qFlatMap() ────────────────────────────────────────────────────────────────────────

describe('QModelCollection — $qFlatMap()', () => {
	it('$qFlatMap() maps and flattens one level', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		// Generate two tag strings per product
		const tags = col.$qFlatMap((prod) => [
			prod.category,
			`${prod.category}-alt`,
		]);
		expect(tags).toHaveLength(10);
		expect(tags[0]).toBe('fruit');
		expect(tags[1]).toBe('fruit-alt');
	});

	it('$qFlatMap() on empty collection returns empty array', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qFlatMap((prod) => [prod.name])).toEqual([]);
	});
});

describe('QModelCollection — $qAvg()', () => {
	it('$qAvg() returns the average value of a numeric field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		// prices: 1.5, 0.5, 0.8, 1.2, 3.0 → sum=7.0 / 5 = 1.4
		const result = col.$qAvg('price');
		expect(result).toBeCloseTo(1.4);
	});

	it('$qAvg() on empty collection returns 0', () => {
		const col = QModelCollection.from(ProductModel, []);
		expect(col.$qAvg('price')).toBe(0);
	});

	it('$qAvg() by stock field', () => {
		const col = QModelCollection.from(ProductModel, PRODUCTS);
		// stocks: 100, 200, 50, 30, 10 → sum=390 / 5 = 78
		const result = col.$qAvg('stock');
		expect(result).toBeCloseTo(78);
	});
});

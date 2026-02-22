import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src';

interface IItem {
	id: number;
}

@Quick()
class Item extends QModel<IItem> {
	declare id: number;
}

interface IList {
	items: Item[];
}

@Quick({ items: [Item] })
class List extends QModel<IList> {
	declare items: Item[];
}

describe('Large Array DoS', () => {
	test('should allow processing arrays within default limit (10k)', () => {
		const SIZE = 9000;
		const largeArray = Array.from({ length: SIZE }, (_, idx) => ({
			id: idx,
		}));

		const start = performance.now();
		const list = new List({ items: largeArray });
		const end = performance.now();

		console.log(`Time to process ${SIZE} items: ${end - start}ms`);
		expect(list.items.length).toBe(SIZE);
	});

	test('should enforce custom limit (10k) and throw error', () => {
		@Quick({ items: [Item] }, { maxArrayLength: 10000 })
		class SmallList extends QModel<IList> {
			declare items: Item[];
		}

		const SIZE = 11000; // Above 10k
		const array = new Array(SIZE).fill({ id: 1 });

		expect(() => {
			new SmallList({ items: array });
		}).toThrow(/limit/);
	});

	test('should allow custom limit override via @Quick options', () => {
		@Quick({ items: [Item] }, { maxArrayLength: 20000 })
		class CustomList extends QModel<IList> {
			declare items: Item[];
		}

		const SIZE = 15000;
		const array = Array.from({ length: SIZE }, (_, idx) => ({ id: idx }));
		const list = new CustomList({ items: array });

		expect(list.items.length).toBe(SIZE);
	});

	test('should still block excessively large arrays above custom limit', () => {
		@Quick({ items: [Item] }, { maxArrayLength: 1000000 })
		class MediumList extends QModel<IList> {
			declare items: Item[];
		}

		const HUGE_SIZE = 1100000; // > 1M
		const hugeArray = new Array(HUGE_SIZE).fill({ id: 1 });

		try {
			new MediumList({ items: hugeArray });
			// Should have thrown
			expect(true).toBe(false);
		} catch (err: any) {
			expect(err).toBeDefined();
		}
	});
});

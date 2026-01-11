import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Heterogeneous Arrays', () => {
	interface IMixed {
		items: (string | number | Date | boolean | null)[];
	}

	// We can't really specify a single type transformer for a mixed array
	// using the simple [Type] syntax if the types are primitives mixed with objects.
	// However, we might expect QuickModel to handle them gracefully (pass through primitives, transform objects if identified).

	// Strategy: We might need a "Union" transformer or just rely on passing unknown types?

	@Quick({
		// Current syntax doesn't support [String | Number | Date]
		// But let's see what happens if we don't define it (inferred as generalized array)
		// OR if we try to define it.
	})
	class MixedModel extends QModel<IMixed> {
		declare items: (string | number | Date | boolean | null)[];
	}

	test('should preserve primitives in mixed arrays without explicit config', () => {
		const data = {
			items: ['text', 123, true, null],
		};
		const model = new MixedModel(data);

		expect(model.items).toHaveLength(4);
		expect(model.items[0]).toBe('text');
		expect(model.items[1]).toBe(123);
		expect(model.items[2]).toBe(true);
		expect(model.items[3]).toBeNull();
	});

	test('should transform recognized types in mixed arrays IF we could configure it?', () => {
		// If we want Dates to be transformed in a mixed array, we need a way to tell QuickModel.
		// Currently, [Date] implies ALL elements are Dates (or null).

		// Let's retry with a custom transformer or see if we can identify Dates dynamically?
		// QModel doesn't auto-detect strings as Dates without configuration.

		const data = {
			items: ['text', '2024-01-01T00:00:00.000Z'],
		};
		const model = new MixedModel(data);

		// Default behavior: No transformation for the date string because 'items' has no specific transformer
		expect(typeof model.items[1]).toBe('string');
	});
});

import { describe, it, expect } from 'bun:test';
import { ToInterfaceService } from '../../../src/core/services/to-interface.service';
import { QModel } from '../../../src/core/models/quick.model';
import { Quick } from '../../../src/core/decorators/quick.decorator';

describe('ToInterfaceService Coverage Gaps - Deep Dive', () => {
	// Helper access to private method
	const service = new ToInterfaceService();
	const convert = (current: any, original: any) => {
		return (service as any).convertToInterfaceFormat(current, original, {
			seen: new WeakSet(),
			isProduction: false,
			propertyKey: 'testProp',
			depth: 0,
		});
	};

	// Scenario 1: Date Fallbacks (Lines 250-254)
	it('should handle Date fallback when current value became a string', () => {
		// Original was Date (simulated as ISO string input), Current is string
		// If correct path taken, line 250 check 'typeof currentValue === string' should return it
		const original = '2024-01-01T00:00:00.000Z';
		const current = 'some-string-value';

		// We need to trick logic to think it's a Date flow.
		// Logic checks: originalValue instanceof Date? -> False.
		// typeof originalValue === 'string' && !isNaN(Date.parse(originalValue)) -> True (ISO string)

		// Wait, looking at code around 220:
		// if (isValidDateString(originalValue) || typeof originalValue === 'number') ...
		//   if (currentValue instanceof Date) ...
		//   else ... (This is where toISOString/fallback is)

		const result = convert(current, original);
		expect(result).toBe(current);
	});

	// Scenario 2: RegExp Identity (Lines 263-264)
	it('should return current RegExp if original was RegExp and current is RegExp', () => {
		const original = /test/;
		const current = /updated/;
		const result = convert(current, original);
		expect(result).toBe(current); // Should return the NEW regex instance
	});

	// Scenario 3: Custom Constructor with toInterface (Lines 437-453)
	it('should call toInterface on objects with custom constructor (Nested QModels)', () => {
		interface IChild {
			name: string;
		}
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Child extends QModel<IChild> {
			declare name: string;
		}

		const child = new Child({ name: 'original' });
		// The service checks if originalValue.constructor !== Object
		const result = convert(child, child);

		expect(result).toEqual({ name: 'original' });
	});

	// Scenario 4: Init with NULL, assign QModel (Lines 462-473)
	it('should call toInterface when original was null but current is QModel', () => {
		interface IChild {
			name: string;
		}
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Child extends QModel<IChild> {
			declare name: string;
		}

		const original = null;
		const current = new Child({ name: 'new-value' });

		const result = convert(current, original);
		expect(result).toEqual({ name: 'new-value' });
	});

	// Scenario 5: Array of mixed types (Lines 311, 349 mentioned in gaps)
	it('should handle arrays with nulls correctly', () => {
		const original = [null, 'b'];
		const current = ['a', 'b'];
		// convertToInterfaceFormat treats arrays in line ~284 checks Array.isArray
		// Maybe we need specific null handling inside array loop

		const result = convert(current, original);
		expect(result).toEqual(['a', 'b']);
	});
});

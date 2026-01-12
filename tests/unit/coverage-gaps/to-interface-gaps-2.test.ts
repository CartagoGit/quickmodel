import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
// import { ToInterfaceService } from '@/core/services/to-interface.service';

describe('ToInterfaceService Additional Gaps', () => {
	it('should throw error on circular reference when recursion is active (dev mode)', () => {
		@Quick()
		class Node extends QModel<any> {
			declare self: Node;
		}

		// Create a node with 'self' initialized so recursion happens
		// We pass 'null' initially to match key presence
		const node = new Node({ self: null });

		// Create circularity
		// We need to bypass strict checking if any, but let's just assign
		node.self = node;

		// This should throw because current=node (seen), self=node.
		// node is in seen (root).
		// visiting 'self'. originalValue is null (defined).
		// Recursion continues.
		// convertToInterfaceFormat called with node.
		// node is in seen -> THROW.
		expect(() => node.toInterface()).toThrow();
	});

	it('should handle invalid Date objects by returning string representation', () => {
		@Quick({ date: Date })
		class DateModel extends QModel<any> {
			declare date: Date;
		}

		const model = new DateModel({ date: '2024-01-01T00:00:00.000Z' });

		// Force invalid date into the model (bypassing TS/validation)
		const invalidDate = new Date('invalid');
		// We need to make sure toInterface sees this
		model.date = invalidDate;

		// When toInterface runs:
		// originalValue is '2024-01-01T00:00:00.000Z' (string matching regex)
		// currentValue is invalidDate (Date object)
		// invalidDate.toISOString() throws.
		// Catch block: returns originalValue ('2024-01-01T00:00:00.000Z')

		const result = model.toInterface();
		expect(result.date).toBe('2024-01-01T00:00:00.000Z');
	});

	it('should handle invalid Date objects without original value', () => {
		@Quick({ date: Date })
		class DateModel extends QModel<any> {
			declare date: Date;
		}

		// No initial value for date
		const model = new DateModel({});

		const invalidDate = new Date('invalid');
		model.date = invalidDate;

		// Here originalValue is undefined -> it returns currentValue (Invalid Date object)
		// So we can't test the catch block with this strategy because of the early return.

		// To hit the catch block, originalValue must be defined.
		// Strategy: initialize with something, then update to invalid date.
		const model2 = new DateModel({ date: '2020-01-01T00:00:00.000Z' });
		model2.date = invalidDate;

		// originalValue='2020-01-01'.
		// result should be '2020-01-01'.
		expect(model2.toInterface().date).toBe('2020-01-01T00:00:00.000Z');
	});

	it('should fallback to String(current) if originalValue is not string in catch block', () => {
		@Quick({ date: Date })
		class DateModel extends QModel<any> {
			declare date: Date;
		}

		// properties not in explicit list but with originalValue
		// We need originalValue to be something else than string, e.g. null?
		// But check lines:
		// if (originalValue instanceof Date || (typeof string ...))

		const model = new DateModel({ date: new Date('2020-01-01') });
		// originalValue is Date object (valid)

		const invalidDate = new Date('invalid');
		model.date = invalidDate;

		// toInterface logic:
		// originalValue is Date. enter if block.
		// currentValue is Invalid Date. toISOString throws.
		// Catch: typeof originalValue === 'string' ? ... : String(currentValue)
		// originalValue is Date (object), so returns String(currentValue) -> "Invalid Date"

		const result = model.toInterface();
		expect(result.date).toBe('Invalid Date');
	});
});

import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Defense in Depth: toInterface Inheritance', () => {
	interface IWrapper {
		payload: any;
	}

	@Quick({ payload: Object })
	class Wrapper extends QModel<IWrapper> {
		declare payload: any;
	}

	test('should NOT include inherited properties in toInterface output', () => {
		// Create a prototype with an enumerable property
		const proto = { inherited: 'I am legacy' };
		const obj = Object.create(proto);
		obj.own = 'I am own';

		// Verify standard JSON behavior
		expect(JSON.parse(JSON.stringify(obj))).toEqual({ own: 'I am own' });

		// Now test QModel behavior
		const model = new Wrapper({ payload: obj });
		const output = model.$qToInterface();
		const result = output.payload;

		// Current behavior check:
		// If it includes inherited, this expectation will fail (or pass if I expect it)
		// Ideally it should be undefined.
		expect(result.own).toBe('I am own');
		expect(result.inherited).toBeUndefined(); // We want this to be undefined
	});
});

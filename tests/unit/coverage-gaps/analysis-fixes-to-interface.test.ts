import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { QModel } from '../../../src';

describe('ToInterfaceService Coverage Gaps', () => {
	let originalEnv: string | undefined;

	beforeEach(() => {
		originalEnv = process.env.NODE_ENV;
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it('should handle circular references in production mode', () => {
		process.env.NODE_ENV = 'production';

		const circularObj: any = { name: 'circular' };
		circularObj.self = circularObj;

		class CircularModel extends QModel<any> {}
		const model = new CircularModel(circularObj);

		// Silence console.error for this test
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

		const result = model.toInterface();
		// The structure preserves the object up to the cycle
		expect(result.self.self).toEqual({ __circular: true });

		consoleSpy.mockRestore();
	});

	it('should handle invalid Date toISOString where originalValue is Date (fallback to String(current))', () => {
		// Date with throwing toISOString
		const badDate = new Date();
		badDate.toISOString = () => {
			throw new Error('Boom');
		};

		// originalValue must be a Date for the condition line 231
		const originalDate = new Date('2024-01-01');

		// We need to bypass QModel constructor checks if possible, or use a model where we force this state
		class DateModel extends QModel<any> {}
		const model = new DateModel({
			date: originalDate,
		});

		// Force the bad value
		Object.defineProperty(model, 'date', {
			value: badDate,
			writable: true,
		});

		const result = model.toInterface();
		expect(result.date).toBe(String(badDate));
	});

	it('should handle RegExp where current value is NOT RegExp', () => {
		const regex = /test/;
		class RegexModel extends QModel<any> {
			declare reg: any;
		}

		const model = new RegexModel({ reg: regex });

		// Change to string
		model.reg = 'not a regex';

		const result = model.toInterface();
		// Should return original value (regex)
		expect(result.reg).toEqual(regex);
	});
});

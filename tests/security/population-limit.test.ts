import { describe, test, expect } from 'bun:test';
import { QModel } from '../../src/index';

describe('Security: Population Limits', () => {
	test('should reject massive objects', () => {
		interface IData {
			[key: string]: any;
		}
		class Data extends QModel<IData> {}

		const massiveObj: any = {};
		// Default limit is 50,000
		for (let i = 0; i < 50005; i++) {
			massiveObj[`key${i}`] = i;
		}

		expect(() => {
			new Data(massiveObj);
		}).toThrow(/too many properties/);
	});
});

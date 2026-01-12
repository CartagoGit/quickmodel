import { describe, it, expect } from 'bun:test';
import { QModel } from '../../../src/core/models/quick.model';
import { Quick } from '../../../src/core/decorators/quick.decorator';

describe('Mock Generator Fallbacks', () => {
	// Case 1: mappedType is Array constructor: @Quick({ tags: Array })
	it('should generate mocks using Array constructor in Quick map', () => {
		interface ITest {
			list: any[];
		}

		@Quick({ list: Array })
		class TestModel extends QModel<ITest> {
			declare list: any[];
		}

		const mock = TestModel.mock();
		console.log('Case 1 keys:', Object.keys(mock));
		console.log('Case 1 internal:', (mock as any).__quickValues__);
		console.log('Case 1 list:', mock.list);
		expect(Array.isArray(mock.list)).toBe(true);
	});

	// Case 2: mappedType is array syntax: @Quick({ tags: [String] })
	it('should generate mocks using array syntax in Quick map', () => {
		interface ITest {
			tags: string[];
		}

		@Quick({ tags: [String] })
		class TestModel extends QModel<ITest> {
			declare tags: string[];
		}

		const mock = TestModel.mock();
		console.log('Case 2 list:', mock.tags);
		expect(Array.isArray(mock.tags)).toBe(true);
	});

	// Case 3: mappedType is constructor: @Quick({ date: Date })
	it('should generate mocks using Constructor in Quick map', () => {
		interface ITest {
			date: Date;
			set: Set<any>;
			map: Map<any, any>;
		}

		@Quick({
			date: Date,
			set: Set,
			map: Map,
		})
		class TestModel extends QModel<ITest> {
			declare date: Date;
			declare set: Set<any>;
			declare map: Map<any, any>;
		}

		const mock = TestModel.mock();
		console.log('Case 3 date:', mock.date);
		expect(mock.date).toBeInstanceOf(Date);
		expect(mock.set).toBeInstanceOf(Set);
		expect(mock.map).toBeInstanceOf(Map);
	});

	it('should generate mocks using string type in Quick map', () => {
		interface ITest {
			num: number;
		}

		@Quick({ num: 'number' as any })
		class TestModel extends QModel<ITest> {
			declare num: number;
		}

		const mock = TestModel.mock();
		console.log('Case 4 num:', mock.num);
		expect(typeof mock.num).toBe('number');
	});
});

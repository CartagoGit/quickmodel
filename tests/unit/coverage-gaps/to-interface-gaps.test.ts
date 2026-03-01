// @quickmodel-rule-ignore: no-as-unknown — intentional: accessing private __initData field for testing internal state
import { describe, it, expect } from 'bun:test';
import { ToInterfaceService } from '../../../src/core/services/to-interface.service';
import 'reflect-metadata';

describe('ToInterfaceService Coverage Gaps', () => {
	const service = new ToInterfaceService();

	it('should handle Wrapper Objects (Number, String, Boolean)', () => {
		const model = {
			num: 123,
			str: 'test',
			bool: true,
		};

		// Mock initData with Wrapper Objects
		// @quickmodel-rule-ignore: no-as-unknown
		(model as unknown as Record<string, unknown>)['__initData'] = {
			num: new Number(123),
			str: new String('test'),
			bool: new Boolean(true),
		};

		const result = service.toInterface<any>(model);

		expect(result.num).toBeInstanceOf(Number);
		expect(result.num?.valueOf()).toBe(123);

		expect(result.str).toBeInstanceOf(String);
		expect(result.str?.valueOf()).toBe('test');

		expect(result.bool).toBeInstanceOf(Boolean);
		expect(result.bool?.valueOf()).toBe(true);
	});

	it('should handle BigInt special formats', () => {
		const model = {
			val1: 123n,
			val2: 456n,
		};

		// @quickmodel-rule-ignore: no-as-unknown
		(model as unknown as Record<string, unknown>)['__initData'] = {
			val1: { __type: 'bigint' }, // Object format
			val2: '456', // String format
		};

		const result = service.toInterface<any>(model);

		expect(result.val1).toBe('123');
		expect(result.val2).toBe('456');
	});

	it('should handle circular references in Objects', () => {
		const obj: any = { name: 'circular' };
		obj.self = obj;

		const model = {
			root: obj,
		};

		// Simulating the structure
		// @quickmodel-rule-ignore: no-as-unknown
		(model as unknown as Record<string, unknown>)['__initData'] = {
			root: obj,
		};

		expect(() => service.toInterface(model)).toThrow(/Circular reference/);
	});

	it('should handle Objects without constructor', () => {
		const nullProtoObj = Object.create(null);
		nullProtoObj.prop = 'value';

		const model = {
			obj: nullProtoObj,
		};

		// @quickmodel-rule-ignore: no-as-unknown
		(model as unknown as Record<string, unknown>)['__initData'] = {
			obj: nullProtoObj,
		};

		const result = service.toInterface<any>(model);
		expect(result.obj.prop).toBe('value');
		expect(Object.getPrototypeOf(result.obj)).toBe(null);
	});

	it('should handle RegExps correctly', () => {
		// Case: String input "/abc/i" -> RegExp output -> toInterface should return "/abc/i"
		const model = {
			reg: /abc/i,
		};

		// @quickmodel-rule-ignore: no-as-unknown
		(model as unknown as Record<string, unknown>)['__initData'] = {
			reg: '/abc/i',
		};

		const result = service.toInterface<any>(model);
		expect(result.reg).toBe('/abc/i');

		// Case: Object input { source: 'abc', flags: 'i' }
		// @quickmodel-rule-ignore: no-as-unknown
		(model as unknown as Record<string, unknown>)['__initData'] = {
			reg: { source: 'abc', flags: 'i' },
		};

		const result2 = service.toInterface<any>(model);
		expect(result2.reg).toEqual({ source: 'abc', flags: 'i' });
	});
});

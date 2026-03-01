import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('ToInterfaceService Extended Coverage', () => {
	it('should handle type mismatch when plain object becomes primitive', () => {
		interface IData {
			obj: { a: number };
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Data extends QModel<IData> {
			declare obj: { a: number } | string;
		}

		const data = new Data({ obj: { a: 1 } });
		// Change type at runtime
		(data as any).obj = 'not an object';

		// Access private service to force !isProduction (default in tests)
		// Or simply rely on QModel.toInterface calls

		expect(() => data.$qToInterface()).toThrow(/Cannot convert property/);
	});

	it('should handle generic class instances without toInterface', () => {
		class SimpleClass {
			prop: string = 'value';
			method() {
				return true;
			}
		}

		interface IContainer {
			instance: SimpleClass;
		}

		// We treat it as generic object
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Container extends QModel<IContainer> {
			declare instance: SimpleClass;
		}

		const simple = new SimpleClass();
		const container = new Container({ instance: simple });

		const result = container.$qToInterface();

		// Should serialize properties but not methods
		expect(result.instance as any).toEqual({ prop: 'value' });
		expect((result.instance as any).method).toBeUndefined();
	});

	it('should handle runtime type mismatch in production silently', () => {
		// Mock process.env.NODE_ENV
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';

		interface IData {
			obj: { a: number };
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Data extends QModel<IData> {
			declare obj: { a: number } | string;
		}

		const data = new Data({ obj: { a: 1 } });
		(data as any).obj = 'not an object';

		// Should NOT throw in production
		let result;
		try {
			result = data.$qToInterface();
		} finally {
			process.env.NODE_ENV = originalEnv;
		}

		expect(result.obj as any).toBe('not an object');
	});

	it('should handle generic objects with methods (skipping methods)', () => {
		interface IData {
			obj: { a: number; func: () => void };
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Data extends QModel<IData> {
			declare obj: { a: number; func: () => void };
		}

		const data = new Data({ obj: { a: 1, func: () => {} } });
		const result = data.$qToInterface();

		// Should retain 'a' but skip 'func'
		expect(result.obj as any).toEqual({ a: 1 });
		// We expect type casting for testing dynamic result
		expect((result.obj as any).func).toBeUndefined();
	});
});

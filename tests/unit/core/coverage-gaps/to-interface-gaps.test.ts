import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '../../../../src';
import { ToInterfaceService } from '../../../../src/core/services/to-interface.service';

describe('ToInterface Coverage Gaps', () => {
	it('should handle null original value becoming a model instance', () => {
		@Quick({ name: 'string' })
		class Child extends QModel<any> {
			declare name: string;
		}

		@Quick({ child: Child })
		class Parent extends QModel<any> {
			declare child: Child | null;
		}

		// Initialize with null
		const p = new Parent({ child: null });
		expect(p.toInterface()).toEqual({ child: null });

		// Update to instance
		p.child = new Child({ name: 'New' });

		// toInterface should now recurse into custom model serialization
		// The uncovered lines at 402-413 handle this case: original is null, current is object with toInterface
		expect(p.toInterface()).toEqual({ child: { name: 'New' } });
	});

	it('should handle circular reference in conversion', () => {
		// Line 155-160: check saw.has(currentValue)
		@Quick({ self: 'any' })
		class Circular extends QModel<any> {
			declare self: Circular;
		}

		const c = new Circular({ self: null });
		c.self = c;

		// In production, it might log or return value.
		// In dev/test (NODE_ENV!=production), it should throw.
		// QuickModel implementation checks process.env.NODE_ENV

		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'test'; // Ensure throws

		expect(() => c.toInterface()).toThrow('Circular reference');

		process.env.NODE_ENV = originalEnv;
	});

	it('should handle root array model', () => {
		const service = new ToInterfaceService();
		// Covers line 15: if (Array.isArray(model))
		const result = service.toInterface([1, 2] as any);
		expect(result).toEqual({});
	});

	it('should handle Map to Array conversion in nested array', () => {
		// Covers lines 159-160
		// We use an array that grows so originalValue is undefined for new item
		@Quick({ items: 'any' }) // Use any to allow Map
		class Wrapper extends QModel<any> {
			declare items: any[];
		}

		const w = new Wrapper({ items: [] });
		w.items.push(new Map([['a', 1]]));

		expect(w.toInterface()).toEqual({ items: [[['a', 1]]] });
	});

	it('should handle BigInt conversion from string original', () => {
		// Covers lines 321-322: if (originalValue === 'string' && currentValue === 'bigint')
		@Quick({ val: 'any' })
		class Mixed extends QModel<any> {
			declare val: any;
		}
		const m = new Mixed({ val: '100' });
		m.val = 100n;
		expect(m.toInterface()).toEqual({ val: '100' });
	});

	it('should handle Object.create(null)', () => {
		// Covers lines 331-346: !('constructor' in typedOriginal)
		@Quick({ obj: 'any' })
		class NullProto extends QModel<any> {
			declare obj: any;
		}

		const noProto = Object.create(null);
		noProto.a = 1;

		const n = new NullProto({ obj: noProto });
		expect(n.toInterface()).toEqual({ obj: { a: 1 } });
	});
	it('should handle Set to Array conversion in nested array', () => {
		// Covers line 155: return Array.from(currentValue);
		@Quick({ items: 'any' })
		class Wrapper extends QModel<any> {
			declare items: any[];
		}

		const w = new Wrapper({ items: [] });
		w.items.push(new Set(['a', 'b']));

		expect(w.toInterface()).toEqual({ items: [['a', 'b']] });
	});

	it('should preserve Date string if already string', () => {
		// Covers lines 193-194: if (typeof currentValue === 'string') return currentValue;
		@Quick({ date: 'any' })
		class DateWrapper extends QModel<any> {
			declare date: any;
		}

		// Initialized with ISO string, updated to different ISO string
		const w = new DateWrapper({ date: '2023-01-01T00:00:00.000Z' });
		w.date = '2024-01-01T00:00:00.000Z'; // Still a string

		expect(w.toInterface()).toEqual({ date: '2024-01-01T00:00:00.000Z' });
	});

	it('should fallback to String(date) if not a Date object or string', () => {
		// Covers lines 197: return String(currentValue);
		@Quick({ date: 'any' })
		class DateFallback extends QModel<any> {
			declare date: any;
		}

		// Initialized with Date, changed to number
		const d = new DateFallback({ date: new Date() });
		d.date = 123456789;

		expect(d.toInterface()).toEqual({ date: '123456789' });
	});

	it('should serialize custom class instance using properties matching original', () => {
		// Covers lines 402-413: object with non-Object constructor but no toInterface
		class CustomData {
			constructor(
				public a: number,
				public b: string
			) {}
			method() {
				return true;
			} // Should skip functions (line 403)
		}

		@Quick({ data: 'any' })
		class CustomModel extends QModel<any> {
			declare data: CustomData;
		}

		// Initialize with a simple object to set "originalValue" structure
		// NOTE: if original is generic object, we enter the block.
		const m = new CustomModel({ data: { a: 1, b: 'orig' } });

		// Update to instance of CustomData
		m.data = new CustomData(99, 'updated');

		// Expect serialization to extract properties 'a' and 'b' and ignore 'method'
		expect(m.toInterface()).toEqual({ data: { a: 99, b: 'updated' } });
	});

	it('should serialize nested model when original value is null', () => {
		// Covers lines 417-432: originalValue === null && 'toInterface' in currentValue
		class Nested extends QModel<any> {
			declare val: string;
		}
		@Quick({ child: Nested })
		class Parent extends QModel<any> {
			declare child: Nested | null;
		}

		// Init with null
		const p = new Parent({ child: null });
		// Set to instance
		p.child = new Nested({ val: 'test' });

		expect(p.toInterface()).toEqual({ child: { val: 'test' } });
	});

	it('should handle wrapper objects (Number, String, Boolean)', () => {
		// Covers lines 256-284
		@Quick({ n: 'any', s: 'any', b: 'any' })
		class Wrappers extends QModel<any> {
			declare n: any;
			declare s: any;
			declare b: any;
		}
		// Init with wrapper objects
		// Note: QModel by default unwraps primitives? No, not if ANY.
		// Actually if input was wrapper, toInterface should try to return wrapper?
		// Logic at 256 checks "instanceof Number".
		const w = new Wrappers({
			n: new Number(123),
			s: new String('str'),
			b: new Boolean(true),
		});

		// If we keep them as wrappers
		expect(w.toInterface().n).toBeInstanceOf(Number);
		expect(w.toInterface().s).toBeInstanceOf(String);
		expect(w.toInterface().b).toBeInstanceOf(Boolean);
		expect(w.toInterface().n.valueOf()).toBe(123);
	});

	it('should throw/log error on object type mismatch in development', () => {
		// Covers lines 352-361: original was object, current is NOT
		@Quick({ obj: 'object' })
		class Mismatch extends QModel<any> {
			declare obj: object;
		}

		const m = new Mismatch({ obj: { a: 1 } });
		// Force invalid type (ts-ignore or any)
		(m as any).obj = 'not-an-object';

		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'test'; // Not production

		expect(() => m.toInterface()).toThrow('Cannot convert property');

		process.env.NODE_ENV = 'production';
		// Should not throw, should return current value (string)
		const res = m.toInterface();
		expect(res).toEqual({ obj: 'not-an-object' });

		process.env.NODE_ENV = originalEnv;
	});

	it('should handle Symbol conversion with fallback', () => {
		// Covers line 252: typeof currentValue !== 'symbol'
		@Quick({ sym: 'any' })
		class SymbolWrapper extends QModel<any> {
			declare sym: any;
		}
		// Init with symbol to set originalValue type
		const originalSym = Symbol('orig');
		const w = new SymbolWrapper({ sym: originalSym });

		// Update to string
		w.sym = 'new-symbol-desc';

		const res = w.toInterface();
		expect(typeof res.sym).toBe('symbol');
		expect(res.sym.toString()).toBe('Symbol(new-symbol-desc)');
	});

	it('should handle legacy BigInt object format', () => {
		// Covers lines 303-315
		@Quick({ big: 'any' })
		class LegacyBigInt extends QModel<any> {
			declare big: any;
		}

		// Simulate legacy object structure { __type: 'bigint' } as original value
		// We have to bypass standard init which might not support this directly or transform it
		// But if we pass it as 'any', it is preserved.
		const legacyObj = { __type: 'bigint' };
		const m = new LegacyBigInt({ big: legacyObj });

		// Debugging: Check what __initData holds
		const initData = (m as any)['__initData'];
		console.log('DEBUG: __initData:', JSON.stringify(initData, null, 2));

		// Case 1: Current is BigInt
		m.big = 123n;
		try {
			expect(m.toInterface()).toEqual({ big: '123' });
		} catch (e) {
			console.error('DEBUG: Error in toInterface:', e);
			throw e;
		}

		// Case 2: Current is string (needs conversion) - Line 312
		m.big = '456';
		expect(m.toInterface()).toEqual({ big: '456' });
	});

	it('should serialize custom class instance when original is also custom instance', () => {
		// Covers lines 402-413: object with non-Object constructor but no toInterface
		class CustomData {
			constructor(public a: number) {}
		}
		@Quick({ data: 'any' })
		class CustomModel extends QModel<any> {
			declare data: any;
		}

		const orig = new CustomData(1);
		const m = new CustomModel({ data: orig });

		// Update to new instance
		m.data = new CustomData(2);

		// Should effectively clone it as plain object?
		expect(m.toInterface()).toEqual({ data: { a: 2 } });
	});

	it('should handle String original with BigInt current', () => {
		// Covers lines 318-322: original is string, current is bigint -> string
		@Quick({ val: 'any' })
		class StringBigInt extends QModel<any> {
			declare val: any;
		}
		const m = new StringBigInt({ val: 'initial' });
		m.val = 999n;

		expect(m.toInterface()).toEqual({ val: '999' });
	});
});

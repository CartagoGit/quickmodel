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
});

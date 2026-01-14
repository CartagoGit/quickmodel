import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '../../src/index';

describe('Security: Polymorphism Support', () => {
	test('should allow polymorphism on generic Object fields', () => {
		interface IData {
			meta: any;
		}
		class Data extends QModel<IData> {
			declare meta: any;
		}

		const payload = {
			meta: { __type: 'Map', entries: [['key', 'val']] },
		};

		const data = new Data(payload);
		expect(data.meta).toBeInstanceOf(Map);
		expect(data.meta.get('key')).toBe('val');
	});

	test('should allow explicit type deserialization using __type format', () => {
		interface IData {
			tags: Set<string>;
		}
		@Quick({ tags: Set })
		class Data extends QModel<IData> {
			declare tags: Set<string>;
		}

		const payload = {
			tags: { __type: 'Set', values: ['a', 'b'] },
		};

		const data = new Data(payload as any);
		expect(data.tags).toBeInstanceOf(Set);
		expect(data.tags.has('a')).toBe(true);
	});

	test('should NOT allow polymorphism on strict fields', () => {
		interface IData {
			count: number;
		}
		@Quick({ count: Number })
		class Data extends QModel<IData> {
			declare count: number;
		}

		const payload = {
			count: { __type: 'Date', value: '2020-01-01' },
		};

		// Should throw validation error or ignore __type and fail Number validation
		try {
			new Data(payload as any);
		} catch (_e) {
			expect(true).toBe(true);
			return;
		}
		// If it didn't throw, check it wasn't converted
		expect(true).toBe(false); // Should have thrown
	});
});

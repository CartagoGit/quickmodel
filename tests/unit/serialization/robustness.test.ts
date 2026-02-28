import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness Scenarios', () => {
	describe('Circular References', () => {
		test('should handle circular references in plain objects', () => {
			interface ICircular {
				self: any;
			}
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Circular extends QModel<ICircular> {
				declare self: any;
			}

			const obj: any = {};
			obj.self = obj;
			const model = new Circular({ self: obj });

			const jsonString = model.toJSON();
			// Should not crash
			expect(jsonString).toContain('__circular');
		});

		test('should handle circular references in Arrays', () => {
			interface ICircularArray {
				list: any[];
			}
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class CircularArray extends QModel<ICircularArray> {
				declare list: any[];
			}

			const arr: any[] = [];
			arr.push(arr);
			const model = new CircularArray({ list: arr });

			// This currently might crash or hang
			const jsonString = model.toJSON();
			expect(jsonString).toContain('__circular');
		});

		test('should handle circular references in Maps', () => {
			interface ICircularMap {
				map: Map<string, any>;
			}
			@Quick({ map: Map }, { unknownPropertyPolicy: 'keep' })
			class CircularMap extends QModel<ICircularMap> {
				declare map: Map<string, any>;
			}

			const map = new Map();
			map.set('self', map);
			const model = new CircularMap({ map });

			// This currently might crash or hang
			const jsonString = model.toJSON();
			expect(jsonString).toContain('__circular');
		});
	});

	describe('Deep Recursive Serialization', () => {
		test('should serialize BigInt inside Map', () => {
			interface IComplex {
				map: Map<string, bigint>;
			}
			@Quick({ map: Map }, { unknownPropertyPolicy: 'keep' })
			class Complex extends QModel<IComplex> {
				declare map: Map<string, bigint>;
			}

			const model = new Complex({ map: new Map([['val', 123n]]) });

			// If MapTransformer just unwraps, this will fail JSON.stringify
			const jsonString = model.toJSON();
			expect(jsonString).toContain('"val":"123"');
		});

		test('should serialize Date inside Set', () => {
			interface IComplex {
				dates: Set<Date>;
			}
			@Quick({ dates: Set }, { unknownPropertyPolicy: 'keep' })
			class Complex extends QModel<IComplex> {
				declare dates: Set<Date>;
			}

			const date = new Date('2024-01-01T00:00:00.000Z');
			const model = new Complex({ dates: new Set([date]) });

			const jsonString = model.toJSON();
			expect(jsonString).toContain('2024-01-01T00:00:00.000Z');
		});
	});
});

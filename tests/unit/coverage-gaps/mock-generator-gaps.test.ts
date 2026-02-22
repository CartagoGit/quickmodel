import { describe, it, expect } from 'bun:test';
import { QMockGenerator } from '../../../src/core/services/mock-generator.service';
import { QType } from '../../../src/core/decorators/qtype.decorator';
import { Quick } from '../../../src/core/decorators/quick.decorator';
import 'reflect-metadata';

describe('QMockGenerator Coverage Gaps', () => {
	const generator = new QMockGenerator();

	it('should generate empty values for all supported types', () => {
		@Quick({
			str: 'string',
			num: 'number',
			bool: 'boolean',
			big: 'bigint',
			sym: 'symbol',
			date: 'date',
			reg: 'regexp',
			err: 'error',
			url: 'url',
			params: 'urlsearchparams',
			arr: 'array',
			obj: 'object',
			map: 'map',
			set: 'set',
			buff: 'arraybuffer',
			view: 'dataview',
		})
		class AllTypesModel {
			declare str: string;
			declare num: number;
			declare bool: boolean;
			declare big: bigint;
			declare sym: symbol;
			declare date: Date;
			declare reg: RegExp;
			declare err: Error;
			declare url: URL;
			declare params: URLSearchParams;
			declare arr: any[];
			declare obj: object;
			declare map: Map<any, any>;
			declare set: Set<any>;
			declare buff: ArrayBuffer;
			declare view: DataView;
		}

		const mock = generator.generate(AllTypesModel, 'empty');

		expect(mock.str).toBe('');
		expect(mock.num).toBe(0);
		expect(mock.bool).toBe(false);
		expect(mock.big).toBe('0'); // Serialized format
		expect(typeof mock.sym).toBe('symbol');
		expect(mock.date).toBe('1970-01-01T00:00:00.000Z');
		expect(mock.reg).toBe('/(?:)/');
		expect(mock.err).toBeInstanceOf(Error);
		expect(mock.url).toBe('http://localhost');
		expect(mock.params).toBeInstanceOf(URLSearchParams);
		expect(mock.arr).toEqual([]);
		expect(mock.obj).toEqual({});
		expect(mock.map).toBeInstanceOf(Map);
		expect(mock.set).toBeInstanceOf(Set);
		expect(mock.buff).toBeInstanceOf(ArrayBuffer);
		expect(mock.view).toBeInstanceOf(DataView);
	});

	it('should generate typed arrays correctly', () => {
		@Quick({
			i8: 'int8array',
			u8: 'uint8array',
			i16: 'int16array',
			u16: 'uint16array',
			i32: 'int32array',
			u32: 'uint32array',
			f32: 'float32array',
			f64: 'float64array',
			bi64: 'bigint64array',
			bu64: 'biguint64array',
		})
		class TypedArrayModel {
			declare i8a: Int8Array;
			declare ui8a: Uint8Array;
			declare i16a: Int16Array;
			declare u16a: Uint16Array;
			declare i32a: Int32Array;
			declare u32a: Uint32Array;
			declare f32a: Float32Array;
			declare f64a: Float64Array;
			declare bi64a: BigInt64Array;
			declare bu64a: BigUint64Array;
		}

		const mock = generator.generate(TypedArrayModel, 'random');

		expect(mock.i8).toBeInstanceOf(Int8Array);
		expect(mock.u8).toBeInstanceOf(Uint8Array);
		expect(mock.i16).toBeInstanceOf(Int16Array);
		expect(mock.u16).toBeInstanceOf(Uint16Array);
		expect(mock.i32).toBeInstanceOf(Int32Array);
		expect(mock.u32).toBeInstanceOf(Uint32Array);
		expect(mock.f32).toBeInstanceOf(Float32Array);
		expect(mock.f64).toBeInstanceOf(Float64Array);
		expect(mock.bi64).toBeInstanceOf(BigInt64Array);
		expect(mock.bu64).toBeInstanceOf(BigUint64Array);
	});

	it('should handle custom mockers prioritisation', () => {
		// We define a model property in the type map so 'val' is recognized as a key for 'mockers'
		@Quick(
			{ val: 'string' },
			{
				mockers: {
					val: () => 'model-level-mock',
				},
			}
		)
		class CustomMockerModel {
			// We use @QType here to specifically inject a property-level mocker
			// to test the conflict resolution with the model-level mocker from @Quick
			@QType('string', { mocker: () => 'property-level-mock' })
			declare val: string;

			@QType('string')
			declare val2: string;
		}

		// Note: The logic in mock-generator checks options.mockers first (Model level)
		// THEN metadata (Property level).

		const mock = generator.generate(CustomMockerModel);
		expect(mock.val).toBe('model-level-mock');
	});

	it('should warn if custom transformer exists but no mocker', () => {
		const originalWarn = console.warn;
		let warnCalled = false;
		console.warn = () => {
			warnCalled = true;
		};

		// Define a custom transformer object
		const CustomTransformer = {
			to: (value: any) => value,
			from: (value: any) => value,
			// No 'serialize'/'deserialize' method names used in QType check?
			// QType checks for object with 'serialize' or 'deserialize'.
			deserialize: (value: any) => value,
			serialize: (value: any) => value,
		};

		// We use @Quick to define the property with a custom transformer
		@Quick({
			val: CustomTransformer as any,
		})
		class TransformerNoMocker {
			declare val: string;
		}

		try {
			generator.generate(TransformerNoMocker);
			expect(warnCalled).toBe(true);
		} finally {
			console.warn = originalWarn;
		}
	});

	it('should handle array design type with empty array in typeMap', () => {
		@Quick({
			tags: [], // Case 2: mappedType is array syntax: @Quick({ tags: [String] }) but EMPTY
		})
		class EmptyArrayTags {
			declare tags: any[];
		}

		const mock = generator.generate(EmptyArrayTags);
		expect(Array.isArray(mock.tags)).toBe(true);
	});
});

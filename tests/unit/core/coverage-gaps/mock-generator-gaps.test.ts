import { describe, it, expect } from 'bun:test';
import { QModel, Quick, QType } from '@/index';

describe('Mock Generator Coverage Gaps', () => {
	// ...
	it('should generate mocks via implicit design:type (no explicit config)', () => {
		// Covers generateByDesignType gaps (lines 419-444)
		class ImplicitBinaryModel extends QModel<any> {
			@QType()
			i8: Int8Array;

			@QType()
			buf: ArrayBuffer;

			@QType()
			view: DataView;

			@QType()
			date: Date;

			@QType() u8: Uint8Array;
			@QType() u8c: Uint8ClampedArray;
			@QType() i16: Int16Array;
			@QType() u16: Uint16Array;
			@QType() i32: Int32Array;
			@QType() u32: Uint32Array;
			@QType() f32: Float32Array;
			@QType() f64: Float64Array;
			@QType() bi64: BigInt64Array;
			@QType() bu64: BigUint64Array;
		}

		const mock = ImplicitBinaryModel.mock().random();
		expect(mock.i8).toBeInstanceOf(Int8Array);
		expect(mock.buf).toBeInstanceOf(ArrayBuffer);
		expect(mock.view).toBeInstanceOf(DataView);
		expect(mock.date).toBeInstanceOf(Date);
		expect(mock.u8).toBeInstanceOf(Uint8Array);
		expect(mock.u8c).toBeInstanceOf(Uint8ClampedArray);
		expect(mock.i16).toBeInstanceOf(Int16Array);
		expect(mock.u16).toBeInstanceOf(Uint16Array);
		expect(mock.i32).toBeInstanceOf(Int32Array);
		expect(mock.u32).toBeInstanceOf(Uint32Array);
		expect(mock.f32).toBeInstanceOf(Float32Array);
		expect(mock.f64).toBeInstanceOf(Float64Array);
		expect(mock.bi64).toBeInstanceOf(BigInt64Array);
		expect(mock.bu64).toBeInstanceOf(BigUint64Array);
	});

	it('should generate sample values for all types', () => {
		// Covers getSampleValue gaps (lines 530-548)
		@Quick({
			bi: 'bigint',
			sym: 'symbol',
			re: 'regexp',
			err: 'error',
			u: 'url',
			usp: 'urlsearchparams',
			map: 'map',
			set: 'set',
			arr: 'array',
			obj: 'object',
		})
		class SampleModel extends QModel<any> {
			declare bi: bigint;
			declare sym: symbol;
			declare re: RegExp;
			declare err: Error;
			declare u: URL;
			declare usp: URLSearchParams;
			declare map: Map<any, any>;
			declare set: Set<any>;
			declare arr: any[];
			declare obj: any;
		}

		const mock = SampleModel.mock().sample();

		expect(typeof mock.bi).toBe('bigint');
		expect(typeof mock.sym).toBe('symbol');
		expect(mock.re).toBeInstanceOf(RegExp);
		expect(mock.err).toBeInstanceOf(Error);
		expect(mock.u).toBeInstanceOf(URL);
		expect(mock.usp).toBeInstanceOf(URLSearchParams);
		expect(mock.map).toBeInstanceOf(Map);
		expect(mock.set).toBeInstanceOf(Set);
		expect(Array.isArray(mock.arr)).toBe(true);
		expect(typeof mock.obj).toBe('object');
	});
	it('should generate random values for all types', () => {
		// Covers getRandomValue gaps (lines 595, 605-613, etc)
		@Quick({
			bi: 'bigint',
			sym: 'symbol',
			re: 'regexp',
			err: 'error',
			u: 'url',
			usp: 'urlsearchparams',
			map: 'map',
			set: 'set',
		})
		class RandomModel extends QModel<any> {
			declare bi: bigint;
			declare sym: symbol;
			declare re: RegExp;
			declare err: Error;
			declare u: URL;
			declare usp: URLSearchParams;
			declare map: Map<any, any>;
			declare set: Set<any>;
		}

		// Random is default
		const mock = RandomModel.mock().random();

		expect(typeof mock.bi).toBe('bigint');
		expect(typeof mock.sym).toBe('symbol');
		expect(mock.re).toBeInstanceOf(RegExp);
		expect(mock.err).toBeInstanceOf(Error);
		expect(mock.u).toBeInstanceOf(URL);
		expect(mock.usp).toBeInstanceOf(URLSearchParams);
		expect(mock.map).toBeInstanceOf(Map);
		expect(mock.set).toBeInstanceOf(Set);
	});
	it('should generate nested model based on design:type when no other metadata is present', () => {
		// Covers line 281-282 in mock-generator.service.ts
		class NestedClass {}

		class Wrapper extends QModel<any> {
			@QType() // No args -> fieldType undefined
			nested: NestedClass;
		}

		// nested is not a "known" special type, so generateByDesignType returns string default
		const mock = Wrapper.mock().random();
		expect(typeof mock.nested).toBe('string');
	});

	it('should fallback to default string when no type metadata is available (line 284 coverage)', () => {
		@Quick({ unknownProp: null as any })
		class UnknownModel extends QModel<any> {
			// No declaration, so no design:type.
			// TypeMap entry is null, so it doesn't resolve to fieldType.
		}

		const mock = UnknownModel.mock().random();
		expect(typeof (mock as any).unknownProp).toBe('string');
	});
});

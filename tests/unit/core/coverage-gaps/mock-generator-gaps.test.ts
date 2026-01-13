import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Mock Generator Coverage Gaps', () => {
	it('should generate mocks for all TypedArrays', () => {
		@Quick({
			i8: Int8Array,
			u8: Uint8Array,
			u8c: Uint8ClampedArray,
			i16: Int16Array,
			u16: Uint16Array,
			i32: Int32Array,
			u32: Uint32Array,
			f32: Float32Array,
			f64: Float64Array,
			bi64: BigInt64Array,
			bu64: BigUint64Array,
			buf: ArrayBuffer,
			view: DataView,
		})
		class BinaryModel extends QModel<any> {
			declare i8: Int8Array;
			declare u8: Uint8Array;
			declare u8c: Uint8ClampedArray;
			declare i16: Int16Array;
			declare u16: Uint16Array;
			declare i32: Int32Array;
			declare u32: Uint32Array;
			declare f32: Float32Array;
			declare f64: Float64Array;
			declare bi64: BigInt64Array;
			declare bu64: BigUint64Array;
			declare buf: ArrayBuffer;
			declare view: DataView;
		}

		const mock = BinaryModel.mock().sample();

		expect(mock.i8).toBeInstanceOf(Int8Array);
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
		expect(mock.buf).toBeInstanceOf(ArrayBuffer);
		expect(mock.view).toBeInstanceOf(DataView);
	});

	it('should generate mocks from plain strings describing TypedArrays (non-design type)', () => {
		@Quick({
			i8: 'Int8Array',
			u8: 'Uint8Array',
			u8c: 'Uint8ClampedArray',
			i16: 'Int16Array',
			u16: 'Uint16Array',
			i32: 'Int32Array',
			u32: 'Uint32Array',
			f32: 'Float32Array',
			f64: 'Float64Array',
			bi64: 'BigInt64Array',
			bu64: 'BigUint64Array',
			buf: 'ArrayBuffer',
			view: 'DataView',
		})
		class StringBinaryModel extends QModel<any> {
			declare i8: Int8Array;
			// ... no need to declare all for runtime check if we check keys
			[key: string]: any;
		}

		const mock = StringBinaryModel.mock().sample();

		expect(mock.i8).toBeInstanceOf(Int8Array);
		expect(mock.f64).toBeInstanceOf(Float64Array);
		expect(mock.bu64).toBeInstanceOf(BigUint64Array);
	});
});

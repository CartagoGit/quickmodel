import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Mock Generator - Binary & Typed Arrays Coverage', () => {
	// Define a model with all binary types
	@Quick({
		buffer: ArrayBuffer,
		view: DataView,
		i8: Int8Array,
		u8: Uint8Array,
		u8c: Uint8ClampedArray,
		i16: Int16Array,
		u16: Uint16Array,
		i32: Int32Array,
		u32: Uint32Array,
		f32: Float32Array,
		f64: Float64Array,
		big64: BigInt64Array,
		bigu64: BigUint64Array,
	})
	class BinaryModel extends QModel<any> {
		declare buffer: ArrayBuffer;
		declare view: DataView;
		declare i8: Int8Array;
		declare u8: Uint8Array;
		declare u8c: Uint8ClampedArray;
		declare i16: Int16Array;
		declare u16: Uint16Array;
		declare i32: Int32Array;
		declare u32: Uint32Array;
		declare f32: Float32Array;
		declare f64: Float64Array;
		declare big64: BigInt64Array;
		declare bigu64: BigUint64Array;
	}

	it('should generate empty mocks for all binary types', () => {
		const mock = BinaryModel.mock().empty({});

		expect(mock.buffer).toBeInstanceOf(ArrayBuffer);
		expect(mock.buffer.byteLength).toBe(0);

		expect(mock.view).toBeInstanceOf(DataView);
		expect(mock.view.byteLength).toBe(0);

		expect(mock.i8).toBeInstanceOf(Int8Array);
		expect(mock.i8.length).toBe(0);
		expect(mock.u8).toBeInstanceOf(Uint8Array);
		expect(mock.u8c).toBeInstanceOf(Uint8ClampedArray);
		expect(mock.i16).toBeInstanceOf(Int16Array);
		expect(mock.u16).toBeInstanceOf(Uint16Array);
		expect(mock.i32).toBeInstanceOf(Int32Array);
		expect(mock.u32).toBeInstanceOf(Uint32Array);
		expect(mock.f32).toBeInstanceOf(Float32Array);
		expect(mock.f64).toBeInstanceOf(Float64Array);
		expect(mock.big64).toBeInstanceOf(BigInt64Array);
		expect(mock.bigu64).toBeInstanceOf(BigUint64Array);
	});

	it('should generate sample mocks for all binary types', () => {
		const mock = BinaryModel.mock().sample({});

		// Check if sample values are populated (mock-generator usually provides non-empty for 'sample')
		expect(mock.i8.length).toBeGreaterThan(0);
		expect(mock.f32.length).toBeGreaterThan(0);
		expect(mock.big64.length).toBeGreaterThan(0);
	});

	it('should support random mocks for all binary types', () => {
		const mock = BinaryModel.mock().random({});
		expect(mock.i8).toBeInstanceOf(Int8Array);
	});
});

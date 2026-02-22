import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Mock Generator - Binary & Typed Arrays Coverage', () => {
	// Define a model with all binary types
	@Quick({
		buffer: ArrayBuffer,
		view: DataView,
		i8a: Int8Array,
		u8a: Uint8Array,
		u8ca: Uint8ClampedArray,
		i16a: Int16Array,
		u16a: Uint16Array,
		i32a: Int32Array,
		u32a: Uint32Array,
		f32a: Float32Array,
		f64a: Float64Array,
		big64a: BigInt64Array,
		bigu64a: BigUint64Array,
	})
	class BinaryModel extends QModel<any> {
		declare buffer: ArrayBuffer;
		declare view: DataView;
		declare i8a: Int8Array;
		declare u8a: Uint8Array;
		declare u8ca: Uint8ClampedArray;
		declare i16a: Int16Array;
		declare u16a: Uint16Array;
		declare i32a: Int32Array;
		declare u32a: Uint32Array;
		declare f32a: Float32Array;
		declare f64a: Float64Array;
		declare big64a: BigInt64Array;
		declare bigu64a: BigUint64Array;
	}

	it('should generate empty mocks for all binary types', () => {
		const mock = BinaryModel.mock().empty({});

		expect(mock.buffer).toBeInstanceOf(ArrayBuffer);
		expect(mock.buffer.byteLength).toBe(0);

		expect(mock.view).toBeInstanceOf(DataView);
		expect(mock.view.byteLength).toBe(0);

		expect(mock.i8a).toBeInstanceOf(Int8Array);
		expect(mock.i8a.length).toBe(0);
		expect(mock.u8a).toBeInstanceOf(Uint8Array);
		expect(mock.u8ca).toBeInstanceOf(Uint8ClampedArray);
		expect(mock.i16a).toBeInstanceOf(Int16Array);
		expect(mock.u16a).toBeInstanceOf(Uint16Array);
		expect(mock.i32a).toBeInstanceOf(Int32Array);
		expect(mock.u32a).toBeInstanceOf(Uint32Array);
		expect(mock.f32a).toBeInstanceOf(Float32Array);
		expect(mock.f64a).toBeInstanceOf(Float64Array);
		expect(mock.big64a).toBeInstanceOf(BigInt64Array);
		expect(mock.bigu64a).toBeInstanceOf(BigUint64Array);
	});

	it('should generate sample mocks for all binary types', () => {
		const mock = BinaryModel.mock().sample({});

		// Check if sample values are populated (mock-generator usually provides non-empty for 'sample')
		expect(mock.i8a.length).toBeGreaterThan(0);
		expect(mock.f32a.length).toBeGreaterThan(0);
		expect(mock.big64a.length).toBeGreaterThan(0);
	});

	it('should support random mocks for all binary types', () => {
		const mock = BinaryModel.mock().random({});
		expect(mock.i8a).toBeInstanceOf(Int8Array);
	});
});

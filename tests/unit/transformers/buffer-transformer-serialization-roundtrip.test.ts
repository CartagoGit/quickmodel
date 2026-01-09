/**
 * Unit Test: Buffer Transformer
 * 
 * Tests serialization and deserialization of Buffer/ArrayBuffer objects
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '@/index';

describe('Unit: Buffer Transformer', () => {
	interface IBufferData {
		buffer: string; // ArrayBuffer serializado como base64 del backend
	}

	interface IBufferDataTransform {
		buffer: ArrayBuffer; // Transformado a ArrayBuffer en la clase
	}

	@Quick({ buffer: ArrayBuffer })
	class BufferData extends QModel<IBufferData> implements QInterface<IBufferData, IBufferDataTransform> {
		buffer!: ArrayBuffer;
	}

	test('Should serialize ArrayBuffer', () => {
		const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
		const model = new BufferData({ buffer: buffer as any });
		
		const json = model.toJSON();
		const parsed = JSON.parse(json);
		
		// ArrayBuffer serializes to array of bytes directly
		expect(parsed.buffer).toEqual([1, 2, 3, 4]);
	});

	test('Should deserialize ArrayBuffer', () => {
		const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
		const model = new BufferData({ buffer: buffer as any });
		const deserialized = BufferData.fromJSON(model.toJSON());
		
		expect(deserialized.buffer).toBeInstanceOf(ArrayBuffer);
	});

	test('Should maintain buffer data after roundtrip', () => {
		const original = new Uint8Array([10, 20, 30, 40, 50]);
		const model = new BufferData({ buffer: original.buffer as any });
		const deserialized = BufferData.fromJSON(model.toJSON());
		
		const result = new Uint8Array(deserialized.buffer);
		expect(Array.from(result)).toEqual([10, 20, 30, 40, 50]);
	});

	test('Should handle empty buffer', () => {
		const buffer = new ArrayBuffer(0);
		const model = new BufferData({ buffer: buffer as any });
		const deserialized = BufferData.fromJSON(model.toJSON());
		
		expect(deserialized.buffer).toBeInstanceOf(ArrayBuffer);
		expect(deserialized.buffer.byteLength).toBe(0);
	});

	test('Should handle large buffer', () => {
		const size = 1024 * 1024; // 1MB
		const buffer = new ArrayBuffer(size);
		const view = new Uint8Array(buffer);
		for (let i = 0; i < 100; i++) {
			view[i] = i % 256;
		}
		
		const model = new BufferData({ buffer: buffer as any });
		const deserialized = BufferData.fromJSON(model.toJSON());
		
		expect(deserialized.buffer.byteLength).toBe(size);
		const resultView = new Uint8Array(deserialized.buffer);
		for (let i = 0; i < 100; i++) {
			expect(resultView[i]).toBe(i % 256);
		}
	});

	test('Should handle buffer with binary data', () => {
		const buffer = new Uint8Array([0, 255, 128, 1, 254]).buffer;
		const model = new BufferData({ buffer: buffer as any });
		const deserialized = BufferData.fromJSON(model.toJSON());
		
		const result = new Uint8Array(deserialized.buffer);
		expect(Array.from(result)).toEqual([0, 255, 128, 1, 254]);
	});

	test('Should handle buffer created from different typed arrays', () => {
		const int16Buffer = new Int16Array([1000, -1000, 500]).buffer;
		const model = new BufferData({ buffer: int16Buffer as any });
		const deserialized = BufferData.fromJSON(model.toJSON());
		
		expect(deserialized.buffer.byteLength).toBe(6); // 3 * 2 bytes
		const result = new Int16Array(deserialized.buffer);
		expect(Array.from(result)).toEqual([1000, -1000, 500]);
	});
});

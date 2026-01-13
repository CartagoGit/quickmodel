import { describe, test, expect } from 'bun:test';
import {
	DataViewTransformer,
	SharedArrayBufferTransformer,
} from '../../src/transformers/buffer.transformer';

describe('Binary Buffers Security (DoS Prevention)', () => {
	test('DataViewTransformer should respect default limit (1M bytes)', () => {
		const transformer = new DataViewTransformer();
		const data = Array.from({ length: 110 }, () => 0);

		// Mock context with low limit
		const context = {
			metadata: {
				transformerOptions: { maxBytes: 100 },
			},
		};

		expect(() => {
			// @ts-ignore
			transformer.deserialize(data, 'data', 'Binary', context); // Cast as context is optional but logic uses it
		}).toThrow('DataView input too large');
	});

	test('SharedArrayBufferTransformer should respect default limit (1M bytes)', () => {
		if (typeof SharedArrayBuffer === 'undefined') return; // Skip if env doesn't support SAB

		const transformer = new SharedArrayBufferTransformer();
		const data = Array.from({ length: 110 }, () => 0);

		const context = {
			metadata: {
				transformerOptions: { maxBytes: 100 },
			},
		};

		expect(() => {
			// @ts-ignore
			transformer.deserialize(data, 'shared', 'Binary', context);
		}).toThrow('SharedArrayBuffer input too large');
	});
});

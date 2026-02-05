import { describe, test, expect } from 'bun:test';

import {
	mapTransformer,
	setTransformer,
} from '../../../../src/transformers/map-set.transformer';
import { errorTransformer } from '../../../../src/transformers/error.transformer';
import { symbolTransformer } from '../../../../src/transformers/symbol.transformer';

describe('Transformer Coverage Gaps', () => {
	describe('MapTransformer', () => {
		test('should throw QModelError when input array exceeds maxItems', () => {
			const items = new Array(1001).fill(['key', 'value']);
			const context = {
				propertyKey: 'test',
				className: 'Test',
				metadata: {
					transformerOptions: {
						maxItems: 1000,
					},
				},
			};

			// Testing array input
			expect(() => {
				mapTransformer.deserialize(items, 'test', 'Test', context);
			}).toThrow(/Map input too large/);
		});

		test('should throw QModelError when __type input exceeds maxItems', () => {
			const items = new Array(1001).fill(['key', 'value']);
			const input = {
				__type: 'Map' as const,
				entries: items as [string, unknown][],
			};
			const context = {
				propertyKey: 'test',
				className: 'Test',
				metadata: {
					transformerOptions: {
						maxItems: 1000,
					},
				},
			};

			expect(() => {
				mapTransformer.deserialize(input, 'test', 'Test', context);
			}).toThrow(/Map input too large/);
		});
	});

	describe('SetTransformer', () => {
		test('should throw QModelError when input array exceeds maxItems', () => {
			const items = new Array(1001).fill('value');
			const context = {
				propertyKey: 'test',
				className: 'Test',
				metadata: {
					transformerOptions: {
						maxItems: 1000,
					},
				},
			};

			expect(() => {
				setTransformer.deserialize(items, 'test', 'Test', context);
			}).toThrow(/Set input too large/);
		});

		test('should throw QModelError when __type input exceeds maxItems', () => {
			const items = new Array(1001).fill('value');
			const input = { __type: 'Set' as const, values: items };
			const context = {
				propertyKey: 'test',
				className: 'Test',
				metadata: {
					transformerOptions: {
						maxItems: 1000,
					},
				},
			};

			expect(() => {
				setTransformer.deserialize(input, 'test', 'Test', context);
			}).toThrow(/Set input too large/);
		});
	});

	describe('ErrorTransformer', () => {
		test('should throw QModelError when message exceeds MAX_LEN in object format', () => {
			const longMessage = 'a'.repeat(2049); // Default limit is 2048
			const input = { message: longMessage, name: 'Error' };

			expect(() => {
				errorTransformer.deserialize(input, 'test', 'Test');
			}).toThrow(/Error message too long/);
		});
	});

	describe('SymbolTransformer', () => {
		test('should throw QModelError when description exceeds MAX_LEN in object format', () => {
			const longDesc = 'a'.repeat(1025); // Default limit is 1024
			const input = { __type: 'symbol' as const, description: longDesc };

			expect(() => {
				symbolTransformer.deserialize(input, 'test', 'Test');
			}).toThrow(/Symbol description too long/);
		});

		test('should handle null/undefined input', () => {
			expect(
				symbolTransformer.deserialize(null, 'test', 'Test')
			).toBeNull();
			expect(
				symbolTransformer.deserialize(undefined, 'test', 'Test')
			).toBeUndefined();
		});
	});
});

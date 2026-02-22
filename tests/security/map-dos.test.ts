import { describe, it, expect } from 'bun:test';
import { MapTransformer } from '../../src/transformers/map-set.transformer';
import { IQTransformContext } from '../../src/core/interfaces/transformer.interface';

describe('Security: MapTransformer DoS', () => {
	it('should NOT ignore limits when deserializing from Object format', () => {
		const transformer = new MapTransformer();

		// Context with very low limit
		const context: IQTransformContext = {
			className: 'Test',
			propertyKey: 'map',
			metadata: {
				transformerOptions: {
					maxItems: 5,
				},
			} as any,
		};

		// Input with 6 items (exceeds limit 5)
		const inputObject: Record<string, number> = {
			a: 1,
			b: 2,
			c: 3,
			d: 4,
			e: 5,
			f: 6,
		};

		// Should throw QModelError because limit exceeded
		// If vulnerable, it returns a Map size 6 without error
		let error: any;
		try {
			transformer.deserialize(inputObject, 'map', 'Test', context);
		} catch (err) {
			error = err;
		}

		// If 'error' is undefined, it means it happily processed the oversized input
		expect(error).toBeDefined();
		expect(error.message).toContain('too large');
	});
});

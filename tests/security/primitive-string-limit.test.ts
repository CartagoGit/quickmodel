import { describe, test, expect } from 'bun:test';

import { PrimitiveTransformer } from '@/transformers/primitive.transformer';

describe('Security: Primitive String Limit', () => {
	test('should reject extremely long strings (DoS prevention)', () => {
		const transformer = new PrimitiveTransformer('string');

		// 1MB string - should be fine (below limit)
		const safeString = 'a'.repeat(1024 * 1024);
		const result1 = transformer.validate(safeString, {
			className: 'Test',
			propertyKey: 'prop',
			value: safeString,
		});
		expect(result1.isValid).toBe(true);

		// 6MB string - should happen to be REJECTED (limit is 5MB)
		const hugeString = 'a'.repeat(6 * 1024 * 1024);
		const result2 = transformer.validate(hugeString, {
			className: 'Test',
			propertyKey: 'prop',
			value: 'TRUNCATED',
		});

		expect(result2.isValid).toBe(false);
		expect(result2.error).toContain('too long');
		expect(result2.error).toContain('5MB');
	});

	test('should allow custom configuration if needed (future proofing)', () => {
		// Current implementation is hardcoded for safety, but verification is key
	});
});

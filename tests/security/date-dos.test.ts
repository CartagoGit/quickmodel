import { describe, test, expect } from 'bun:test';
import { DateTransformer } from '../../src/transformers/date.transformer';

describe('DateTransformer Security', () => {
	test('should reject extremely long strings (DoS prevention)', () => {
		const transformer = new DateTransformer();

		// Create 2000 char string
		const hugeString = '2024-' + '0'.repeat(2000);

		expect(() => {
			transformer.deserialize(hugeString, 'createdAt', 'User');
		}).toThrow('Date input string too long > 128 chars');
	});

	test('should accept valid ISO strings', () => {
		const transformer = new DateTransformer();
		const date = new Date('2024-01-01T00:00:00.000Z');

		const result = transformer.deserialize(
			date.toISOString(),
			'createdAt',
			'User'
		);
		expect(result).toBeInstanceOf(Date);
		expect(result?.toISOString()).toBe(date.toISOString());
	});
});

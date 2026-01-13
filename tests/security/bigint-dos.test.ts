import { describe, test, expect } from 'bun:test';
import { BigIntTransformer } from '../../src/transformers/bigint.transformer';
import { QModelError } from '@/core/errors/quickmodel.error';

describe('BigIntTransformer Security', () => {
	test('should reject extremely long strings (DoS prevention)', () => {
		const transformer = new BigIntTransformer();

		// Create 5000 digit number (above 2048 limit)
		const hugeNumber = '1'.repeat(5000);

		expect(() => {
			transformer.deserialize(hugeNumber, 'balance', 'Account');
		}).toThrow('BigInt input string too long > 2048 chars');
	});

	test('should accept reasonable large numbers', () => {
		const transformer = new BigIntTransformer();
		const reasonableNumber = '90071992547409919007199254740991'; // Double the max safe integer size

		const result = transformer.deserialize(
			reasonableNumber,
			'balance',
			'Account'
		);
		expect(result).toBe(90071992547409919007199254740991n);
	});
});

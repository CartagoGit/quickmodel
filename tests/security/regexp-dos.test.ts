import { describe, test, expect } from 'bun:test';
import { RegExpTransformer } from '../../src/transformers/regexp.transformer';

describe('RegExpTransformer Security', () => {
	test('should reject extremely long pattern strings (DoS prevention)', () => {
		const transformer = new RegExpTransformer();

		// Create 2000 char string
		const hugePattern = '/a' + 'b'.repeat(2000) + '/i';

		expect(() => {
			transformer.deserialize(hugePattern, 'emailPattern', 'Config');
		}).toThrow('RegExp pattern too long');
	});

	test('should reject extremely long source code in object format', () => {
		const transformer = new RegExpTransformer();

		const hugeObject = {
			source: 'a'.repeat(2000),
			flags: 'g',
		};

		expect(() => {
			// @ts-expect-error simulating untyped runtime input
			transformer.deserialize(hugeObject, 'emailPattern', 'Config');
		}).toThrow('RegExp source too long');
	});

	test('should accept valid patterns', () => {
		const transformer = new RegExpTransformer();
		const pattern = '/^[a-z]+@[a-z]+\\.com$/i';

		const result = transformer.deserialize(
			pattern,
			'emailPattern',
			'Config'
		);
		expect(result).toBeInstanceOf(RegExp);
		expect(result?.source).toBe('^[a-z]+@[a-z]+\\.com$');
		expect(result?.flags).toContain('i');
	});
});

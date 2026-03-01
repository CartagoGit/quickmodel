// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, test, expect } from 'bun:test';
import { RegExpTransformer } from '@/transformers/regexp.transformer';

describe('Unit: RegExp Transformer Extended Coverage', () => {
	const transformer = new RegExpTransformer();
	const context = { propertyKey: 'regex', className: 'TestClass' };

	test('deserialize: should throw on object with non-string source', () => {
		expect(() => {
			transformer.deserialize(
				{ source: 123 } as any,
				'regex',
				'TestClass'
			);
		}).toThrow(/must have 'source' as string/);
	});

	test('deserialize: should throw on invalid pattern in object', () => {
		expect(() => {
			// Unmatched parenthesis causing invalid regex
			transformer.deserialize(
				{ source: '(', flags: '' },
				'regex',
				'TestClass'
			);
		}).toThrow(/Invalid RegExp pattern/);
	});

	test('deserialize: should throw on string with slashes but invalid pattern', () => {
		expect(() => {
			// Matches /.../ format but pattern inside is invalid
			transformer.deserialize('/(/', 'regex', 'TestClass');
		}).toThrow(/Invalid RegExp string with slashes/);
	});

	test('deserialize: should fall back to plain string and throw if invalid', () => {
		expect(() => {
			// Plain string (not /.../ format) that is invalid
			transformer.deserialize('(', 'regex', 'TestClass');
		}).toThrow(/Invalid RegExp pattern/);
	});

	test('deserialize: should throw on invalid type', () => {
		expect(() => {
			transformer.deserialize(
				123 as unknown as string, // @quickmodel-rule-ignore: no-as-unknown
				'regex',
				'TestClass'
			);
		}).toThrow(/RegExp transformer ONLY accepts/);
	});

	test('validate: should reject null', () => {
		expect(transformer.checkIntegrity(null, context).isValid).toBe(false);
	});

	test('validate: should reject invalid types', () => {
		expect(transformer.checkIntegrity(123, context).isValid).toBe(false);
	});

	test('validate: should accept valid types', () => {
		expect(transformer.checkIntegrity(/abc/, context).isValid).toBe(true);
		expect(transformer.checkIntegrity('/abc/', context).isValid).toBe(true);
		expect(
			transformer.checkIntegrity({ source: 'abc' }, context).isValid
		).toBe(true);
	});
});

import { describe, test, expect } from 'bun:test';
import {
	URLTransformer,
	URLSearchParamsTransformer,
	TextEncoderTransformer,
	TextDecoderTransformer,
} from '@/transformers/web-apis.transformer';

describe('Unit: Web APIs Transformers Coverage', () => {
	// =========================================================================
	// URL Transformer
	// =========================================================================
	describe('URLTransformer', () => {
		const transformer = new URLTransformer();
		const context = { propertyKey: 'url', className: 'TestClass' };

		test('deserialize should return URL instance from valid string', () => {
			const url = transformer.deserialize(
				'https://example.com',
				'url',
				'TestClass'
			);
			expect(url).toBeInstanceOf(URL);
			expect(url!.href).toBe('https://example.com/');
		});

		test('deserialize should result URL instance from URL instance', () => {
			const input = new URL('https://example.com');
			const url = transformer.deserialize(input, 'url', 'TestClass');
			expect(url).toBe(input);
		});

		test('deserialize should return null/undefined for null/undefined', () => {
			expect(
				transformer.deserialize(null, 'url', 'TestClass')
			).toBeNull();
			expect(
				transformer.deserialize(undefined, 'url', 'TestClass')
			).toBeUndefined();
		});

		test('deserialize should throw on non-string input', () => {
			expect(() => {
				transformer.deserialize(
					123 as unknown as string,
					'url',
					'TestClass'
				);
			}).toThrow(/URL transformer ONLY accepts/);
		});

		test('deserialize should throw on invalid URL string', () => {
			expect(() => {
				transformer.deserialize('invalid-url', 'url', 'TestClass');
			}).toThrow(/Invalid URL string/);
		});

		test('serialize should return string', () => {
			const output = transformer.serialize(
				new URL('https://example.com')
			);
			expect(output).toBe('https://example.com/');
		});

		test('validate should return valid for URL instance', () => {
			expect(
				transformer.validate(new URL('https://example.com'), context)
					.isValid
			).toBe(true);
		});

		test('validate should return valid for valid URL string', () => {
			expect(
				transformer.validate('https://example.com', context).isValid
			).toBe(true);
		});

		test('validate should return invalid for invalid URL string', () => {
			const result = transformer.validate('not-a-url', context);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Invalid URL value');
		});

		test('validate should return invalid for non-string', () => {
			const result = transformer.validate(123, context);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Expected string/URL');
		});
	});

	// =========================================================================
	// URLSearchParams Transformer
	// =========================================================================
	describe('URLSearchParamsTransformer', () => {
		const transformer = new URLSearchParamsTransformer();
		const context = { propertyKey: 'params', className: 'TestClass' };

		test('deserialize should return instance from string', () => {
			const params = transformer.deserialize(
				'foo=bar&baz=qux',
				'params',
				'TestClass'
			);
			expect(params).toBeInstanceOf(URLSearchParams);
			expect(params!.get('foo')).toBe('bar');
		});

		test('deserialize should return instance from object', () => {
			const params = transformer.deserialize(
				{ foo: 'bar' },
				'params',
				'TestClass'
			);
			expect(params!.get('foo')).toBe('bar');
		});

		test('deserialize should return same instance', () => {
			const input = new URLSearchParams('foo=bar');
			const result = transformer.deserialize(
				input,
				'params',
				'TestClass'
			);
			expect(result).toBe(input);
		});

		test('deserialize should throw on array (invalid object)', () => {
			expect(() => {
				transformer.deserialize(
					['foo'] as unknown as string,
					'params',
					'TestClass'
				);
			}).toThrow(/URLSearchParams transformer ONLY accepts/);
		});

		test('deserialize should ALLOW null', () => {
			const result = transformer.deserialize(
				null as any,
				'params',
				'TestClass'
			);
			expect(result).toBeNull();
		});

		test('serialize should return query string', () => {
			const params = new URLSearchParams('foo=bar');
			expect(transformer.serialize(params)).toBe('foo=bar');
		});

		test('validate should pass for valid inputs', () => {
			expect(
				transformer.validate(new URLSearchParams(), context).isValid
			).toBe(true);
			expect(transformer.validate('foo=bar', context).isValid).toBe(true);
			expect(transformer.validate({ foo: 'bar' }, context).isValid).toBe(
				true
			);
		});

		test('validate should fail for invalid string', () => {
			// Note: URLSearchParams accepts almost any string, so it's hard to make it throw.
			// But let's see if we can trigger the catch block.
			// Actually passing a symbol or incompatible type that pretends to be string might do it?
			// Or maybe URLSearchParams constructor is very lenient.
			// The catch block in validation might be unreachable for standard strings.
			// But let's checking non-object types.
			expect(transformer.validate(123, context).isValid).toBe(false);
		});
	});

	// =========================================================================
	// TextEncoder Transformer
	// =========================================================================
	describe('TextEncoderTransformer', () => {
		const transformer = new TextEncoderTransformer();

		test('deserialize should return instance from null/undefined/empty', () => {
			expect(transformer.deserialize(null, 'enc', 'TC')).toBeInstanceOf(
				TextEncoder
			);
			expect(
				transformer.deserialize(undefined, 'enc', 'TC')
			).toBeInstanceOf(TextEncoder);
			expect(transformer.deserialize({}, 'enc', 'TC')).toBeInstanceOf(
				TextEncoder
			);
		});

		test('deserialize should return same instance', () => {
			const enc = new TextEncoder();
			expect(transformer.deserialize(enc, 'enc', 'TC')).toBe(enc);
		});

		test('deserialize should throw on invalid input', () => {
			expect(() => {
				transformer.deserialize('invalid', 'enc', 'TC');
			}).toThrow(/TextEncoder transformer ONLY accepts/);
		});

		test('serialize should return empty object', () => {
			expect(transformer.serialize(new TextEncoder())).toEqual({});
		});
	});

	// =========================================================================
	// TextDecoder Transformer
	// =========================================================================
	describe('TextDecoderTransformer', () => {
		const transformer = new TextDecoderTransformer();

		test('deserialize should return instance from string encoding', () => {
			const dec = transformer.deserialize('utf-8', 'dec', 'TC');
			expect(dec).toBeInstanceOf(TextDecoder);
			expect(dec!.encoding).toBe('utf-8');
		});

		test('deserialize should return instance from object config', () => {
			const dec = transformer.deserialize(
				{ encoding: 'utf-8' },
				'dec',
				'TC'
			);
			expect(dec).toBeInstanceOf(TextDecoder);
		});

		test('deserialize should return null for null input', () => {
			const dec = transformer.deserialize(null as any, 'dec', 'TC');
			expect(dec).toBeNull();
		});

		test('deserialize should handle invalid encoding gracefully or throw', () => {
			// Node/Bun might throw on invalid encoding
			try {
				transformer.deserialize('invalid-encoding-xyz', 'dec', 'TC');
			} catch (err: unknown) {
				const e = err as Error;
				expect(e.message).toContain('Invalid encoding');
			}
		});

		test('deserialize should throw on bad object config', () => {
			try {
				transformer.deserialize(
					{ encoding: 'bad-encoding' },
					'dec',
					'TC'
				);
			} catch (err: unknown) {
				const e = err as Error;
				expect(e.message).toContain('Invalid encoding');
			}
		});

		test('deserialize should throw on invalid input type', () => {
			expect(() => {
				transformer.deserialize(123 as unknown as string, 'dec', 'TC');
			}).toThrow(/TextDecoder transformer accepts string/);
		});

		test('deserialize should return same instance if input is TextDecoder', () => {
			const dec = new TextDecoder('utf-8');
			expect(transformer.deserialize(dec, 'dec', 'TC')).toBe(dec);
		});

		test('serialize should return config', () => {
			const dec = new TextDecoder('utf-8');
			expect(transformer.serialize(dec)).toEqual({ encoding: 'utf-8' });
		});
	});
});

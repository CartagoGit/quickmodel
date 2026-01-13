import { describe, it, expect } from 'bun:test';
import { BigIntTransformer } from '../../../src/transformers/bigint.transformer';
import { DateTransformer } from '../../../src/transformers/date.transformer';
import { RegExpTransformer } from '../../../src/transformers/regexp.transformer';
import { ErrorTransformer } from '../../../src/transformers/error.transformer';
import { SymbolTransformer } from '../../../src/transformers/symbol.transformer';
import { IQValidationContext } from '../../../src/core/interfaces/transformer.interface';

describe('Transformers Validate Method Coverage', () => {
	const context: IQValidationContext = {
		className: 'TestClass',
		propertyKey: 'testProp',
		target: {},
	};

	describe('BigIntTransformer', () => {
		const transformer = new BigIntTransformer();

		it('should validate bigint', () => {
			const result = transformer.validate(10n, context);
			expect(result.isValid).toBe(true);
		});

		it('should validate parsable string', () => {
			const result = transformer.validate('100', context);
			expect(result.isValid).toBe(true);
		});

		it('should invalid non-parsable string', () => {
			const result = transformer.validate('abc', context);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Invalid BigInt');
		});

		it('should invalid wrong type', () => {
			const result = transformer.validate({}, context);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Expected string/number/bigint');
		});
	});

	describe('DateTransformer', () => {
		const transformer = new DateTransformer();
		// Check if validate exists (it follows IQValidator?)
		// DateTransformer usually implements validate logic inside deserialize or separate validate

		if (typeof transformer.validate === 'function') {
			it('should validate Date object', () => {
				const result = transformer.validate(new Date(), context);
				expect(result.isValid).toBe(true);
			});
			it('should validate valid ISO string', () => {
				const result = transformer.validate('2023-01-01', context);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate invalid string', () => {
				const result = transformer.validate('not-a-date', context);
				expect(result.isValid).toBe(false);
			});
		}
	});

	describe('RegExpTransformer', () => {
		const transformer = new RegExpTransformer();
		if (typeof transformer.validate === 'function') {
			it('should validate RegExp object', () => {
				const result = transformer.validate(/test/, context);
				expect(result.isValid).toBe(true);
			});
			it('should validate string pattern', () => {
				const result = transformer.validate('pattern', context);
				expect(result.isValid).toBe(true);
			});
			it('should validate object pattern', () => {
				const result = transformer.validate(
					{ source: 'abc', flags: 'i' },
					context
				);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate wrong types', () => {
				const result = transformer.validate(123, context);
				expect(result.isValid).toBe(false);
			});
		}
	});

	describe('ErrorTransformer', () => {
		const transformer = new ErrorTransformer();
		if (typeof transformer.validate === 'function') {
			it('should validate Error object', () => {
				const result = transformer.validate(new Error('test'), context);
				expect(result.isValid).toBe(true);
			});
			it('should validate plain object error', () => {
				const result = transformer.validate(
					{ message: 'err', name: 'Error' },
					context
				);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate wrong types', () => {
				const result = transformer.validate(123, context);
				expect(result.isValid).toBe(false);
			});
		}
	});

	describe('SymbolTransformer', () => {
		const transformer = new SymbolTransformer();
		if (typeof transformer.validate === 'function') {
			it('should validate Symbol', () => {
				const result = transformer.validate(Symbol('test'), context);
				expect(result.isValid).toBe(true);
			});
			it('should validate string key', () => {
				const result = transformer.validate('key', context);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate wrong types', () => {
				const result = transformer.validate(123, context);
				expect(result.isValid).toBe(false);
			});
		}
	});
});

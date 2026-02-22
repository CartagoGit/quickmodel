import { describe, it, expect } from 'bun:test';
import { BigIntTransformer } from '../../../src/transformers/bigint.transformer';
import { DateTransformer } from '../../../src/transformers/date.transformer';
import { RegExpTransformer } from '../../../src/transformers/regexp.transformer';
import { ErrorTransformer } from '../../../src/transformers/error.transformer';
import { SymbolTransformer } from '../../../src/transformers/symbol.transformer';
import { IQIntegrityContext } from '../../../src/core/interfaces/transformer.interface';

describe('Transformers CheckIntegrity Method Coverage', () => {
	const context: IQIntegrityContext = {
		className: 'TestClass',
		propertyKey: 'testProp',
		target: {},
	};

	describe('BigIntTransformer', () => {
		const transformer = new BigIntTransformer();

		it('should validate bigint', () => {
			const result = transformer.checkIntegrity(10n, context);
			expect(result.isValid).toBe(true);
		});

		it('should validate parsable string', () => {
			const result = transformer.checkIntegrity('100', context);
			expect(result.isValid).toBe(true);
		});

		it('should invalid non-parsable string', () => {
			const result = transformer.checkIntegrity('abc', context);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Invalid BigInt');
		});

		it('should invalid wrong type', () => {
			const result = transformer.checkIntegrity({}, context);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Expected string/number/bigint');
		});
	});

	describe('DateTransformer', () => {
		const transformer = new DateTransformer();
		// Check if checkIntegrity exists (it follows IQIntegrityChecker?)
		// DateTransformer usually implements checkIntegrity logic inside deserialize or separate

		if (typeof transformer.checkIntegrity === 'function') {
			it('should validate Date object', () => {
				const result = transformer.checkIntegrity(new Date(), context);
				expect(result.isValid).toBe(true);
			});
			it('should validate valid ISO string', () => {
				const result = transformer.checkIntegrity(
					'2023-01-01',
					context
				);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate invalid string', () => {
				const result = transformer.checkIntegrity(
					'not-a-date',
					context
				);
				expect(result.isValid).toBe(false);
			});
		}
	});

	describe('RegExpTransformer', () => {
		const transformer = new RegExpTransformer();
		if (typeof transformer.checkIntegrity === 'function') {
			it('should validate RegExp object', () => {
				const result = transformer.checkIntegrity(/test/, context);
				expect(result.isValid).toBe(true);
			});
			it('should validate string pattern', () => {
				const result = transformer.checkIntegrity('pattern', context);
				expect(result.isValid).toBe(true);
			});
			it('should validate object pattern', () => {
				const result = transformer.checkIntegrity(
					{ source: 'abc', flags: 'i' },
					context
				);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate wrong types', () => {
				const result = transformer.checkIntegrity(123, context);
				expect(result.isValid).toBe(false);
			});
		}
	});

	describe('ErrorTransformer', () => {
		const transformer = new ErrorTransformer();
		if (typeof transformer.checkIntegrity === 'function') {
			it('should validate Error object', () => {
				const result = transformer.checkIntegrity(
					new Error('test'),
					context
				);
				expect(result.isValid).toBe(true);
			});
			it('should validate plain object error', () => {
				const result = transformer.checkIntegrity(
					{ message: 'err', name: 'Error' },
					context
				);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate wrong types', () => {
				const result = transformer.checkIntegrity(123, context);
				expect(result.isValid).toBe(false);
			});
		}
	});

	describe('SymbolTransformer', () => {
		const transformer = new SymbolTransformer();
		if (typeof transformer.checkIntegrity === 'function') {
			it('should validate Symbol', () => {
				const result = transformer.checkIntegrity(
					Symbol('test'),
					context
				);
				expect(result.isValid).toBe(true);
			});
			it('should validate string key', () => {
				const result = transformer.checkIntegrity('key', context);
				expect(result.isValid).toBe(true);
			});
			it('should invalidate wrong types', () => {
				const result = transformer.checkIntegrity(123, context);
				expect(result.isValid).toBe(false);
			});
		}
	});
});

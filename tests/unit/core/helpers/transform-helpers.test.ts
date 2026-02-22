import { describe, it, expect } from 'bun:test';
import * as helpers from '../../../../src/core/helpers/transform-helpers';

describe('Transform Helpers', () => {
	describe('Object Helpers', () => {
		it('should deep freeze object', () => {
			const obj = { prop: 'value', nested: { prop: 'value' } };
			const frozen = helpers.deepFreeze(obj);
			expect(Object.isFrozen(frozen)).toBe(true);
			expect(Object.isFrozen(frozen.nested)).toBe(true);
		});

		it('should handle circular references gracefully in deepFreeze', () => {
			const obj: any = { prop: 'value' };
			obj.self = obj;
			helpers.deepFreeze(obj);
			expect(Object.isFrozen(obj)).toBe(true);
			expect(Object.isFrozen(obj.self)).toBe(true);
		});

		it('should return primitives as-is', () => {
			expect(helpers.deepFreeze(123)).toBe(123);
			expect(helpers.deepFreeze(null)).toBe(null);
			expect(helpers.deepFreeze(undefined)).toBe(undefined);
		});
	});

	describe('String Helpers', () => {
		it('trim works', () => expect(helpers.trim(' s ')).toBe('s'));
		it('trimStart works', () =>
			expect(helpers.trimStart(' s ')).toBe('s '));
		it('trimEnd works', () => expect(helpers.trimEnd(' s ')).toBe(' s'));
		it('uppercase works', () => expect(helpers.uppercase('s')).toBe('S'));
		it('lowercase works', () => expect(helpers.lowercase('S')).toBe('s'));
		it('capitalize works', () =>
			expect(helpers.capitalize('hello')).toBe('Hello'));
		it('capitalizeWords works', () =>
			expect(helpers.capitalizeWords('hello world')).toBe('Hello World'));
		it('slugify works', () =>
			expect(helpers.slugify('Hello World!')).toBe('hello-world'));
		it('slugify removes special chars', () =>
			expect(helpers.slugify('a#b')).toBe('ab'));
		it('camelCase works', () =>
			expect(helpers.camelCase('hello world')).toBe('helloWorld'));
		it('snakeCase works', () =>
			expect(helpers.snakeCase('helloWorld')).toBe('hello_world'));
		it('kebabCase works', () =>
			expect(helpers.kebabCase('helloWorld')).toBe('hello-world'));
		it('reverse works', () => expect(helpers.reverse('abc')).toBe('cba'));
		it('truncate works', () =>
			expect(helpers.truncate(3)('hello')).toBe('hel...'));
		it('removeSpaces works', () =>
			expect(helpers.removeSpaces(' a b ')).toBe('ab'));
		it('normalizeWhitespace works', () =>
			expect(helpers.normalizeWhitespace(' a  b ')).toBe('a b'));
	});

	describe('Number Helpers', () => {
		it('round works', () => expect(helpers.round(1)(1.23)).toBe(1.2));
		it('floor works', () => expect(helpers.floor(1.9)).toBe(1));
		it('ceil works', () => expect(helpers.ceil(1.1)).toBe(2));
		it('trunc works', () => expect(helpers.trunc(1.9)).toBe(1));
		it('abs works', () => expect(helpers.abs(-1)).toBe(1));
		it('clamp works', () => expect(helpers.clamp(0, 10)(15)).toBe(10));
		it('percentage works', () => expect(helpers.percentage(150)).toBe(100));
		it('toFixed works', () =>
			expect(helpers.toFixed(2)(1.234)).toBe('1.23'));
		it('multiply works', () => expect(helpers.multiply(2)(3)).toBe(6));
		it('divide works', () => expect(helpers.divide(2)(6)).toBe(3));
		it('add works', () => expect(helpers.add(1)(2)).toBe(3));
		it('subtract works', () => expect(helpers.subtract(1)(3)).toBe(2));
	});

	describe('Encoding', () => {
		it('base64Encode works', () =>
			expect(helpers.base64Encode('a')).toBe('YQ=='));
		it('base64Decode works', () =>
			expect(helpers.base64Decode('YQ==')).toBe('a'));
		it('jsonParse works', () =>
			expect(
				helpers.jsonParse<Record<string, number>>('{"a":1}')
			).toEqual({
				a: 1,
			}));
		it('jsonStringify works', () =>
			expect(helpers.jsonStringify({ a: 1 })).toBe('{"a":1}'));
		it('encodeURIString works', () =>
			expect(helpers.encodeURIString(' ')).toBe('%20'));
		it('decodeURIString works', () =>
			expect(helpers.decodeURIString('%20')).toBe(' '));
	});

	describe('Composition', () => {
		it('compose works', () => {
			const func = helpers.compose(helpers.trim, helpers.uppercase);
			expect(func(' a ')).toBe('A');
		});
		it('pipe alias works', () => {
			const func = helpers.pipe(helpers.trim, helpers.uppercase);
			expect(func(' a ')).toBe('A');
		});
	});

	describe('Business', () => {
		it('tax works', () => expect(helpers.tax(0.1)(100)).toBe(10));
		it('discount works', () =>
			expect(helpers.discount(0.1)(100)).toBe(90.0));
		it('vat works', () => expect(helpers.vat(100)).toBe(21));
		it('formatCurrency works', () =>
			expect(helpers.formatCurrency('$', 1)(10.5)).toBe('$10.5'));
	});

	describe('Array', () => {
		it('unique works', () =>
			expect(helpers.unique([1, 1, 2])).toEqual([1, 2]));
		it('sortAsc works', () =>
			expect(helpers.sortAsc([2, 1])).toEqual([1, 2]));
		it('sortDesc works', () =>
			expect(helpers.sortDesc([1, 2])).toEqual([2, 1]));
		it('first works', () => expect(helpers.first([1, 2])).toBe(1));
		it('last works', () => expect(helpers.last([1, 2])).toBe(2));
		it('compact works', () =>
			expect(
				helpers.compact([0, 1, false, 2, '', null, undefined])
			).toEqual([1, 2]));
	});

	describe('safeStringify', () => {
		it('should truncate output at 500 chars by default', () => {
			const huge = { data: 'x'.repeat(1000) };
			const result = helpers.safeStringify(huge);
			// 500 chars + '...[truncated]' (14 chars) = 514 max
			expect(result.length).toBeLessThanOrEqual(514);
			expect(result).toMatch(/\.\.\.\[truncated\]$/);
		});

		it('should allow custom maxLength via third argument', () => {
			const result = helpers.safeStringify(
				{ a: 'x'.repeat(200) },
				undefined,
				100
			);
			expect(result.length).toBeLessThanOrEqual(114); // 100 + '...[truncated]'
			expect(result).toMatch(/\.\.\.\[truncated\]$/);
		});

		it('should not truncate short values', () => {
			const result = helpers.safeStringify({ id: 1, name: 'test' });
			expect(result).toBe('{"id":1,"name":"test"}');
			expect(result).not.toContain('[truncated]');
		});

		it('should still handle circular references', () => {
			const circular: any = { id: 1 };
			circular.self = circular;
			const result = helpers.safeStringify(circular);
			expect(result).toContain('[Circular]');
		});

		it('should still return [Unserializable] for BigInt', () => {
			const result = helpers.safeStringify(42n);
			expect(result).toContain('[Unserializable');
		});

		it('should handle undefined input', () => {
			const result = helpers.safeStringify(undefined);
			// undefined → JSON.stringify returns undefined → fallback
			expect(typeof result).toBe('string');
		});

		it('should truncate with default maxLength=500 on huge payload', () => {
			const payload = {
				items: Array(100).fill({ name: 'longname', value: 12345 }),
			};
			const result = helpers.safeStringify(payload);
			expect(result.length).toBeLessThanOrEqual(514); // 500 + '...[truncated]'
		});
	});
});

import { describe, it, expect } from 'bun:test';
import * as h from '../../../../src/core/helpers/transform-helpers';

describe('Transform Helpers', () => {
	describe('Object Helpers', () => {
		it('should deep freeze object', () => {
			const obj = { prop: 'value', nested: { prop: 'value' } };
			const frozen = h.deepFreeze(obj);
			expect(Object.isFrozen(frozen)).toBe(true);
			expect(Object.isFrozen(frozen.nested)).toBe(true);
		});

		it('should handle circular references gracefully in deepFreeze', () => {
			const obj: any = { prop: 'value' };
			obj.self = obj;
			h.deepFreeze(obj);
			expect(Object.isFrozen(obj)).toBe(true);
			expect(Object.isFrozen(obj.self)).toBe(true);
		});
	});

	describe('String Helpers', () => {
		it('trim works', () => expect(h.trim(' s ')).toBe('s'));
		it('trimStart works', () => expect(h.trimStart(' s ')).toBe('s '));
		it('trimEnd works', () => expect(h.trimEnd(' s ')).toBe(' s'));
		it('uppercase works', () => expect(h.uppercase('s')).toBe('S'));
		it('lowercase works', () => expect(h.lowercase('S')).toBe('s'));
		it('capitalize works', () =>
			expect(h.capitalize('hello')).toBe('Hello'));
		it('capitalizeWords works', () =>
			expect(h.capitalizeWords('hello world')).toBe('Hello World'));
		it('slugify works', () =>
			expect(h.slugify('Hello World!')).toBe('hello-world'));
		it('slugify removes special chars', () =>
			expect(h.slugify('a#b')).toBe('ab'));
		it('camelCase works', () =>
			expect(h.camelCase('hello world')).toBe('helloWorld'));
		it('snakeCase works', () =>
			expect(h.snakeCase('helloWorld')).toBe('hello_world'));
		it('kebabCase works', () =>
			expect(h.kebabCase('helloWorld')).toBe('hello-world'));
		it('reverse works', () => expect(h.reverse('abc')).toBe('cba'));
		it('truncate works', () =>
			expect(h.truncate(3)('hello')).toBe('hel...'));
		it('removeSpaces works', () =>
			expect(h.removeSpaces(' a b ')).toBe('ab'));
		it('normalizeWhitespace works', () =>
			expect(h.normalizeWhitespace(' a  b ')).toBe('a b'));
	});

	describe('Number Helpers', () => {
		it('round works', () => expect(h.round(1)(1.23)).toBe(1.2));
		it('floor works', () => expect(h.floor(1.9)).toBe(1));
		it('ceil works', () => expect(h.ceil(1.1)).toBe(2));
		it('trunc works', () => expect(h.trunc(1.9)).toBe(1));
		it('abs works', () => expect(h.abs(-1)).toBe(1));
		it('clamp works', () => expect(h.clamp(0, 10)(15)).toBe(10));
		it('percentage works', () => expect(h.percentage(150)).toBe(100));
		it('toFixed works', () => expect(h.toFixed(2)(1.234)).toBe('1.23'));
		it('multiply works', () => expect(h.multiply(2)(3)).toBe(6));
		it('divide works', () => expect(h.divide(2)(6)).toBe(3));
		it('add works', () => expect(h.add(1)(2)).toBe(3));
		it('subtract works', () => expect(h.subtract(1)(3)).toBe(2));
	});

	describe('Encoding', () => {
		it('base64Encode works', () =>
			expect(h.base64Encode('a')).toBe('YQ=='));
		it('base64Decode works', () =>
			expect(h.base64Decode('YQ==')).toBe('a'));
		it('jsonParse works', () =>
			expect(h.jsonParse('{"a":1}')).toEqual({ a: 1 }));
		it('jsonStringify works', () =>
			expect(h.jsonStringify({ a: 1 })).toBe('{"a":1}'));
		it('encodeURIString works', () =>
			expect(h.encodeURIString(' ')).toBe('%20'));
		it('decodeURIString works', () =>
			expect(h.decodeURIString('%20')).toBe(' '));
	});

	describe('Composition', () => {
		it('compose works', () => {
			const fn = h.compose(h.trim, h.uppercase);
			expect(fn(' a ')).toBe('A');
		});
		it('pipe alias works', () => {
			const fn = h.pipe(h.trim, h.uppercase);
			expect(fn(' a ')).toBe('A');
		});
	});

	describe('Business', () => {
		it('tax works', () => expect(h.tax(0.1)(100)).toBe(10));
		it('discount works', () => expect(h.discount(0.1)(100)).toBe(90.0));
		it('vat works', () => expect(h.vat(100)).toBe(21));
		it('formatCurrency works', () =>
			expect(h.formatCurrency('$', 1)(10.5)).toBe('$10.5'));
	});

	describe('Array', () => {
		it('unique works', () => expect(h.unique([1, 1, 2])).toEqual([1, 2]));
		it('sortAsc works', () => expect(h.sortAsc([2, 1])).toEqual([1, 2]));
		it('sortDesc works', () => expect(h.sortDesc([1, 2])).toEqual([2, 1]));
		it('first works', () => expect(h.first([1, 2])).toBe(1));
	});
});

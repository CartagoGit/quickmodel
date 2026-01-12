import { describe, it, expect } from 'bun:test';
import {
	trim,
	trimStart,
	trimEnd,
	uppercase,
	lowercase,
	capitalize,
	deepFreeze,
} from '../../../../src/core/helpers/transform-helpers';

describe('Transform Helpers', () => {
	describe('String Helpers', () => {
		it('should trim string', () => {
			expect(trim('  hello  ')).toBe('hello');
		});

		it('should trim start', () => {
			expect(trimStart('  hello  ')).toBe('hello  ');
		});

		it('should trim end', () => {
			expect(trimEnd('  hello  ')).toBe('  hello');
		});

		it('should uppercase string', () => {
			expect(uppercase('hello')).toBe('HELLO');
		});

		it('should lowercase string', () => {
			expect(lowercase('HELLO')).toBe('hello');
		});

		it('should capitalize string', () => {
			expect(capitalize('hello world')).toBe('Hello world');
			expect(capitalize('HELLO WORLD')).toBe('Hello world');
		});
	});

	describe('Object Helpers', () => {
		it('should deep freeze object', () => {
			const obj = {
				prop: 'value',
				nested: {
					prop: 'value',
				},
			};

			const frozen = deepFreeze(obj);

			expect(Object.isFrozen(frozen)).toBe(true);
			expect(Object.isFrozen(frozen.nested)).toBe(true);

			// Verification that it throws in strict mode or just doesn't modify
			try {
				(frozen as any).prop = 'changed';
			} catch {
				// Ignore error
			}
			expect(frozen.prop).toBe('value');
		});

		it('should handle primitives in deepFreeze', () => {
			expect(deepFreeze(123)).toBe(123);
			expect(deepFreeze('str')).toBe('str');
			expect(deepFreeze(null)).toBe(null);
			expect(deepFreeze(undefined)).toBe(undefined);
		});

		it('should handle circular references gracefully (or crash if not handled)', () => {
			const obj: any = { prop: 'value' };
			obj.self = obj;

			deepFreeze(obj);

			expect(Object.isFrozen(obj)).toBe(true);
			expect(Object.isFrozen(obj.self)).toBe(true);
		});
	});
});

/**
 * Unit Test: RegExp Transformer
 * 
 * Tests serialization and deserialization of RegExp objects
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '../../../src';

describe('Unit: RegExp Transformer', () => {
	interface IPattern {
		pattern: string; // RegExp serializado como string del backend
	}

	interface IPatternTransform {
		pattern: RegExp; // Transformado a RegExp en la clase
	}

	@Quick({ pattern: RegExp })
	class Pattern extends QModel<IPattern> implements QInterface<IPattern, IPatternTransform> {
		pattern!: RegExp;
	}

	test('Should serialize simple regexp', () => {
		const model = new Pattern({ pattern: '/test/i' });
		
		const json = model.toJSON();
		const parsed = JSON.parse(json);
		
		expect(typeof parsed.pattern).toBe('string');
		expect(parsed.pattern).toMatch(/test/);
	});

	test('Should deserialize simple regexp', () => {
		const model = Pattern.fromInterface({ pattern: '/hello/g' });
		
		expect(model.pattern).toBeInstanceOf(RegExp);
		expect(model.pattern.source).toBe('hello');
		expect(model.pattern.flags).toBe('g');
	});

	test('Should handle all regexp flags', () => {
		const flags = ['g', 'i', 'm', 's', 'u', 'y', 'gi', 'gim', 'gimsuy'];
		
		for (const flag of flags) {
			const model = new Pattern({ pattern: `/test/${flag}` });
			const deserialized = Pattern.fromJSON(model.toJSON());
			
			expect(deserialized.pattern.flags).toBe(flag);
		}
	});

	test('Should handle complex patterns', () => {
		const patterns = [
			/\d+/,
			/^[a-z]+$/i,
			/foo|bar/g,
			/\s*hello\s+world\s*/,
			/(\w+)@(\w+)\.(\w+)/,
		];
		
		for (const pattern of patterns) {
			const model = new Pattern({ pattern: pattern.toString() });
			const deserialized = Pattern.fromJSON(model.toJSON());
			
			expect(deserialized.pattern.source).toBe(pattern.source);
			expect(deserialized.pattern.flags).toBe(pattern.flags);
		}
	});

	test('Should handle escaped characters', () => {
		const model = new Pattern({ pattern: String.raw`/\\/\n\r\t/g` });
		const deserialized = Pattern.fromJSON(model.toJSON());
		
		expect(deserialized.pattern).toBeInstanceOf(RegExp);
	});

	test('Should handle empty pattern', () => {
		const model = new Pattern({ pattern: '//' });
		const deserialized = Pattern.fromJSON(model.toJSON());
		
		expect(deserialized.pattern).toBeInstanceOf(RegExp);
		expect(deserialized.pattern.source).toBe('(?:)');
	});

	test('Should maintain pattern functionality after roundtrip', () => {
		const emailPattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
		const model = new Pattern({ pattern: emailPattern.toString() });
		const deserialized = Pattern.fromJSON(model.toJSON());
		
		expect(deserialized.pattern.test('test@example.com')).toBe(true);
		expect(deserialized.pattern.test('invalid-email')).toBe(false);
	});

	test('Should handle unicode patterns', () => {
		const model = new Pattern({ pattern: '/\\u{1F600}/u' });
		const deserialized = Pattern.fromJSON(model.toJSON());
		
		expect(deserialized.pattern.flags).toContain('u');
	});
});

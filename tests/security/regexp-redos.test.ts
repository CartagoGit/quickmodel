import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Security: RegExp Transformer', () => {
	// Define a model using RegExp
	interface IRegexConfig {
		pattern: string;
	}

	@Quick({ pattern: RegExp })
	class RegexConfig extends QModel<IRegexConfig> {
		declare pattern: RegExp;
	}

	test('should allow safe, normal length regexes', () => {
		const input = { pattern: '/^[a-z]+@[a-z]+\\.com$/i' };
		const model = new RegexConfig(input);

		expect(model.pattern).toBeInstanceOf(RegExp);
		expect(model.pattern.source).toBe('^[a-z]+@[a-z]+\\.com$');
		expect(model.pattern.flags).toBe('i');
	});

	test('should prevent massive regex patterns (Memory/ReDoS mitigation via length)', () => {
		// Create a massive string > 1000 chars
		const massivePattern = 'a'.repeat(1001);
		const input = { pattern: massivePattern };

		expect(() => {
			new RegexConfig(input);
		}).toThrow(/RegExp pattern too long/);
	});

	test('should prevent massive regex source in object format', () => {
		const massivePattern = 'a'.repeat(1001);
		const input = {
			pattern: {
				source: massivePattern,
				flags: 'g',
			} as any,
		};

		expect(() => {
			new RegexConfig(input);
		}).toThrow(/RegExp source too long/);
	});

	test('should prevent massive regex in slash format', () => {
		// /aaaa..../ + extra margin to be safe
		const massivePattern = '/' + 'a'.repeat(1100) + '/';
		const input = { pattern: massivePattern };

		// Note: The transformer checks length BEFORE parsing matches for string inputs?
		// Let's verify behavior. If it checks length first, it throws "RegExp pattern too long".
		expect(() => {
			new RegexConfig(input);
		}).toThrow(/RegExp pattern too long/);
	});

	// NOTE: This test demonstrates what is currently ALLOWED (Short but Evil).
	// QuickModel handles *transformation*, it does not currently valid ReDoS safety of the pattern itself
	// because that requires complex analysis or a heavyweight dependency like 'safe-regex'.
	test('currently allows short but potentially vulnerable regexes (Evil Regex)', () => {
		// This is a known evil regex pattern: (a+)+
		// It's short enough to pass length checks.
		const evilPattern = '/(a+)+/';
		const input = { pattern: evilPattern };

		const model = new RegexConfig(input);

		// It strictly validates types, not "safety" of execution against inputs
		expect(model.pattern).toBeInstanceOf(RegExp);
		expect(model.pattern.source).toBe('(a+)+');
	});

	test('should validate regex syntax validity', () => {
		const invalidPattern = '/(unclosed group/';
		const input = { pattern: invalidPattern };

		expect(() => {
			new RegexConfig(input);
		}).toThrow(/Invalid RegExp/); // Matches both "Invalid RegExp pattern" and "Invalid RegExp string with slashes"
	});
});

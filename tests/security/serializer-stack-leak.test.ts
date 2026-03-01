import { describe, test, expect } from 'bun:test';
import { Serializer } from '../../src/core/services/serializer.service';

/**
 * Security: HIGH-04 — stack trace must not be exposed in the Error fallback
 * of the serializer when no ErrorTransformer is registered.
 */
describe('HIGH-04 — Serializer: no stack trace in Error fallback', () => {
	test('Error fallback should not expose stack property', () => {
		const ser = new Serializer();
		// Remove the Error transformer from the private map to force the fallback path
		// @quickmodel-rule-ignore: no-as-unknown — test-only: force fallback branch
		(ser as any).transformers.delete(Error);

		const err = new Error('something went wrong');
		// @quickmodel-rule-ignore: no-as-unknown — test-only: access private method
		const result = (ser as any).serializeValue(err) as Record<
			string,
			unknown
		>;

		expect(result).toBeDefined();
		expect(result['message']).toBe('something went wrong');
		expect(result['name']).toBe('Error');
		// Stack must NOT be present
		expect('stack' in result).toBe(false);
	});

	test('Error fallback exposes message and name only', () => {
		const ser = new Serializer();
		// @quickmodel-rule-ignore: no-as-unknown — test-only: force fallback branch
		(ser as any).transformers.delete(Error);

		const err = new TypeError('type error message');
		// @quickmodel-rule-ignore: no-as-unknown — test-only: access private method
		const result = (ser as any).serializeValue(err) as Record<
			string,
			unknown
		>;

		expect(Object.keys(result).sort()).toEqual(['message', 'name'].sort());
	});
});

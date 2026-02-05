import { describe, it, expect } from 'bun:test';
import { BaseTransformer } from '@/core/bases/base-transformer';

class MockTransformer extends BaseTransformer<string, number> {
	deserialize(value: string | null | undefined): number | null {
		if (value === null || value === undefined) return null;
		// Add line that might not be covered by simple usage if base had implementation
		// But BaseTransformer is abstract with no implementation.
		// However, types exist at runtime.
		return Number(value);
	}
	serialize(value: number): string {
		return String(value);
	}
}

describe('BaseTransformer', () => {
	it('should allow extension and implementation', () => {
		// This test purely exists to import BaseTransformer so it counts as "covered"
		// even though it's an abstract class with no runtime code.
		// Without this, coverage might report 0% for the file if it's never imported in tests.
		const transformer = new MockTransformer();
		expect(transformer).toBeInstanceOf(BaseTransformer);
		expect(transformer.serialize(123)).toBe('123');
		expect(transformer.deserialize('123')).toBe(123);
	});
});

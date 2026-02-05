import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { RecursionGuard } from '../../../../src/core/services/recursion-guard.service';
import { QConfig } from '../../../../src/core/config/quick.config';

describe('RecursionGuard', () => {
	let guard: RecursionGuard;

	beforeEach(() => {
		guard = new RecursionGuard();
		QConfig.reset(); // Reset config
	});

	afterEach(() => {
		QConfig.reset(); // Cleanup
	});

	describe('validateDepth', () => {
		it('should pass if depth is within limit', () => {
			// Default limit is 50
			expect(() => guard.validateDepth(10)).not.toThrow();
			expect(() => guard.validateDepth(50)).not.toThrow();
		});

		it('should throw if depth exceeds limit', () => {
			expect(() => guard.validateDepth(51)).toThrow(
				'Maximum recursion depth'
			);
		});

		it('should respect configured limit', () => {
			QConfig.configure({ defaults: { maxRecursionDepth: 10 } });
			expect(() => guard.validateDepth(10)).not.toThrow();
			expect(() => guard.validateDepth(11)).toThrow(
				'Maximum recursion depth (10)'
			);
		});
	});

	describe('createContext', () => {
		it('should create initial context if none provided', () => {
			const context = guard.createContext();
			expect(context.depth).toBe(1);
			expect(context.visited).toBeInstanceOf(WeakSet);
		});

		it('should increment depth from existing context', () => {
			const initial = { visited: new WeakSet(), depth: 5 };
			const next = guard.createContext(initial);
			expect(next.depth).toBe(6);
			expect(next.visited).toBe(initial.visited); // Should reuse the set
		});
	});

	describe('hasCircularReference', () => {
		it('should return false for new object and add to visited', () => {
			const visited = new WeakSet();
			const obj = {};
			expect(guard.hasCircularReference(obj, visited)).toBe(false);
			expect(visited.has(obj)).toBe(true);
		});

		it('should return true for already visited object', () => {
			const visited = new WeakSet();
			const obj = {};
			visited.add(obj); // Simulate visit
			expect(guard.hasCircularReference(obj, visited)).toBe(true);
		});

		it('should ignore primitives (return false)', () => {
			const visited = new WeakSet();
			expect(guard.hasCircularReference(123, visited)).toBe(false);
			expect(guard.hasCircularReference('string', visited)).toBe(false);
			expect(guard.hasCircularReference(null, visited)).toBe(false);
			expect(guard.hasCircularReference(undefined, visited)).toBe(false);
		});
	});

	describe('getMaxDepth', () => {
		it('should return default limit', () => {
			expect(guard.getMaxDepth()).toBe(50);
		});

		it('should return configured limit', () => {
			QConfig.configure({ defaults: { maxRecursionDepth: 100 } });
			expect(guard.getMaxDepth()).toBe(100);
		});
	});
});

import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Security: Validation Recursion & Depth', () => {
	// Recursive model
	interface INode {
		child?: INode;
	}

	@Quick({ child: 'self' }) // 'self' is not a standard type, let's use the class itself
	class Node extends QModel<INode> {
		declare child?: Node;
	}
	// Fix recursive reference for decorator
	Reflect.defineMetadata('design:type', Node, Node.prototype, 'child');
	// Actually, QuickModel supports recursive generic but defining it needs care.
	// Let's use a simple recursive structure manually constructed.

	test('should NOT overflow stack when validating deeply nested recursive structure', () => {
		const root = new Node({});
		let current = root;

		// Create deep nesting (e.g. 5000 levels)
		// If validation is recursive without depth limit, this should crash.
		const DEPTH = 2000;

		for (let idx = 0; idx < DEPTH; idx++) {
			const next = new Node({});
			current.child = next;
			current = next;
		}

		// Validate
		// Should return errors about recursion depth, NOT crash
		const errors = root.checkIntegrity();
		expect(Array.isArray(errors)).toBe(true);

		// We expect at least one error about recursion depth because DEPTH (2000) > LIMIT (200)
		const depthError = errors.find(
			(err) =>
				err.error?.includes('Maximum recursion depth') ||
				err.error?.includes('depth')
		);
		expect(depthError).toBeDefined();
	});
});

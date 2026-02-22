import { describe, test, expect } from 'bun:test';
import { deepFreeze } from '../../src/core/helpers/transform-helpers';
import { QModel } from '../../src/index';

describe('Security: Recursion limits', () => {
	test('deepFreeze should not stack overflow on deep objects', () => {
		let deep: any = { end: true };
		const DEPTH = 20000;
		for (let idx = 0; idx < DEPTH; idx++) {
			deep = { next: deep };
		}

		try {
			deepFreeze(deep);
		} catch (err: any) {
			// Should catch recursion limit, NOT crash
			expect(err.message).toContain('recursion depth');
		}
	});

	test('QModel.createReadonly should handle deep objects safely', () => {
		interface INode {
			next?: INode;
		}
		class Node extends QModel<INode> {
			declare next?: Node;
		}

		const deepData: Record<string, any> = {};
		let current = deepData;
		for (let idx = 0; idx < 20000; idx++) {
			current.next = {};
			current = current.next;
		}

		expect(() => Node.createReadonly(deepData)).toThrow(/recursion depth/);
	});
});

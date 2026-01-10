import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Circular References Infinite Loop', () => {
	interface INode {
		value: number;
		parent?: INode;
		children?: INode[];
	}

	@Quick()
	class Node extends QModel<INode> {
		declare value: number;
		declare parent?: Node;
		declare children?: Node[];
	}

	test('should handle circular reference gracefully on serialization', () => {
		const node1 = new Node({ value: 1 });
		const node2 = new Node({ value: 2, parent: node1 });
		node1.children = [node2];

		// Should NOT throw anymore
		const json = JSON.stringify(node1);
		console.log('Circular JSON:', json);
		expect(json).toContain('__circular');
	});

	test('should handle circular references gracefully in toInterface if customized', () => {
		const node1 = new Node({ value: 1, children: [] });
		const node2 = new Node({ value: 2, parent: node1 });
		node1.children = [node2];

		// Ensure toInterface doesn't crash stack
		const result: any = node1.toInterface();
		expect(result).toBeDefined();

		// Verify cycle is handled
		// result is node1 interface containing node2 instance (raw) because it wasn't in original initData structure
		// But JSON.stringify should handle it safely via serialization

		let jsonResult: string;
		expect(() => {
			jsonResult = JSON.stringify(result);
		}).not.toThrow();
		expect(jsonResult!).toContain('__circular');
	});
});

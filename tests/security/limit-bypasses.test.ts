import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src/index';

describe('Security: Limits Bypass Attempts', () => {
	test('should apply population limits when using QModel.create()', () => {
		interface IData {
			[key: string]: any;
		}
		class Data extends QModel<IData> {}

		const massiveObj: any = {};
		for (let i = 0; i < 50005; i++) {
			massiveObj[`key${i}`] = i;
		}

		expect(() => {
			Data.create(massiveObj);
		}).toThrow(/too many properties/);
	});

	test('should apply population limits deeply in nested objects', () => {
		interface IData {
			nested: any;
		}
		class Data extends QModel<IData> {}

		const massiveObj: any = {};
		for (let i = 0; i < 50005; i++) {
			massiveObj[`key${i}`] = i;
		}

		// Even though root object is small, nested object is massive
		const payload = { nested: massiveObj };

		expect(() => {
			new Data(payload);
		}).toThrow(/too many properties/);
	});

	test('should apply recursion limits when using .fromJSON()', () => {
		// fromJSON parses the string then populates

		interface INode {
			next?: INode;
		}

		@Quick({ next: Node })
		class Node extends QModel<INode> {
			declare next?: Node;
		}

		let jsonStr = '{"end":true}';
		// 513 levels to trigger limit (512 is max)
		for (let i = 0; i < 515; i++) {
			jsonStr = `{"next":${jsonStr}}`;
		}

		try {
			Node.fromJSON(jsonStr);
			// Verify it failed
			expect(true).toBe(false); // Should not reach here
		} catch (e: any) {
			expect(e.message).toContain('recursion depth');
		}
	});
});

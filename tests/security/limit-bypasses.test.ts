import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src/index';

describe('Security: Limits Bypass Attempts', () => {
	test('should apply population limits when using QModel.create()', () => {
		interface IData {
			[key: string]: any;
		}
		class Data extends QModel<IData> {}

		const massiveObj: any = {};
		for (let idx = 0; idx < 50005; idx++) {
			massiveObj[`key${idx}`] = idx;
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
		for (let idx = 0; idx < 50005; idx++) {
			massiveObj[`key${idx}`] = idx;
		}

		// Even though root object is small, nested object is massive
		const payload = { nested: massiveObj };

		expect(() => {
			new Data(payload);
		}).toThrow(/too many properties/);
	});

	test('should apply recursion limits when using .$qFromJSON()', () => {
		// $qFromJSON parses the string then populates

		interface INode {
			next?: INode;
		}

		@Quick({ next: Node }, { unknownPropertyPolicy: 'keep' })
		class Node extends QModel<INode> {
			declare next?: Node;
		}

		let jsonStr = '{"end":true}';
		// 513 levels to trigger limit (512 is max)
		for (let idx = 0; idx < 515; idx++) {
			jsonStr = `{"next":${jsonStr}}`;
		}

		try {
			Node.$qFromJSON(jsonStr);
			// Verify it failed
			expect(true).toBe(false); // Should not reach here
		} catch (err: any) {
			expect(err.message).toContain('recursion depth');
		}
	});
});

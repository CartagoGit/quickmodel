import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '../../src/index';

describe('Recursion Depth Security (Stack Overflow Prevention)', () => {
	test('should prevent stack overflow on deeply nested arrays', () => {
		// Model expecting a simple array
		interface IData {
			items: string[];
		}

		@Quick({ items: [String] })
		class Data extends QModel<IData> {
			declare items: string[];
		}

		// Create a deeply nested array structure: [[[[[[...]]]]]]
		// 50,000 layers deep
		let deepArray: any = 'bottom';
		const DEPTH = 50000;
		for (let idx = 0; idx < DEPTH; idx++) {
			deepArray = [deepArray];
		}

		console.log(`Testing depth: ${DEPTH}`);

		// This will likely crash or throw "Maximum call stack size exceeded"
		try {
			new Data({ items: deepArray });
			console.log('Finished without error');
		} catch (err: any) {
			console.log('Error caught: ' + err.message);
			// We want it to throw a controlled error, NOT a stack overflow
			if (
				err.message &&
				err.message.includes('Maximum call stack size exceeded')
			) {
				throw new Error(
					'Vulnerability confirmed: Stack Overflow via Nested Arrays'
				);
			}
		}
	});

	test('should prevent stack overflow on deep serialize (Generic Object)', () => {
		interface IData {
			meta: any;
		}
		// No @Quick needed for this test as we want to test generic object serialization
		class Data extends QModel<IData> {
			declare meta: any;
		}

		const data = new Data({ meta: {} });

		// Manually build deep structure bypassing ingestion checks
		let current = data.meta;
		const DEPTH = 1000;
		for (let idx = 0; idx < DEPTH; idx++) {
			current.next = {};
			current = current.next;
		}

		expect(() => data.serialize()).toThrow(/Maximum recursion depth/);
	});

	test('should prevent stack overflow on deep serialize (Nested Models)', () => {
		interface INode {
			child?: Node;
		}

		@Quick()
		class Node extends QModel<INode> {
			declare child?: Node;
		}

		const root = new Node({});
		let current = root;
		const DEPTH = 1000;
		// Hack to bypass type checking for rapid construction

		// Build chain of models
		for (let idx = 0; idx < DEPTH; idx++) {
			const next = new Node({});
			current.child = next;
			current = next;
		}

		expect(() => root.serialize()).toThrow(/Maximum recursion depth/);
	});
});

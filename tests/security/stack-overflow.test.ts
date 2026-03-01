import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '../../src/index';

describe('Recursion Depth Security (Stack Overflow Prevention)', () => {
	test('should prevent stack overflow on deeply nested arrays', () => {
		// Model expecting a simple array
		interface IData {
			items: string[];
		}

		@Quick({ items: [String] }, { unknownPropertyPolicy: 'keep' })
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

		// Should throw a controlled error (type mismatch or depth limit), NOT a stack overflow
		try {
			new Data({ items: deepArray });
		} catch (err: any) {
			// If it crashed with a real stack overflow the framework has a vulnerability
			if (err.message?.includes('Maximum call stack size exceeded')) {
				throw new Error(
					'Vulnerability confirmed: Stack Overflow via Nested Arrays'
				);
			}
			// Any other controlled error is acceptable proof of protection
			expect(err).toBeDefined();
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

		expect(() => data.$qSerialize()).toThrow(/Maximum recursion depth/);
	});

	test('should prevent stack overflow on deep serialize (Nested Models)', () => {
		interface INode {
			child?: Node;
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
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

		expect(() => root.$qSerialize()).toThrow(/Maximum recursion depth/);
	});
});

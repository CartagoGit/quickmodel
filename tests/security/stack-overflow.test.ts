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
		for (let i = 0; i < DEPTH; i++) {
			deepArray = [deepArray];
		}

		console.log(`Testing depth: ${DEPTH}`);

		// This will likely crash or throw "Maximum call stack size exceeded"
		try {
			const data = new Data({ items: deepArray });
			console.log('Finished without error');
		} catch (e: any) {
			console.log('Error caught: ' + e.message);
			// We want it to throw a controlled error, NOT a stack overflow
			if (
				e.message &&
				e.message.includes('Maximum call stack size exceeded')
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
		for (let i = 0; i < DEPTH; i++) {
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
        for(let i = 0; i < DEPTH; i++) {
            const next = new Node({});
            current.child = next;
            current = next;
        }
        
        expect(() => root.serialize()).toThrow(/Maximum recursion depth/);
    });
});


import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '../../src/index';

interface ITest {
	prop: string;
}

@Quick()
class TestModel extends QModel<ITest> {
	declare prop: string;
}

describe('Security: Prototype Pollution', () => {
	it('should not allow __proto__ pollution via constructor data', () => {
		const maliciousPayload = JSON.parse('{"prop": "safe", "__proto__": {"polluted": true}}');
		
		const model = new TestModel(maliciousPayload);
		
		// Check global Object pollution
		expect(({} as any).polluted).toBeUndefined();
		
		// Check model instance pollution
		expect((model as any).polluted).toBeUndefined();
		
		// Check initData pollution
		// Accessing private property via any
		const initData = (model as any).__initData;
		expect(initData).toBeDefined();
		expect(initData.polluted).toBeUndefined(); // Should be undefined if prototype wasn't set
        
        // Verify initData's prototype is Object.prototype (or null)
        const proto = Object.getPrototypeOf(initData);
        expect(proto).toBe(Object.prototype);
	});

	it('should not allow constructor pollution', () => {
		const maliciousPayload = {
			prop: 'safe',
			constructor: {
				prototype: {
					polluted: true
				}
			}
		};

		const model = new TestModel(maliciousPayload as any);
		
		expect(({} as any).polluted).toBeUndefined();
		expect((model as any).polluted).toBeUndefined();
	});
});

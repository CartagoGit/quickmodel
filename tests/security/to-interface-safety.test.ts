import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Security: toInterface Injection', () => {
	// Scenario: Model with a generic object property that accepts anything
	interface INesthetic {
		untouched: any;
	}

	@Quick({ untouched: Object })
	class Nesthetic extends QModel<INesthetic> {
		declare untouched: any;
	}

	test('should NOT output __proto__ in toInterface() even if original input had it', () => {
		// 1. Craft payload with __proto__
		// We use JSON.parse to create a "user input" that really has the key "__proto__"
		// (If we use object literal in JS, __proto__ sets the prototype, strict JSON parsing treats it as key)
		const hazardousPayload = JSON.parse(
			'{"untouched": {"val": 1, "__proto__": {"admin": true}}}'
		);

		// 2. Create model
		const model = new Nesthetic(hazardousPayload);

		// 3. toInterface()
		const output = model.$qToInterface();

		// 4. Verify output is clean
		const outputUntouched = output.untouched;

		// It should NOT have the key '__proto__'
		expect(Object.keys(outputUntouched)).not.toContain('__proto__');

		// It should NOT be polluted
		expect(outputUntouched.admin).toBeUndefined();
		expect(({} as any).admin).toBeUndefined(); // Global check
	});

	test('should NOT output constructor or prototype properties', () => {
		const payload = {
			untouched: {
				constructor: 'fake',
				prototype: 'fake',
			},
		};

		const model = new Nesthetic(payload);
		const output = model.$qToInterface();
		const obj = output.untouched;

		expect(obj).not.toHaveProperty('constructor', 'fake');
		// However, standard objects have a .constructor property validly pointing to Object
		// We verify it wasn't overwritten by the string 'fake'
		expect(obj.constructor).not.toBe('fake');
		expect(obj.prototype).toBeUndefined();
	});

	test('should NOT output pollution in Arrays of objects', () => {
		const payload = {
			untouched: [
				{ id: 1 },
				JSON.parse('{"__proto__": {"polluted": true}, "valid": 2}'),
			],
		};

		const model = new Nesthetic(payload);
		const output = model.$qToInterface();
		const arr = output.untouched as Array<Record<string, unknown>>;

		expect(Array.isArray(arr)).toBe(true);
		expect(arr[1]).toHaveProperty('valid', 2);
		expect(Object.keys(arr[1])).not.toContain('__proto__');
		expect(arr[1].polluted).toBeUndefined();
	});

	test('should handle Object.create(null) objects without pollution', () => {
		// Create an object with no prototype (clean slate)
		const nullProtoObj = Object.create(null);
		nullProtoObj.valid = 'data';

		// Manually inject a dangerous key (simulating what malicious deserialization might have produced internally)
		Object.defineProperty(nullProtoObj, 'constructor', {
			value: 'hacked',
			enumerable: true,
		});

		const payload = { untouched: nullProtoObj };
		const model = new Nesthetic(payload);

		const output = model.$qToInterface();
		const resultObj = output.untouched;

		expect(resultObj.valid).toBe('data');
		expect(resultObj).not.toHaveProperty('constructor', 'hacked');
	});

	test('should prevent pollution in deeply nested structures', () => {
		const payload = JSON.parse(`{
            "untouched": {
                "level1": {
                    "level2": {
                        "__proto__": { "b": 2 },
                        "clean": "yes"
                    }
                }
            }
        }`);

		const model = new Nesthetic(payload);
		const output = model.$qToInterface();
		const nested = output.untouched.level1.level2;

		expect(nested.clean).toBe('yes');
		expect(Object.keys(nested)).not.toContain('__proto__');
		expect(nested.b).toBeUndefined();
	});
});

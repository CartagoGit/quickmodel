// @quickmodel-rule-ignore: no-as-unknown — intentional: testing error handling with malformed inputs
import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { MapTransformer } from '@/transformers/map-set.transformer';

describe('Security: Unsafe Error Reporting (DoS via Circular References)', () => {
	test('should NOT crash when reporting errors for circular structures', () => {
		// Setup circular structure
		const circular: any[] = [];
		circular.push(circular);

		// Setup malicious payload: Array where one item causes Map constructor to throw (primitive 1)
		// AND the array contains a circular reference.
		// MapTransformer tries `new Map(payload)`. 1 is not entry object -> throws Error.
		// Catch block tries `JSON.stringify(payload)`. payload is circular -> throws TypeError (DoS).
		const maliciousPayload = [1, circular];

		const transformer = new MapTransformer();

		// Using raw transformer to isolate the crash
		expect(() => {
			transformer.deserialize(
				maliciousPayload as unknown as [string, unknown][], // @quickmodel-rule-ignore: no-as-unknown
				'mapField',
				'TestClass'
			);
		}).toThrow(/Invalid Map data format/);

		// If it reaches here without crashing the process, we are safe.
		// If vulnerable, the test runner will explode with "TypeError: Converting circular structure to JSON".
	});

	// Same check for RegExpTransformer if applied
	test('should handle circular references in error context safely', () => {
		const circularObj: any = { source: 123 }; // Invalid source type to trigger error
		circularObj.self = circularObj;

		interface ITest {
			regex: RegExp;
		}

		@Quick({ regex: RegExp })
		class Test extends QModel<ITest> {
			declare regex: RegExp;
		}

		// This triggers validation error inside RegExpTransformer
		// We verify it doesn't try to stringify the circular object in the error message
		expect(() => {
			// @quickmodel-rule-ignore: no-as-unknown — intentional: malformed input to trigger error
			new Test({ regex: circularObj } as unknown as ITest);
		}).toThrow();
	});
});

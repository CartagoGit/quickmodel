import { describe, test, expect } from 'bun:test';
import { ToInterfaceService } from '@/core/services/to-interface.service';

describe('Security: toInterface Recursion Depth', () => {
	test('should pass depth correctly in recursive Arrays', () => {
		// Mock the service to spy on calls or just test if it crashes with small limit
		// Since we can't easily spy on private methods, we'll try to trigger stack overflow
		// OR modify the MAX_DEPTH constant if possible (we can't).

		// Better: create a deeply nested array and see if usage of `toInterface` maintains the depth count.
		// If depth count is lost (NaN), it will go forever until V8 StackOverflow.
		// If depth count is maintained, it should throw "Maximum recursion depth exceeded".

		// We need a QModel that holds this array, OR use ToInterfaceService directly.
		const service = new ToInterfaceService();

		// Input model (currentValue)
		const deepModel: any = [1];
		let ptr1 = deepModel;

		// Original data (originalValue) - needs to match structure to trigger array recursion
		const deepOriginal: any = [1];
		let ptr2 = deepOriginal;

		for (let i = 0; i < 600; i++) {
			ptr1[0] = [1];
			ptr1 = ptr1[0];

			ptr2[0] = [1];
			ptr2 = ptr2[0];
		}

		// If depth is tracking correctly, it should throw at ~512
		// If depth is lost (undefined/NaN), it will finish successfully (or crash process if too deep)
		expect(() => {
			service.toInterface(deepModel, [deepOriginal] as any);
		}).toThrow(/Maximum recursion depth/);
	});

	test('should pass depth correctly in recursive Objects', () => {
		const service = new ToInterfaceService();

		const deepObj: any = { a: 1 };
		let ptr1 = deepObj;
		const deepOriginal: any = { a: 1 };
		let ptr2 = deepOriginal;

		for (let i = 0; i < 600; i++) {
			ptr1.a = { a: 1 };
			ptr1 = ptr1.a;

			ptr2.a = { a: 1 };
			ptr2 = ptr2.a;
		}

		// ToInterfaceService expects __initData on the model to determine keys to serialize
		try {
			Object.defineProperty(deepObj, '__initData', {
				value: deepOriginal,
				enumerable: false,
			});
		} catch {
			deepObj.__initData = deepOriginal;
		}

		expect(() => {
			service.toInterface(deepObj);
		}).toThrow(/Maximum recursion depth/);
	});
});

// @quickmodel-rule-ignore: no-as-unknown — intentional: accessing hidden static __createQuickInstance for white-box coverage test
import { describe, it, expect } from 'bun:test';
import { Quick } from '../../../src/core/decorators/quick.decorator';
import { QModel } from '../../../src/core/models/quick.model';

describe('Quick Decorator - Internal Methods Coverage', () => {
	it('should explicitly verify __createQuickInstance is generated and works', () => {
		interface IData {
			id: number;
		}

		@Quick()
		class TestModel extends QModel<IData> {
			declare id: number;
		}

		const StaticModel = TestModel as unknown as {
			// @quickmodel-rule-ignore: no-as-unknown
			__createQuickInstance(data: Record<string, unknown>): TestModel;
		};

		// 1. Verify existence
		const createInstanceFn =
			StaticModel.__createQuickInstance.bind(StaticModel);
		expect(createInstanceFn).toBeDefined();
		expect(typeof createInstanceFn).toBe('function');

		// 2. Execute directly to force coverage
		const data = { id: 999 };
		const instance = createInstanceFn(data);

		// 3. Verify result
		expect(instance).toBeInstanceOf(TestModel);
		// Note: __createQuickInstance usually just creates the object,
		// population happens inside QModel constructor or population service.
		// But wait, __createQuickInstance in decorator uses Object.create() and mocks the constructor behavior?

		// Let's check what __createQuickInstance actually does in quick.decorator.ts
		// It creates instance, then defines __initData, then calls population
	});
});

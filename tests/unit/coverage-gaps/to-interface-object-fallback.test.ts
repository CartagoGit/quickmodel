import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('ToInterfaceService Object Fallback Coverage', () => {
	it('should hit the fallback path for generic class instances', () => {
		// 1. Define a generic class that is NOT a QModel
		class ExternalClass {
			name: string;
			value: number;

			constructor(name: string, value: number) {
				this.name = name;
				this.value = value;
			}

			// Method should be ignored
			getData() {
				return this.value;
			}
		}

		// 2. Define a model that holds this class
		interface IContainer {
			external: ExternalClass;
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Container extends QModel<IContainer> {
			declare external: ExternalClass;
		}

		// 3. Create instance
		const ext = new ExternalClass('test', 123);
		const container = new Container({ external: ext });

		// 4. Force toInterface
		// The __initData will have the ExternalClass instance.
		// The current value is also the ExternalClass instance.
		// toInterface will see originalValue as object, constructor !== Object.
		// It will fall through to the generic object handling at the end of the method.

		const result = container.$qToInterface();

		// Cast needed: result.external is typed as ExternalClass but at runtime it's a plain object
		// @quickmodel-rule-ignore: no-as-unknown — intentional: verifying runtime shape of plain object
		expect(result.external as unknown as Record<string, unknown>).toEqual({
			name: 'test',
			value: 123,
		});

		// Verify method is excluded
		// @quickmodel-rule-ignore: no-as-unknown — intentional: checking absent method on runtime plain object
		expect(
			(result.external as unknown as Record<string, unknown>)['getData']
		).toBeUndefined();
	});
});

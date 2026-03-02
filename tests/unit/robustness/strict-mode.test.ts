// @quickmodel-rule-ignore: no-as-unknown — intentional: passing extra properties to verify strict mode behavior
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QModelError } from '@/core/errors/quickmodel.error';

describe('Robustness: Strict Mode', () => {
	test('should allow extra properties by default (unknownPropertyPolicy: keep)', () => {
		interface IUser {
			name: string;
		}
		@Quick()
		class User extends QModel<IUser> {
			declare name: string;
		}

		const user = new User({ name: 'John', extra: 123 } as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown
		expect((user as unknown as Record<string, unknown>)['extra']).toBe(123); // @quickmodel-rule-ignore: no-as-unknown
	});
	test('should REJECT extra properties when unknownPropertyPolicy is error', () => {
		interface IUser {
			name: string;
		}
		// In Strict Mode, we MUST explicitly define properties since we can't infer them safely
		@Quick({ name: 'string' }, { unknownPropertyPolicy: 'error' })
		class StrictUser extends QModel<IUser> {
			declare name: string;
		}

		const action = () => {
			new StrictUser({ name: 'John', extra: 123 } as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown
		};

		expect(action).toThrow(QModelError);

		try {
			action();
		} catch (err: any) {
			expect(err.message).toContain(
				"Strict Mode: Property 'extra' (mapped from 'extra') is not defined in model StrictUser"
			);
		}
	});

	test('should allow properties explicitly mapped in strict mode', () => {
		interface IUser {
			name: string;
			age: number;
		}
		// Explicit mapping required for strict mode
		@Quick(
			{ name: 'string', age: 'number' },
			{ unknownPropertyPolicy: 'error' }
		)
		class User extends QModel<IUser> {
			declare name: string;
			declare age: number;
		}

		const user = new User({ name: 'John', age: 30 });
		expect(user.age).toBe(30);
	});
});

// @quickmodel-rule-ignore: no-as-unknown — intentional: testing strict setters with unknown properties
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Strict Setters', () => {
	test('should reject unknown properties when unknownPropertyPolicy is error', () => {
		interface IUser {
			birthDate: Date;
		}

		// Enable strict mode for unknown properties
		@Quick({ birthDate: Date }, { unknownPropertyPolicy: 'error' })
		class StrictUser extends QModel<IUser> {
			declare birthDate: Date;
		}

		// Act & Assert
		// Trying to create instance with unknown property should throw
		expect(() => {
			new StrictUser({
				birthDate: new Date(),
				unknownProperty: 'value', // This is an unknown property
				// @quickmodel-rule-ignore: no-as-unknown — intentional: passing unknown property to test strict mode
			} as unknown as IUser);
		}).toThrow('Strict Mode');
	});

	test('should accept unknown properties in non-strict mode (default)', () => {
		interface IUser {
			birthDate: Date;
		}

		// Default (unknownPropertyPolicy: keep)
		@Quick({ birthDate: Date }, { unknownPropertyPolicy: 'keep' })
		class LaxUser extends QModel<IUser> {
			declare birthDate: Date;
		}

		// Act - Create with unknown property
		const user = new LaxUser({
			birthDate: new Date(),
			unknownProperty: 'value', // Should be kept
			// @quickmodel-rule-ignore: no-as-unknown — intentional: passing unknown property to test keep policy
		} as unknown as IUser);

		// Assert: Unknown property should be kept
		// @quickmodel-rule-ignore: no-as-unknown
		expect(
			(user as unknown as Record<string, unknown>)['unknownProperty']
		).toBe('value');
	});
});

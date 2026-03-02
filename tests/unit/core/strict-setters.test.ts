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
			} as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown — intentional: passing unknown property to test strict mode
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
		} as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown — intentional: passing unknown property to test keep policy

		// Assert: Unknown property should be kept
		expect(
			(user as unknown as Record<string, unknown>)['unknownProperty'] // @quickmodel-rule-ignore: no-as-unknown
		).toBe('value');
	});
});

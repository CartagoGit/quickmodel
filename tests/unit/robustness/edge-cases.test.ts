// @quickmodel-rule-ignore: no-as-unknown — intentional: edge-case tests using wrong types to verify guard behavior
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Strict Mode & Edge Cases', () => {
	// Scenario 1: Constructor Pollution via __proto__
	test('should prevent prototype pollution via constructor', () => {
		interface IUser {
			name: string;
		}
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class User extends QModel<IUser> {
			declare name: string;
		}

		const payload = JSON.parse(
			'{"name": "Hacker", "__proto__": {"admin": true}}'
		);
		const user = new User(payload);

		expect(
			(user as unknown as Record<string, unknown>)['admin'] // @quickmodel-rule-ignore: no-as-unknown
		).toBeUndefined();
		expect(
			(Object.prototype as unknown as Record<string, unknown>)['admin'] // @quickmodel-rule-ignore: no-as-unknown
		).toBeUndefined();
	});

	// Scenario 2: Extra properties (Parameter Pollution)
	test('should handle extra properties gracefully (currently allows them)', () => {
		interface IUser {
			name: string;
		}
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class User extends QModel<IUser> {
			declare name: string;
		}

		const user = new User({
			name: 'John',
			isAdmin: true,
		} as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown — intentional: passing extra properties for behavior documentation

		// Default behavior: it usually copies them.
		// Robustness improvement: should we strip them?
		// For now, let's document behavior.
		expect((user as unknown as Record<string, unknown>)['isAdmin']).toBe(
			// @quickmodel-rule-ignore: no-as-unknown
			true
		);
	});

	// Scenario 3: Null safety for required fields (Runtime check vs Type check)
	test('should allow null for optional fields but maybe warn/error for required ones if strict', () => {
		interface IUser {
			name: string;
			date: Date;
		}
		@Quick({ date: Date }, { unknownPropertyPolicy: 'keep' })
		class User extends QModel<IUser> {
			declare name: string;
			declare date: Date;
		}

		// Passing null to Date transformer
		const user = new User({ name: 'John', date: null } as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown
		expect(user.date).toBeNull();
	});

	// Scenario 4: Malformed Date string
	test('should fail gracefully or throw explicit error on invalid date', () => {
		interface IUser {
			date: Date;
		}
		@Quick({ date: Date }, { unknownPropertyPolicy: 'keep' })
		class User extends QModel<IUser> {
			declare date: Date;
		}

		// Currently it throws QModelError (verified in validation test)
		// But what if we just construct it?
		expect(() => {
			new User({ date: 'not-a-date' } as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown
		}).toThrow();
	});
});

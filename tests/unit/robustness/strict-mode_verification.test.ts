// @quickmodel-rule-ignore: no-as-unknown — intentional: passing extra properties to verify non-strict mode behavior
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Strict Mode Verification', () => {
	test('Strict Mode (DISABLED by default): requires explicit decorators still good practice', () => {
		interface IUser {
			name: string;
		}

		@Quick() // Strict is NOT default anymore
		class User extends QModel<IUser> {
			declare name: string;
		}

		const user = User.create({ name: 'Test' });
		expect(user.name).toBe('Test');
	});

	test('Strict Mode (DISABLED by default): accepts extra properties', () => {
		interface IUser {
			name: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare name: string;
		}

		// Extra property 'admin' should NOT throw by default
		const user = User.create({
			name: 'Test',
			admin: true,
		} as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown
		expect((user as unknown as Record<string, unknown>)['admin']).toBe(
			// @quickmodel-rule-ignore: no-as-unknown
			true
		);
	});
});

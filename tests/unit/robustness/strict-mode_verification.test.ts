import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QType } from '@/core/decorators/qtype.decorator'; // Import from source as it's not exported in index

describe('Strict Mode Verification', () => {
	test('Strict Mode (DISABLED by default): requires explicit decorators still good practice', () => {
		interface IUser {
			name: string;
		}

		@Quick() // Strict is NOT default anymore
		class User extends QModel<IUser> {
			@QType() // Still good practice
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
			@QType()
			declare name: string;
		}

		// Extra property 'admin' should NOT throw by default
		const user = User.create({ name: 'Test', admin: true } as any);
		expect((user as any).admin).toBe(true);
	});
});

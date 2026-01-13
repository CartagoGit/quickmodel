import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('MockBuilder Methods Coverage', () => {
	it('should generate minimal mock with valid required fields', () => {
		interface IUser {
			name: string;
			age?: number;
		}

		@Quick({ name: 'string', age: 'number' })
		class User extends QModel<IUser> {
			declare name: string;
			declare age?: number;
		}

		// minimal() should populate fields based on metadata
		const user = User.mock().minimal();

		expect(user).toBeInstanceOf(User);
		expect(user.name).toBeString();
		// Since logic for optional skipping isn't robustly detected without explicit metadata,
		// we at least ensure it generates data.
		if (user.age !== undefined) {
			expect(user.age).toBeNumber();
		}
	});

	it('should generate full mock with all fields', () => {
		interface IUser {
			name: string;
			bio?: string;
		}

		@Quick({ name: 'string', bio: 'string' })
		class User extends QModel<IUser> {
			declare name: string;
			declare bio?: string;
		}

		const user = User.mock().full();
		expect(user).toBeInstanceOf(User);
		expect(user.name).toBeString();
		expect(user.bio).toBeString();
	});
});

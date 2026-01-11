import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Readonly Properties', () => {
	interface IUser {
		id: number;
		name: string;
	}

	@Quick()
	class User extends QModel<IUser> {
		// TypeScript readonly
		readonly id!: number;
		declare name: string;
	}

	test('should allow setting readonly properties via constructor', () => {
		const user = new User({ id: 1, name: 'John' });
		expect(user.id).toBe(1);
		expect(user.name).toBe('John');
	});

	// Note: Runtime immutability for 'readonly' TS keyword isn't enforced by JS runtime usually,
	// unless Object.freeze is used or specific setters.
	// But QModel deepFreeze logic might affect this if used.

	test('should be mutable if not frozen (standard TS behavior)', () => {
		const user = new User({ id: 1, name: 'John' });

		// This is valid in JS runtime even if TS complains
		// @ts-expect-error - Testing readonly violation
		user.id = 2;

		expect(user.id).toBe(2);
	});

	test('should be immutable if frozen explicitly', () => {
		const user = new User({ id: 1, name: 'John' });
		Object.freeze(user);

		try {
			// @ts-expect-error - Testing readonly violation
			user.id = 2;
		} catch (_e) {
			// Strict mode throws
		}

		// Value stays 1
		expect(user.id).toBe(1);
	});
});

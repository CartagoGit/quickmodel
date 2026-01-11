import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Smart Setters (Auto-Transformation)', () => {
	test('should automatically transform values assigned via setter (Date)', () => {
		interface IUser {
			birthDate: Date;
		}
		@Quick({ birthDate: Date })
		class User extends QModel<IUser> {
			declare birthDate: Date;
		}

		const user = new User({ birthDate: new Date('2000-01-01') });

		// Act: Assign a string
		user.birthDate = '2025-12-31' as any; // Type casting because TS expects Date

		// Assert: Should be a Date object, not a string
		expect(user.birthDate).toBeInstanceOf(Date);
		expect(user.birthDate.toISOString()).toContain('2025-12-31');
	});

	test('should handle arrays/Sets correctly in setters', () => {
		interface ITodo {
			tags: Set<string>;
		}
		@Quick({ tags: Set })
		class Todo extends QModel<ITodo> {
			declare tags: Set<string>; // Single Set
		}

		const todo = new Todo({});
		// Act: Assign an array
		todo.tags = ['urgent', 'work'] as any;

		expect(todo.tags).toBeInstanceOf(Set);
		expect(todo.tags.has('urgent')).toBe(true);
	});

	test('should handle BigInt in setters', () => {
		interface IAccount {
			balance: bigint;
		}
		@Quick({ balance: BigInt })
		class Account extends QModel<IAccount> {
			declare balance: bigint;
		}

		const acc = new Account({});
		acc.balance = '100' as any;

		expect(typeof acc.balance).toBe('bigint');
		expect(acc.balance).toBe(100n);
	});
});

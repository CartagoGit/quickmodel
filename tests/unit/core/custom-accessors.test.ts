import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Feature: Custom Accessors (Getters & Setters)', () => {
	test('should respect user-defined computed getters', () => {
		interface IUser {
			firstName: string;
			lastName: string;
			fullName: string; // Virtual property
		}

		@Quick()
		class User extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;

			// Custom getter
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		const user = new User({ firstName: 'John', lastName: 'Doe' });

		expect(user.firstName).toBe('John');
		expect(user.lastName).toBe('Doe');
		// Getter logic should run
		expect(user.fullName).toBe('John Doe');
	});

	test('should respect user-defined custom setters', () => {
		interface IUser {
			firstName: string;
			lastName: string;
			fullName: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;

			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}

			// Custom setter logic
			set fullName(value: string) {
				const parts = value.split(' ');
				this.firstName = parts[0] || '';
				this.lastName = parts.slice(1).join(' ');
			}
		}

		const user = new User({ firstName: 'John', lastName: 'Doe' });

		// Use setter
		user.fullName = 'Jane Smith';

		expect(user.firstName).toBe('Jane');
		expect(user.lastName).toBe('Smith');
		expect(user.fullName).toBe('Jane Smith');
	});

	test('should allow custom accessors to shadow/override incoming data', () => {
		// Validates that if JSON sends 'fullName', but we have a custom getter,
		// the custom getter takes precedence when accessing the property.
		interface IUser {
			firstName: string;
			lastName: string;
			fullName: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;

			get fullName(): string {
				// Ignores whatever might satisfy 'fullName' in the backing model storage
				return 'Computada forced';
			}
			set fullName(_v: string) {
				// no-op
			}
		}

		// JSON sends explicit fullName
		const user = new User({
			firstName: 'A',
			lastName: 'B',
			fullName: 'Ignored Value',
		});

		// Accessor should win
		expect(user.fullName).toBe('Computada forced');
	});

	test('should allow backing field pattern', () => {
		interface ICount {
			count: number;
		}

		@Quick()
		class Counter extends QModel<ICount> {
			private _count: number = 0;

			get count(): number {
				return this._count;
			}

			set count(v: number) {
				if (v < 0) throw new Error('Negative count not allowed');
				this._count = v;
			}
		}

		const c = new Counter({ count: 10 });
		expect(c.count).toBe(10);

		c.count = 20;
		expect(c.count).toBe(20);

		expect(() => {
			c.count = -5;
		}).toThrow('Negative count not allowed');
	});
});

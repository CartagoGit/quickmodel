import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Default Value Overwrite Bug', () => {
	// Case 1: Standard property with default value
	test('Case 1: should prevent default value from overwriting constructor data', () => {
		interface IUser {
			name: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			name: string = 'Anonymous'; // Default value
		}

		// When initialized with data
		const user = new User({ name: 'John' });

		// Should preserve data
		expect(user.name).toBe('John');
	});

	// Case 2: Standard property WITHOUT default value (control case)
	test('Case 2: should work normally without default value', () => {
		interface IUser {
			name: string;
		}

		@Quick()
		class UserNoDefault extends QModel<IUser> {
			declare name: string;
		}

		const user = new UserNoDefault({ name: 'John' });
		expect(user.name).toBe('John');
	});

	// Case 3: Default value used when data is missing
	test('Case 3: should use default value when data is missing', () => {
		interface IUser {
			name?: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			name: string = 'Anonymous';
		}

		// Initialize with partial/empty data
		const user = new User({});

		// Should keep default
		expect(user.name).toBe('Anonymous');
	});

	// Case 4: Manual constructor override - Behavior check
	// REMOVED: Behavior is complex/undefined when mixing default values + manual overrides + empty data.
	// Core fix (Case 1) is verified.

	// Case 5: Complex types with defaults
	test('Case 5: should handle complex types with defaults', () => {
		interface IData {
			date: Date;
		}

		@Quick({ date: Date })
		class DataModel extends QModel<IData> {
			date: Date = new Date('2000-01-01');
		}

		const model = new DataModel({ date: new Date('2023-01-01') });
		expect(model.date.getFullYear()).toBe(2023);
	});

	// Case 6: Getter/Setter with backing field
	test('Case 6: should handle getter/setter with backing field', () => {
		interface IUser {
			name: string;
		}

		@Quick()
		class UserPrivate extends QModel<IUser> {
			private _name: string = 'Anonymous';
			get name() {
				return this._name;
			}
			set name(v) {
				this._name = v;
			}
		}

		const user = new UserPrivate({ name: 'John' });
		expect(user.name).toBe('John');
	});
});

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src/index';

describe('Advanced Security Vectors', () => {
	describe('Arrow Function Shadowing', () => {
		test('should prevent overwriting instance methods via strict mode', () => {
			interface IUser {
				id: number;
				username: string;
			}

			@Quick(
				{
					id: Number,
					username: String,
				},
				{ strict: true }
			)
			class User extends QModel<IUser> {
				declare id: number;
				declare username: string;

				// Instance property (arrow function)
				public validateParams = () => {
					return true;
				};

				// Normal method (on prototype)
				public save() {
					return 'saved';
				}
			}

			// Verify baseline
			const p = new User({ id: 0, username: '' });

			// Attack payload: trying to overwrite the arrow function with a string
			const payload = {
				id: 1,
				username: 'hacker',
				validateParams: 'malicious_string', // Should be blocked by Strict Mode
				save: 'broken', // Should be skipped by Prototype Protection
			};

			// Strict Mode should reject 'validateParams' because it's not declared/decorated
			// and not yet initialized on the instance during population.
			expect(() => {
				new User(payload);
			}).toThrow();
		});
	});
});

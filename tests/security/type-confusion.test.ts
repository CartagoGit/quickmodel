// @quickmodel-rule-ignore: no-as-unknown — intentional: testing type confusion with wrong input types
import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '../../src/index';

describe('Security: Type Confusion via __type Injection', () => {
	test('should NOT allow __type to override defined property type', () => {
		interface IUser {
			age: number;
		}

		@Quick({ age: 'number' })
		class User extends QModel<IUser> {
			declare age: number;
		}

		// Malicious payload: Trying to inject a Date where a number is expected
		const payload = {
			age: {
				__type: 'date',
				value: '2023-01-01T00:00:00.000Z',
			},
		};

		try {
			const user = new User(payload as unknown as IUser); // @quickmodel-rule-ignore: no-as-unknown
			// If it didn't throw, ensure it didn't create a Date
			expect(user.age).not.toBeInstanceOf(Date);
		} catch (_error) {
			// Throwing is also a valid (and secure) response to type mismatch
			expect(_error).toBeInstanceOf(Error);
		}
	});

	test('should not turn a boolean into a Map', () => {
		interface IConfig {
			active: boolean;
		}
		@Quick({ active: 'boolean' })
		class Config extends QModel<IConfig> {
			declare active: boolean;
		}

		const payload = {
			active: {
				__type: 'Map',
				entries: [['key', 'value']],
			},
		};

		try {
			const config = new Config(payload as unknown as IConfig); // @quickmodel-rule-ignore: no-as-unknown
			// If it didn't throw, ensure it didn't create a Map
			expect(config.active).not.toBeInstanceOf(Map);
		} catch (_error) {
			// Throwing is also a valid (and secure) response to type mismatch
			expect(_error).toBeInstanceOf(Error);
		}
	});
});

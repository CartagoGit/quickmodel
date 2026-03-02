// @quickmodel-rule-ignore: no-as-unknown — intentional: testing unknown properties in permissive policy
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Invalid Data Handling', () => {
	test('should THROW ERROR when deserializing Invalid Date (Fail Fast Policy)', () => {
		interface IUser {
			name: string;
			createdAt: Date;
		}

		@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
		class User extends QModel<IUser> {
			declare createdAt: Date;
		}

		// The library follows "Fail Fast" for explicit types
		expect(() => {
			// TypeScript accepts 'string' (serialization format), but Runtime validation rejects invalid values
			User.create({ name: 'Test', createdAt: 'GARBAGE' });
		}).toThrow(/Invalid date value/);
	});

	test('should allow Unknown Properties (Permissive Policy)', () => {
		interface IUser {
			name: string;
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class User extends QModel<IUser> {
			declare name: string;
		}

		// What happens with extra fields?
		const data = { name: 'Test', extraField: 'Hack' };
		const user = User.create(data);

		// They are preserved in runtime (Permissive)
		expect((user as unknown as Record<string, unknown>)['extraField']).toBe(
			// @quickmodel-rule-ignore: no-as-unknown
			'Hack'
		);

		// And preserved in serialization
		const json = JSON.stringify(user);
		expect(json).toContain('"extraField":"Hack"');
	});
});

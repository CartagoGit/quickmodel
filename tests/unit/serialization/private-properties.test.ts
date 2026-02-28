import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Private/Protected Properties Serialization', () => {
	interface IUser {
		id: number;
		name: string;
		// Internal fields typically wouldn't be in the interface,
		// but QModel constructor takes Partial<IUser>, so we might not include them here
		// or we treat them as optional internal state.
	}

	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;

		// Private convention with underscore
		private _password = 'secret_default';

		// Private convention without underscore (regular private)
		// Note: TypeScript private fields are not truly private at runtime unless using # syntax

		// Protected
		protected _internalId = 'internal_123';

		// Internal marker (double underscore) which is often used for exclusion
		public __meta = 'do_not_serialize';

		constructor(data: any) {
			super(data);
			// Manually set private fields if passed (simulating internal logic)
			if (data._password) this._password = data._password;
			// Read to avoid TS unused error
			void this._password;
		}
	}

	interface IStrictUser {
		id: number;
		_ignored: string;
	}

	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class StrictUser extends QModel<IStrictUser> {
		declare id: number;
		declare _ignored: string; // Declared property strictly in interface
	}

	test('should Exclude properties starting with double underscore __', () => {
		const user = new User({ id: 1, name: 'John' });
		user.__meta = 'so_secret';

		const json = JSON.parse(user.toJSON());
		expect(json.id).toBe(1);
		expect(json.name).toBe('John');
		expect(json.__meta).toBeUndefined();
	});

	test('should EXCLUDE single underscore properties by default (default options)', () => {
		const user = new StrictUser({ id: 1, _ignored: 'visible' });
		// Default behavior: Exclude
		const json = JSON.parse(user.toJSON());

		expect(json.id).toBe(1);
		expect(json._ignored).toBeUndefined();
	});

	test('should INCLUDE single underscore properties when configured', () => {
		const user = new StrictUser({ id: 1, _ignored: 'visible' });

		// Pass option manually via serialize() or toJSON()
		const json = user.serialize(undefined, { includeUnderscore: true });

		expect((json as any).id).toBe(1);
		expect((json as any)._ignored).toBe('visible');
	});

	test('should INCLUDE double underscore properties when configured', () => {
		const user = new User({ id: 1, name: 'John' });
		user.__meta = 'internal_data';

		const json = user.serialize(undefined, {
			includeDoubleUnderscore: true,
		});

		expect((json as any).id).toBe(1);
		expect((json as any).__meta).toBe('internal_data');
	});

	test('should include standard properties', () => {
		const user = new User({ id: 1, name: 'John' });
		const json = JSON.parse(user.toJSON());
		expect(json.id).toBe(1);
		expect(json.name).toBe('John');
	});
});

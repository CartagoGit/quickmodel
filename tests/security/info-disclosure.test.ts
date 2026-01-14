import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Security: Information Disclosure (Private Fields)', () => {
	test('should NOT serialize private fields (pseudo-private via underscores)', () => {
		interface IUser {
			id: number;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare id: number;

			// "Private" by convention
			public _internalId = 'secret';
			public __deepSecret = 'top_secret';

			// TypeScript private (still visible at runtime)
			private apiToken = 'my-token';
		}

		const user = new User({ id: 1 } as any);
		// @ts-ignore
		user._internalId = 'secret';
		// @ts-ignore
		user.__deepSecret = 'top_secret';
		// @ts-ignore
		user.apiToken = 'my-token';

		const serialized = user.serialize();

		// 1. Should exclude __ properties by default
		expect(serialized).not.toHaveProperty('__deepSecret');

		// 2. Should exclude _ properties by default (common convention)
		expect(serialized).not.toHaveProperty('_internalId');

		// 3. What about TypeScript private fields?
		// QuickModel iterates over Object.keys().
		// 'apiToken' is an own enumerable property at runtime.
		// It SHOULD be serialized unless we have a mechanism to exclude it.
		// If it is present, we must document this behavior or provide @Exclude.
		expect(serialized).toHaveProperty('apiToken');
	});

	test('should NOT expose __initData via serialize()', () => {
		interface IUser {
			id: number;
		}
		@Quick()
		class User extends QModel<IUser> {
			declare id: number;
		}

		const user = new User({ id: 1 });
		const json = user.toJSON();

		// Ensure internal QModel state is leaked
		expect(json).not.toContain('__initData');
		expect(json).not.toContain('__tempData');
		expect(json).not.toContain('__quickValues__');
	});
});

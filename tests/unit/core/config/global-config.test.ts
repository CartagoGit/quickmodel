import { describe, test, expect, afterEach } from 'bun:test';
import { QModel, Quick, QConfig } from '../../../../src/index';

describe('Global Configuration', () => {
	afterEach(() => {
		// Reset configuration
		QConfig.configure({});
	});

	test('should allow setting Strict Mode globally', () => {
		// 1. Enable Global Strict Mode
		QConfig.configure({
			defaults: {
				unknownPropertyPolicy: 'error',
			},
		});

		interface IUser {
			id: number;
		}

		// 2. Define model without explicit { unknownPropertyPolicy: 'error' }
		@Quick({ id: Number })
		class User extends QModel<IUser> {
			declare id: number;
		}

		// 3. Test Payloads

		// Case A: Valid payload
		const good = new User({ id: 1 });
		expect(good.id).toBe(1);

		// Case B: Invalid payload (Strict Mode should reject 'extra')
		expect(() => {
			new User({ id: 1, extra: 'malicious' });
		}).toThrow(/Strict Mode/);
	});

	test('should allow overriding global Strict Mode locally', () => {
		QConfig.configure({
			defaults: {
				unknownPropertyPolicy: 'error',
			},
		});

		@Quick({ id: Number }, { unknownPropertyPolicy: 'keep' }) // Explicit override
		class LooselyTypedUser extends QModel<{ id: number }> {
			declare id: number;
		}

		// Should NOT throw
		const user = new LooselyTypedUser({ id: 1, allowedExtra: true });
		expect(user.id).toBe(1);
	});
});

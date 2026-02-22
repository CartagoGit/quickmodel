import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';
import { Logger } from '@/core/helpers/logger.helper';
import { describe, expect, test, beforeEach, spyOn, afterEach } from 'bun:test';

describe('System Performance Configuration', () => {
	beforeEach(() => {
		QConfig.reset();
	});
	afterEach(() => {
		QConfig.reset();
	});

	interface IUser {
		name: string;
		tags?: string[];
	}

	test('should enable deep freezing by default (safety checks valid)', () => {
		@Quick()
		class User extends QModel<IUser> {
			declare name: string;
		}

		const user = User.createReadonly({ name: 'Alice' });

		expect(Object.isFrozen(user)).toBe(true);

		// Attempt modification
		expect(() => {
			(user as any).name = 'Bob';
		}).toThrow(); // In strict mode usually throws TypeError
	});

	test('should disable freezing when performance.disableSafetyChecks is true via decorator', () => {
		@Quick(
			{},
			{
				performance: { disableSafetyChecks: true },
			}
		)
		class FastUser extends QModel<IUser> {
			declare name: string;
		}

		const user = FastUser.createReadonly({ name: 'Alice' });

		expect(Object.isFrozen(user)).toBe(false);

		// Modification allowed
		(user as any).name = 'Bob';
		expect(user.name).toBe('Bob');
	});

	test('should disable freezing when performance.disableSafetyChecks is true globally', () => {
		QConfig.configure({
			defaults: {
				performance: { disableSafetyChecks: true },
			},
		});

		@Quick()
		class GlobalFastUser extends QModel<IUser> {
			declare name: string;
		}

		const user = GlobalFastUser.createReadonly({ name: 'Alice' });

		expect(Object.isFrozen(user)).toBe(false);
	});

	test('should override global config via decorator (disable -> enable)', () => {
		QConfig.configure({
			defaults: {
				performance: { disableSafetyChecks: true },
			},
		});

		// Explicitly re-enable safety checks (disableSafetyChecks: false)
		@Quick(
			{},
			{
				performance: { disableSafetyChecks: false },
			}
		)
		class SafeUser extends QModel<IUser> {
			declare name: string;
		}

		const user = SafeUser.createReadonly({ name: 'Alice' });

		expect(Object.isFrozen(user)).toBe(true);
	});

	test('should disable ObjectSizeValidator checks when disableSafetyChecks is true', () => {
		// We configure a very small limit, but disable checks.
		// If checks were active, it would throw.
		QConfig.configure({
			defaults: {
				maxArrayLength: 2,
				performance: { disableSafetyChecks: true },
			},
		});

		@Quick({
			tags: [String],
		})
		class LargeArrayUser extends QModel<IUser> {
			declare name: string;
			declare tags: string[];
		}

		// 3 items > 2 limit
		const user = new LargeArrayUser({
			name: 'Alice',
			tags: ['a', 'b', 'c'],
		});

		expect(user.tags).toHaveLength(3);
	});

	describe('disableSafetyChecks: security warning', () => {
		test('should emit Logger.warn when disableSafetyChecks is true via decorator', () => {
			const warnSpy = spyOn(Logger, 'warn').mockImplementation(() => {});

			@Quick(
				{},
				{
					performance: { disableSafetyChecks: true },
				}
			)
			class DangerousModel extends QModel<any> {
				declare id: number;
			}

			new DangerousModel({ id: 1 });

			expect(warnSpy).toHaveBeenCalledTimes(1);
			expect(warnSpy.mock.calls[0][0]).toContain('disableSafetyChecks');

			warnSpy.mockRestore();
		});

		test('should include model class name in warning message', () => {
			const warnSpy = spyOn(Logger, 'warn').mockImplementation(() => {});

			@Quick(
				{},
				{
					performance: { disableSafetyChecks: true },
				}
			)
			class UnsafeModel extends QModel<any> {
				declare value: string;
			}

			new UnsafeModel({ value: 'x' });

			expect(warnSpy.mock.calls[0][0]).toContain('UnsafeModel');

			warnSpy.mockRestore();
		});

		test('should NOT warn when disableSafetyChecks is false (default)', () => {
			const warnSpy = spyOn(Logger, 'warn').mockImplementation(() => {});

			@Quick()
			class SafeModel extends QModel<any> {
				declare id: number;
			}

			new SafeModel({ id: 1 });

			expect(warnSpy).not.toHaveBeenCalled();

			warnSpy.mockRestore();
		});

		test('should emit Logger.warn when disableSafetyChecks is true globally', () => {
			const warnSpy = spyOn(Logger, 'warn').mockImplementation(() => {});

			QConfig.configure({
				defaults: {
					performance: { disableSafetyChecks: true },
				},
			});

			@Quick()
			class GlobalDangerousModel extends QModel<any> {
				declare id: number;
			}

			new GlobalDangerousModel({ id: 1 });

			expect(warnSpy).toHaveBeenCalledTimes(1);
			expect(warnSpy.mock.calls[0][0]).toContain('disableSafetyChecks');

			warnSpy.mockRestore();
		});

		test('should NOT warn when safety checks are re-enabled via decorator override', () => {
			const warnSpy = spyOn(Logger, 'warn').mockImplementation(() => {});

			QConfig.configure({
				defaults: { performance: { disableSafetyChecks: true } },
			});

			@Quick(
				{},
				{
					performance: { disableSafetyChecks: false },
				}
			)
			class SafeOverrideModel extends QModel<any> {
				declare id: number;
			}

			new SafeOverrideModel({ id: 1 });

			expect(warnSpy).not.toHaveBeenCalled();

			warnSpy.mockRestore();
		});

		test('warning message accurately states prototype pollution protection remains active', () => {
			const warnSpy = spyOn(Logger, 'warn').mockImplementation(() => {});

			@Quick({}, { performance: { disableSafetyChecks: true } })
			class AuditModel extends QModel<any> {
				declare id: number;
			}

			new AuditModel({ id: 1 });

			const msg: string = warnSpy.mock.calls[0][0];
			// Must NOT say prototype pollution is bypassed
			expect(msg).not.toContain('All security protections');
			// Must document that prototype pollution protection remains active
			expect(msg).toContain('remain active');
			// Must list what IS bypassed for developer clarity
			expect(msg).toContain('bypassed');

			warnSpy.mockRestore();
		});
	});
});

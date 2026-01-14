import { QModel } from '../../../../src/core/models/quick.model';
import { Quick } from '../../../../src/core/decorators/quick.decorator';
import { QConfig } from '../../../../src/core/config/quick.config';
import { QModelError } from '../../../../src/core/errors/quickmodel.error';

describe('System Performance Configuration', () => {
	beforeEach(() => {
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
		@Quick({}, {
			performance: { disableSafetyChecks: true }
		})
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
				performance: { disableSafetyChecks: true }
			}
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
				performance: { disableSafetyChecks: true }
			}
		});

		// Explicitly re-enable safety checks (disableSafetyChecks: false)
		@Quick({}, {
			performance: { disableSafetyChecks: false }
		})
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
                performance: { disableSafetyChecks: true }
            }
        });

        @Quick({
            tags: [String]
        })
        class LargeArrayUser extends QModel<IUser> {
            declare name: string;
            declare tags: string[];
        }

        // 3 items > 2 limit
        const user = new LargeArrayUser({
            name: 'Alice',
            tags: ['a', 'b', 'c']
        });

        expect(user.tags).toHaveLength(3);
    });
});

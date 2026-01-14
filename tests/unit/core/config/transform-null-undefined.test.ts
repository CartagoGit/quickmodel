import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';
import { describe, it, expect, beforeEach } from 'bun:test';

describe('Transformation: Null to Undefined', () => {
	beforeEach(() => {
		QConfig.configure({
			defaults: {
				nullToUndefined: undefined,
			},
		});
	});

	it('should NOT convert null to undefined by default', () => {
		@Quick({ name: String })
		class User extends QModel<any> {
			declare name: string | null;
		}

		const user = User.create({ name: null });
		expect(user.name).toBeNull();
	});

	it('should convert null to undefined when enabled globally', () => {
		QConfig.configure({ defaults: { nullToUndefined: true } });

		@Quick({ name: String })
		class User extends QModel<any> {
			declare name: string | undefined;
		}

		const user = User.create({ name: null } as any);
		expect(user.name).toBeUndefined();
	});

	it('should override global config via decorator', () => {
		QConfig.configure({ defaults: { nullToUndefined: true } });

		@Quick({}, { nullToUndefined: false })
		class User extends QModel<any> {
			declare name: string | null;
		}

		const user = User.create({ name: null });
		expect(user.name).toBeNull();
	});

	it('should work with normalization (emptyStringAsNull -> null -> undefined)', () => {
		QConfig.configure({
			defaults: {
				normalization: { emptyStringAsNull: true },
				nullToUndefined: true,
			},
		});

		@Quick({ name: String })
		class User extends QModel<any> {
			declare name: string | undefined;
		}

		const user = User.create({ name: '' });
		expect(user.name).toBeUndefined();
	});
});

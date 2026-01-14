import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';
import { QType } from '@/core/decorators/qtype.decorator';
import { describe, it, expect, beforeEach } from 'bun:test';

describe('Transformation: Coercion Strategy', () => {
	beforeEach(() => {
		QConfig.configure({
			defaults: {
				coercionStrategy: undefined,
			},
		});
	});

	describe('Strategy: strict (Default)', () => {
		it('should throw on string -> number mismatch', () => {
			@Quick({ age: Number })
			class User extends QModel<any> {
				@QType() declare age: number;
			}

			expect(() => {
				User.create({ age: '25' } as any);
			}).toThrow(/Expected number, got string/);
		});

		it('should throw on number -> string mismatch', () => {
			@Quick({ name: String })
			class User extends QModel<any> {
				@QType() declare name: string;
			}

			expect(() => {
				User.create({ name: 123 } as any);
			}).toThrow(/Expected string, got number/);
		});

		it('should throw on string -> boolean mismatch', () => {
			@Quick({ active: Boolean })
			class User extends QModel<any> {
				@QType() declare active: boolean;
			}

			expect(() => {
				User.create({ active: 'true' } as any);
			}).toThrow(/Expected boolean, got string/);
		});
	});

	describe('Strategy: loose', () => {
		beforeEach(() => {
			QConfig.configure({ defaults: { coercionStrategy: 'loose' } });
		});

		it('should coerce string -> number', () => {
			@Quick({ age: Number })
			class User extends QModel<any> {
				@QType() declare age: number;
			}

			const user = User.create({ age: '25' } as any);
			expect(user.age).toBe(25);
			expect(typeof user.age).toBe('number');
		});

		it('should coerce number -> string', () => {
			@Quick({ name: String })
			class User extends QModel<any> {
				@QType() declare name: string;
			}

			const user = User.create({ name: 123 } as any);
			expect(user.name).toBe('123');
			expect(typeof user.name).toBe('string');
		});

		it('should coerce boolean strings -> boolean', () => {
			@Quick({ active: Boolean, disabled: Boolean })
			class User extends QModel<any> {
				@QType() declare active: boolean;
				@QType() declare disabled: boolean;
			}

			const user = User.create({
				active: 'true',
				disabled: 'false',
			} as any);
			expect(user.active).toBe(true);
			expect(user.disabled).toBe(false);
		});

		it('should coerce 0/1 -> boolean', () => {
			@Quick({ active: Boolean, disabled: Boolean })
			class User extends QModel<any> {
				@QType() declare active: boolean;
				@QType() declare disabled: boolean;
			}

			const user = User.create({ active: 1, disabled: 0 } as any);
			expect(user.active).toBe(true);
			expect(user.disabled).toBe(false);
		});

		it('should throw on invalid number coercion', () => {
			@Quick({ age: Number })
			class User extends QModel<any> {
				@QType() declare age: number;
			}

			expect(() => {
				User.create({ age: 'not_a_number' } as any);
				// "abc" -> NaN, logic should skip NaN
			}).toThrow(/Expected number, got string/);
		});
	});

	describe('Override', () => {
		it('should allow decorator override', () => {
			QConfig.configure({ defaults: { coercionStrategy: 'strict' } });

			@Quick({}, { coercionStrategy: 'loose' })
			class User extends QModel<any> {
				@QType(Number) declare age: number;
			}

			const user = User.create({ age: '25' } as any);
			expect(user.age).toBe(25);
		});
	});
});

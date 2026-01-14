import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';
import { describe, it, expect, beforeEach } from 'bun:test';

interface IUser {
	id: string;
	name: string;
}

describe('Integrity: Unknown Property Policy', () => {
	beforeEach(() => {
		// Reset config
		QConfig.configure({
			defaults: {
				strict: undefined,
				unknownPropertyPolicy: undefined,
			},
		});
	});

	describe('Policy: keep (Default)', () => {
		it('should preserve unknown properties by default', () => {
			@Quick()
			class User extends QModel<IUser> {
				declare id: string;
				declare name: string;
			}

			const user = User.create({
				id: '1',
				name: 'John',
				extra: 'data',
			} as any);

			expect((user as any).extra).toBe('data');
			expect(user.id).toBe('1');
		});

		it('should preserve unknown properties when explicitly set properties in global config', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'keep' } });

			@Quick()
			class User extends QModel<IUser> {
				declare id: string;
				declare name: string;
			}

			const user = User.create({
				id: '1',
				name: 'John',
				extra: 'data',
			} as any);

			expect((user as any).extra).toBe('data');
			expect(user.id).toBe('1');
		});
	});

	describe('Policy: strip', () => {
		it('should remove unknown properties when set globally', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'strip' } });

			// properties must be known for strip to work (decorated or mapped)
			@Quick({
				id: String,
				name: String,
			})
			class User extends QModel<IUser> {
				declare id: string;
				declare name: string;
			}

			const user = User.create({
				id: '1',
				name: 'John',
				extra: 'should vanish',
			} as any);

			expect(user.id).toBe('1');
			expect(user.name).toBe('John');
			expect((user as any).extra).toBeUndefined();
		});

		it('should remove unknown properties when set in decorator', () => {
			// properties must be known for strip to work
			@Quick(
				{ id: String, name: String },
				{ unknownPropertyPolicy: 'strip' }
			)
			class User extends QModel<IUser> {
				declare id: string;
				declare name: string;
			}

			const user = User.create({
				id: '1',
				name: 'John',
				extra: 'should vanish',
			} as any);

			expect(user.id).toBe('1');
			expect((user as any).extra).toBeUndefined();
		});

		it('should not affect defined properties', () => {
			// Tests that defined properties are kept (already implicitly tested above but explicit here)
			@Quick({ id: String }, { unknownPropertyPolicy: 'strip' })
			class User extends QModel<IUser> {
				declare id: string;
				declare name: string;
			}

			const user = User.create({
				id: '1',
				name: 'John', // Name is NOT registered in Quick map, so it technically IS unknown to the runtime
			} as any);

			expect(user.id).toBe('1');
			// Since 'name' is just a TS declare and not in the runtime map, it is stripped!
			// This confirms the behavior that strip requires explicit registration
			expect(user.name).toBeUndefined();
		});
	});

	describe('Policy: error', () => {
		it('should throw error when set globally', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'error' } });

			@Quick({ id: String, name: String })
			class User extends QModel<IUser> {
				declare id: string;
				declare name: string;
			}

			expect(() => {
				User.create({
					id: '1',
					name: 'John',
					extra: 'fail',
				} as any);
			}).toThrow(
				"Strict Mode: Property 'extra' (mapped from 'extra') is not defined"
			);
		});

		it('should throw error when set in decorator', () => {
			@Quick({ id: String }, { unknownPropertyPolicy: 'error' })
			class User extends QModel<IUser> {
				declare id: string;
			}

			expect(() => {
				User.create({ id: '1', extra: 'fail' } as any);
			}).toThrow(
				"Strict Mode: Property 'extra' (mapped from 'extra') is not defined"
			);
		});
	});

	describe('Precedence & Compatibility', () => {
		it('should prioritize decorator over global', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'strip' } });

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class User extends QModel<IUser> {
				declare id: string;
			}

			const user = User.create({ id: '1', extra: 'kept' } as any);
			expect((user as any).extra).toBe('kept');
		});

		// Legacy 'strict' boolean support
		it('should treat legacy strict: true as error', () => {
			@Quick({ id: String }, { strict: true })
			class User extends QModel<IUser> {
				declare id: string;
			}

			expect(() => {
				User.create({ id: '1', extra: 'fail' } as any);
			}).toThrow();
		});

		it('should treat legacy strict: false as keep', () => {
			@Quick({ id: String }, { strict: false })
			class User extends QModel<IUser> {
				declare id: string;
			}

			const user = User.create({ id: '1', extra: 'kept' } as any);
			expect((user as any).extra).toBe('kept');
		});

		it('should map unknownPropertyPolicy over strict if both present', () => {
			@Quick(
				{ id: String },
				{ strict: true, unknownPropertyPolicy: 'strip' }
			)
			class User extends QModel<IUser> {
				declare id: string;
			}

			// Should strip instead of throw (strict=true would throw)
			const user = User.create({ id: '1', extra: 'gone' } as any);
			expect((user as any).extra).toBeUndefined();
		});
	});

	describe('Nested Models with Mixed Policies', () => {
		it('should respect different policies at different levels', () => {
			// Child: Strict/Error
			@Quick({ name: String }, { unknownPropertyPolicy: 'error' })
			class Child extends QModel<any> {
				declare name: string;
			}

			// Parent: Strip
			@Quick(
				{ child: Child, title: String },
				{ unknownPropertyPolicy: 'strip' }
			)
			class Parent extends QModel<any> {
				declare title: string;
				declare child: Child;
			}

			// 1. Parent strips its own unknowns
			const data = {
				title: 'Parent',
				unknownParent: 'gone',
				child: {
					name: 'Child',
					// unknownChild: 'fail' // This would fail
				},
			};

			const parent = Parent.create(data);
			expect((parent as any).unknownParent).toBeUndefined();
			expect(parent.child.name).toBe('Child');

			// 2. Child throws on its own unknowns
			expect(() => {
				Parent.create({
					title: 'Parent',
					child: {
						name: 'Child',
						unknownChild: 'fail', // Should trigger child's error policy
					},
				});
			}).toThrow(/Property 'unknownChild'/);
		});
	});
});

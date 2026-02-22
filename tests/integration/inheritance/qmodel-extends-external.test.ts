import { describe, it, expect } from 'bun:test';
import { Quick, QType, QModel } from '@/index';

/**
 * Tests for QModel.extends(ExternalClass) — mixin factory.
 *
 * Validates that a class can use QModel functionality even when it must inherit
 * from an external class that is not part of the QModel hierarchy.
 *
 * Usage:
 *   const Base = QModel.extends<ExternalUser>(ExternalUser);
 *
 *   @Quick({ promotedAt: Date })
 *   class Admin extends Base {
 *     declare promotedAt: Date;
 *   }
 *
 * Scenarios:
 *  1. QModel.extends() returns a constructable class (smoke test)
 *  2. Instance IS instanceof the external base
 *  3. Instance is NOT instanceof QModel (different prototype chain)
 *  4. External base constructor is called — its properties are available
 *  5. @Quick type transformations work (Date, BigInt, RegExp)
 *  6. Static methods exposed: create(), mock(), getMetadata()
 *  7. Instance methods exposed: serialize(), toJSON(), toInterface(), isDirty(), merge()
 *  8. serialize() includes fields from external base AND from the QModel mixin class
 *  9. Deep chain: ExternalBase → Mixin → Child → GrandChild
 * 10. @QType explicit decorator works alongside @Quick
 * 11. createReadonly() is available and returns a frozen instance
 * 12. getDirtyFields() and reset() work on mixin instances
 * 13. deserializeJson() roundtrip (string → instance)
 * 14. Two independent mixins over the same ExternalBase have isolated metadata
 */

// ─────────────────────────────────────────────────────────────────────────────
// External classes that simulate third-party / framework base classes
// (not related to QModel in any way)
// ─────────────────────────────────────────────────────────────────────────────

class ExternalEntity {
	readonly entityType = 'external';

	constructor(public readonly entityId: number = 0) {}

	isExternal(): boolean {
		return true;
	}
}

class ExternalUser extends ExternalEntity {
	username: string;
	email: string;

	constructor(username = '', email = '') {
		super(42);
		this.username = username;
		this.email = email;
	}

	greet(): string {
		return `Hello, ${this.username}`;
	}
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: QModel.extends(ExternalClass)', () => {
	// =========================================================================
	// Scenario 1: smoke — QModel.extends() returns something extensible
	// =========================================================================
	describe('Scenario 1: QModel.extends() returns a usable base class', () => {
		it('should return a value that can be used in "extends"', () => {
			// If QModel.extends is not implemented this will throw at class definition time
			const MixinBase = QModel.extends<ExternalEntity>(ExternalEntity);
			expect(MixinBase).toBeDefined();
			expect(typeof MixinBase).toBe('function');
		});
	});

	// =========================================================================
	// Scenario 2 & 3: prototype chain
	// =========================================================================
	describe('Scenario 2-3: prototype chain checks', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class Admin extends AdminBase {
			declare username: string;
			declare email: string;
			declare promotedAt: Date;
		}

		it('instance should be instanceof the external base class', () => {
			const instance = Admin.create({
				username: 'alice',
				email: 'alice@test.com',
				promotedAt: '2024-01-15T00:00:00.000Z',
			});

			expect(instance).toBeInstanceOf(ExternalUser);
			expect(instance).toBeInstanceOf(ExternalEntity);
		});

		it('instance should NOT be instanceof QModel (different chain)', () => {
			const instance = Admin.create({
				username: 'alice',
				email: 'alice@test.com',
				promotedAt: '2024-01-15T00:00:00.000Z',
			});

			// The mixin does NOT extend QModel — it extends ExternalUser
			// This is expected and documented behavior
			expect(instance instanceof QModel).toBe(false);
		});
	});

	// =========================================================================
	// Scenario 4: external base constructor is invoked
	// =========================================================================
	describe('Scenario 4: external base constructor properties are available', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class Admin extends AdminBase {
			declare username: string;
			declare promotedAt: Date;
		}

		it('methods defined on external base should be callable', () => {
			const instance = Admin.create({
				username: 'bob',
				promotedAt: '2025-03-01T00:00:00.000Z',
			});

			// With TBase = ExternalUser, greet() and isExternal() are directly
			// visible in the instance type — no cast needed.
			expect(typeof instance.greet).toBe('function');
			expect(instance.isExternal()).toBe(true);
		});
	});

	// =========================================================================
	// Scenario 5: @Quick type transformations work
	// =========================================================================
	describe('Scenario 5: @Quick type transformations work on mixin class', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date, salary: BigInt })
		class Admin extends AdminBase {
			declare username: string;
			declare promotedAt: Date;
			declare salary: bigint;
		}

		it('should transform Date field', () => {
			const instance = Admin.create({
				username: 'carol',
				promotedAt: '2023-06-01T00:00:00.000Z',
				salary: '9999999999',
			});

			expect(instance.promotedAt).toBeInstanceOf(Date);
			expect(instance.promotedAt.getFullYear()).toBe(2023);
		});

		it('should transform BigInt field', () => {
			const instance = Admin.create({
				username: 'carol',
				promotedAt: '2023-06-01T00:00:00.000Z',
				salary: '9999999999',
			});

			expect(typeof instance.salary).toBe('bigint');
			expect(instance.salary).toBe(9999999999n);
		});

		it('should preserve plain string field', () => {
			const instance = Admin.create({
				username: 'carol',
				promotedAt: '2023-06-01T00:00:00.000Z',
				salary: '9999999999',
			});

			expect(instance.username).toBe('carol');
		});
	});

	// =========================================================================
	// Scenario 6: static methods are available
	// =========================================================================
	describe('Scenario 6: static methods create(), mock(), getMetadata()', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class AdminStatic extends AdminBase {
			declare username: string;
			declare promotedAt: Date;
		}

		it('create() should be available as a static method', () => {
			expect(typeof AdminStatic.create).toBe('function');
			const instance = AdminStatic.create({
				username: 'dave',
				promotedAt: '2024-07-04T00:00:00.000Z',
			});
			expect(instance).toBeDefined();
			expect(instance.username).toBe('dave');
		});

		it('mock() should be available as a static method', () => {
			expect(typeof AdminStatic.mock).toBe('function');
			const instance = AdminStatic.mock().random();
			expect(instance).toBeDefined();
		});

		it('getMetadata() should return the type map', () => {
			expect(typeof AdminStatic.getMetadata).toBe('function');
			const meta = AdminStatic.getMetadata();
			expect(meta).toBeInstanceOf(Map);
			expect(meta.has('promotedAt')).toBe(true);
			expect(meta.get('promotedAt')?.type).toMatch(/date/i);
		});
	});

	// =========================================================================
	// Scenario 7: instance methods are available
	// =========================================================================
	describe('Scenario 7: instance methods serialize(), toJSON(), isDirty(), merge()', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class AdminInstance extends AdminBase {
			declare username: string;
			declare promotedAt: Date;
		}

		const instance = AdminInstance.create({
			username: 'eve',
			promotedAt: '2022-11-11T00:00:00.000Z',
		});

		it('serialize() should return a plain object', () => {
			const plain = instance.serialize();
			expect(typeof plain).toBe('object');
			expect(plain).not.toBeNull();
		});

		it('toJSON() should return a JSON string', () => {
			const json = instance.toJSON();
			expect(typeof json).toBe('string');
			// Should be valid JSON
			expect(() => JSON.parse(json)).not.toThrow();
		});

		it('isDirty() should be available', () => {
			expect(typeof instance.isDirty).toBe('function');
			expect(instance.isDirty()).toBe(false);
		});

		it('merge() should be available and return updated instance', () => {
			expect(typeof instance.merge).toBe('function');
			const merged = instance.merge({ username: 'eve-updated' });
			expect(merged.username).toBe('eve-updated');
		});
	});

	// =========================================================================
	// Scenario 8: serialize() includes fields from both external base and mixin
	// =========================================================================
	describe('Scenario 8: serialize() includes external base fields AND mixin fields', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class AdminFull extends AdminBase {
			declare username: string;
			declare email: string;
			declare promotedAt: Date;
			declare role: string;
		}

		it('plain object from serialize() should contain all fields', () => {
			const instance = AdminFull.create({
				username: 'frank',
				email: 'frank@test.com',
				promotedAt: '2021-09-09T00:00:00.000Z',
				role: 'superadmin',
			});

			const plain = instance.serialize();

			expect(plain).toHaveProperty('username', 'frank');
			expect(plain).toHaveProperty('email', 'frank@test.com');
			expect(plain).toHaveProperty('role', 'superadmin');
			// Date serialized to ISO string
			expect(typeof plain.promotedAt).toBe('string');
		});

		it('roundtrip create → serialize → create should preserve transformations', () => {
			const original = AdminFull.create({
				username: 'frank',
				email: 'frank@test.com',
				promotedAt: '2021-09-09T00:00:00.000Z',
				role: 'superadmin',
			});

			const plain = original.serialize();
			const restored = AdminFull.create(plain as any);

			expect(restored.promotedAt).toBeInstanceOf(Date);
			expect(restored.promotedAt.getFullYear()).toBe(2021);
			expect(restored.username).toBe('frank');
		});
	});

	// =========================================================================
	// Scenario 9: deep chain — ExternalBase → Mixin → Child → GrandChild
	// =========================================================================
	describe('Scenario 9: deep chain ExternalBase → Mixin → Child → GrandChild', () => {
		const MixinBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ createdAt: Date })
		class UserModel extends MixinBase {
			declare username: string;
			declare createdAt: Date;
		}

		@Quick({ promotedAt: Date })
		class AdminModel extends UserModel {
			declare role: string;
			declare promotedAt: Date;
		}

		@Quick({ bannedAt: Date })
		class SuperAdmin extends AdminModel {
			declare level: number;
			declare bannedAt: Date;
		}

		it('should transform fields from all levels in the chain', () => {
			// SuperAdmin accumulates fields from 3 subclass levels on top of the mixin.
			// TypeScript infers TInterface from the root MixinBase, so extra fields
			// from child classes require a cast — the runtime behaviour is what we test.
			const instance = SuperAdmin.create({
				username: 'grace',
				createdAt: '2018-01-01T00:00:00.000Z',
				role: 'admin',
				promotedAt: '2020-05-05T00:00:00.000Z',
				level: 9,
				bannedAt: '2025-12-31T00:00:00.000Z',
			} as any);

			expect(instance.username).toBe('grace');
			expect(instance.createdAt).toBeInstanceOf(Date);
			expect(instance.createdAt.getFullYear()).toBe(2018);
			expect(instance.role).toBe('admin');
			expect(instance.promotedAt).toBeInstanceOf(Date);
			expect(instance.level).toBe(9);
			expect(instance.bannedAt).toBeInstanceOf(Date);
		});

		it('instance should still be instanceof ExternalUser through the chain', () => {
			const instance = SuperAdmin.create({
				username: 'grace',
				createdAt: '2018-01-01T00:00:00.000Z',
				role: 'admin',
				promotedAt: '2020-05-05T00:00:00.000Z',
				level: 9,
				bannedAt: '2025-12-31T00:00:00.000Z',
			} as any);

			expect(instance).toBeInstanceOf(ExternalUser);
			expect(instance).toBeInstanceOf(ExternalEntity);
		});
	});

	// =========================================================================
	// Scenario 10: @QType explicit decorator works alongside @Quick on mixin class
	// =========================================================================
	describe('Scenario 10: @QType explicit decorator works on mixin class', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class AdminQType extends AdminBase {
			declare username: string;
			declare promotedAt: Date;

			@QType(BigInt)
			declare salary: bigint;

			@QType(RegExp)
			declare pattern: RegExp;
		}

		it('should transform @Quick field (Date) and @QType fields (BigInt, RegExp)', () => {
			const instance = AdminQType.create({
				username: 'henry',
				promotedAt: '2023-03-03T00:00:00.000Z',
				salary: '55000000',
				pattern: '/admin/i',
			});

			expect(instance.promotedAt).toBeInstanceOf(Date);
			expect(typeof instance.salary).toBe('bigint');
			expect(instance.salary).toBe(55000000n);
			expect(instance.pattern).toBeInstanceOf(RegExp);
		});
	});

	// =========================================================================
	// Scenario 11: createReadonly() is available on mixin class
	// =========================================================================
	describe('Scenario 11: createReadonly() returns a deep-frozen instance', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class AdminRO extends AdminBase {
			declare username: string;
			declare promotedAt: Date;
		}

		it('createReadonly() should be a static method on the mixin class', () => {
			expect(typeof AdminRO.createReadonly).toBe('function');
		});

		it('instance from createReadonly() should be frozen — mutating a field throws in strict mode', () => {
			const instance = AdminRO.createReadonly({
				username: 'readonly-user',
				promotedAt: '2024-06-01T00:00:00.000Z',
			});

			expect(instance.username).toBe('readonly-user');
			expect(instance.promotedAt).toBeInstanceOf(Date);

			// Strict mode (Bun runs tests as ES modules — always strict)
			expect(() => {
				(instance as { username: string }).username = 'mutated';
			}).toThrow();
		});
	});

	// =========================================================================
	// Scenario 12: getDirtyFields() and reset() on mixin instance
	// =========================================================================
	describe('Scenario 12: getDirtyFields() and reset() work on mixin instances', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date })
		class AdminDirty extends AdminBase {
			declare username: string;
			declare promotedAt: Date;
		}

		it('getDirtyFields() should return empty set after create()', () => {
			const instance = AdminDirty.create({
				username: 'clean',
				promotedAt: '2024-01-01T00:00:00.000Z',
			});

			expect(typeof instance.getDirtyFields).toBe('function');
			const dirty = instance.getDirtyFields();
			expect(dirty.size).toBe(0);
		});

		it('getDirtyFields() should list fields modified via patch()', () => {
			const instance = AdminDirty.create({
				username: 'clean',
				promotedAt: '2024-01-01T00:00:00.000Z',
			});

			instance.patch({ username: 'dirty' });

			const dirty = instance.getDirtyFields();
			expect(dirty.has('username')).toBe(true);
		});

		it('reset() should clear dirty state and restore original values', () => {
			const instance = AdminDirty.create({
				username: 'original',
				promotedAt: '2024-01-01T00:00:00.000Z',
			});

			instance.patch({ username: 'modified' });
			expect(instance.isDirty()).toBe(true);

			instance.reset();
			expect(instance.isDirty()).toBe(false);
			expect(instance.username).toBe('original');
		});
	});

	// =========================================================================
	// Scenario 13: deserializeJson() roundtrip
	// =========================================================================
	describe('Scenario 13: deserializeJson() roundtrip (JSON string → instance)', () => {
		const AdminBase = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ promotedAt: Date, salary: BigInt })
		class AdminJson extends AdminBase {
			declare username: string;
			declare promotedAt: Date;
			declare salary: bigint;
		}

		it('deserializeJson() should be a static method', () => {
			expect(typeof AdminJson.deserializeJson).toBe('function');
		});

		it('deserializeJson(toJSON()) should restore transformed fields', () => {
			const original = AdminJson.create({
				username: 'json-user',
				promotedAt: '2025-07-04T00:00:00.000Z',
				salary: '123456789',
			});

			// toJSON() serializes to string (bigint → string, Date → ISO string)
			const json = original.toJSON();
			expect(typeof json).toBe('string');

			// deserializeJson() parses the JSON and re-applies transformers
			const restored = AdminJson.deserializeJson(json);

			expect(restored.username).toBe('json-user');
			expect(restored.promotedAt).toBeInstanceOf(Date);
			expect(restored.promotedAt.getFullYear()).toBe(2025);
			expect(typeof restored.salary).toBe('bigint');
			expect(restored.salary).toBe(123456789n);
		});
	});

	// =========================================================================
	// Scenario 14: Two independent mixins over the same ExternalBase
	//              must have completely isolated metadata
	// =========================================================================
	describe('Scenario 14: two mixins on the same ExternalBase have isolated metadata', () => {
		// Both classes extend QModel.extends(ExternalUser) independently.
		// Each has its own @Quick map. Metadata of one must not bleed into the other.
		const BaseA = QModel.extends<ExternalUser>(ExternalUser);
		const BaseB = QModel.extends<ExternalUser>(ExternalUser);

		@Quick({ hiredAt: Date })
		class EmployeeA extends BaseA {
			declare username: string;
			declare hiredAt: Date;
		}

		@Quick({ retiredAt: Date, pension: BigInt })
		class EmployeeB extends BaseB {
			declare username: string;
			declare retiredAt: Date;
			declare pension: bigint;
		}

		it('EmployeeA metadata should only contain its own transformed fields', () => {
			const meta = EmployeeA.getMetadata();

			expect(meta.has('hiredAt')).toBe(true);
			// EmployeeB-only fields must NOT appear in EmployeeA
			expect(meta.has('retiredAt')).toBe(false);
			expect(meta.has('pension')).toBe(false);
		});

		it('EmployeeB metadata should only contain its own transformed fields', () => {
			const meta = EmployeeB.getMetadata();

			expect(meta.has('retiredAt')).toBe(true);
			expect(meta.has('pension')).toBe(true);
			// EmployeeA-only fields must NOT appear in EmployeeB
			expect(meta.has('hiredAt')).toBe(false);
		});

		it('create() on each class transforms only its own fields', () => {
			const a = EmployeeA.create({
				username: 'alice',
				hiredAt: '2020-01-01T00:00:00.000Z',
			});
			const b = EmployeeB.create({
				username: 'bob',
				retiredAt: '2025-06-01T00:00:00.000Z',
				pension: '300000',
			});

			expect(a.hiredAt).toBeInstanceOf(Date);
			expect(b.retiredAt).toBeInstanceOf(Date);
			expect(typeof b.pension).toBe('bigint');

			// Cross-contamination check: EmployeeA instance has no retiredAt
			expect((a as any).retiredAt).toBeUndefined();
			// EmployeeB instance has no hiredAt
			expect((b as any).hiredAt).toBeUndefined();
		});
	});
});

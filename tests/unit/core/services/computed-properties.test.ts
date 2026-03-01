/**
 * Task #18 — @QComputed() decorator: computed getters in serialization (TDD)
 *
 * Getters are NOT serialized by default.
 * Annotating a getter with @QComputed() includes it in serialize() and toJSON().
 */
import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
// @QComputed will be imported once implemented
import { QComputed } from '@/decorators';

// ─── Fixtures ────────────────────────────────────────────────────────────────

interface IUser {
	firstName: string;
	lastName: string;
	birthYear: number;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Task #18 — @QComputed() decorator', () => {
	// ── 1. Default: getters NOT serialized ───────────────────────────────

	test('getters are NOT included in serialize() by default', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class UserModel extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		const user = UserModel.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const serialized = user.$qm.serialize();
		expect(serialized).not.toHaveProperty('fullName');
	});

	test('getters are NOT included in toJSON() by default', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class UserModel2 extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			get initials(): string {
				return `${this.firstName[0]}.${this.lastName[0]}.`;
			}
		}

		const user = UserModel2.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const json = JSON.parse(user.toJSON()) as Record<string, unknown>;
		expect(json).not.toHaveProperty('initials');
	});

	// ── 2. @QComputed() includes getter in serialize() ───────────────────

	test('@QComputed() includes getter in serialize()', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class ComputedUser extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		const user = ComputedUser.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const serialized = user.$qm.serialize();
		expect(serialized).toHaveProperty('fullName', 'Alice Smith');
	});

	test('@QComputed() includes getter in toJSON()', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class ComputedUser2 extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get initials(): string {
				return `${this.firstName[0]}.${this.lastName[0]}.`;
			}
		}

		const user = ComputedUser2.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const json = JSON.parse(user.toJSON()) as Record<string, unknown>;
		expect(json).toHaveProperty('initials', 'A.S.');
	});

	test('@QComputed() getter value reflects current state', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class ComputedUser3 extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get upperFirstName(): string {
				return this.firstName.toUpperCase();
			}
		}

		const user = ComputedUser3.create({
			firstName: 'alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const serialized = user.$qm.serialize();
		expect(serialized).toHaveProperty('upperFirstName', 'ALICE');
	});

	// ── 3. Regular fields are serialized correctly with @QComputed() ─────

	test('regular declared fields are still serialized alongside @QComputed', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class ComputedUser4 extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		const user = ComputedUser4.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const serialized = user.$qm.serialize();
		// Regular fields still present
		expect(serialized).toHaveProperty('firstName', 'Alice');
		expect(serialized).toHaveProperty('lastName', 'Smith');
		// Computed field also present
		expect(serialized).toHaveProperty('fullName', 'Alice Smith');
	});

	// ── 4. Multiple @QComputed() getters ─────────────────────────────────

	test('multiple @QComputed() getters are all included', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class MultiComputedUser extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}

			@QComputed()
			get initials(): string {
				return `${this.firstName[0]}.${this.lastName[0]}.`;
			}

			// NOT decorated — should NOT appear
			get upperFullName(): string {
				return `${this.firstName} ${this.lastName}`.toUpperCase();
			}
		}

		const user = MultiComputedUser.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const serialized = user.$qm.serialize();
		expect(serialized).toHaveProperty('fullName', 'Alice Smith');
		expect(serialized).toHaveProperty('initials', 'A.S.');
		expect(serialized).not.toHaveProperty('upperFullName');
	});

	// ── 5. @QComputed() works with inheritance ───────────────────────────

	test('@QComputed() in parent class is visible in child serialization', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class BaseUserModel extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		@Quick(
			{ firstName: String, lastName: String, birthYear: Number },
			{ unknownPropertyPolicy: 'keep' }
		)
		class ExtendedUser extends BaseUserModel {
			declare birthYear: number;
		}

		const user = ExtendedUser.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const serialized = user.$qm.serialize();
		expect(serialized).toHaveProperty('fullName', 'Alice Smith');
		expect(serialized).toHaveProperty('birthYear', 1990);
	});

	// ── 6. @QComputed() does not affect deserialization ──────────────────

	test('@QComputed() getter is NOT used during create() (deserialization)', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class ComputedUser5 extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		// Passing fullName in data should NOT override anything (it's computed)
		const user = ComputedUser5.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
			fullName: 'Ignored Value',
		} as any);

		// The getter still computes fresh value
		expect(user.fullName).toBe('Alice Smith');
	});

	// ── 7. JSON.stringify captures @QComputed() fields ───────────────────

	test('JSON.stringify captures @QComputed() getter', () => {
		@Quick(
			{ firstName: String, lastName: String },
			{ unknownPropertyPolicy: 'keep' }
		)
		class JsonUser extends QModel<IUser> {
			declare firstName: string;
			declare lastName: string;
			declare birthYear: number;

			@QComputed()
			get fullName(): string {
				return `${this.firstName} ${this.lastName}`;
			}
		}

		const user = JsonUser.create({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
		});

		const parsed = JSON.parse(user.toJSON());
		expect(parsed).toHaveProperty('fullName', 'Alice Smith');
	});
});

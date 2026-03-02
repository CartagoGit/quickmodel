/**
 * Integration tests for mutable state flows: patch + reset + copy chains.
 * Covers: cross-feature/D
 *
 * Tests complete lifecycle flows: create → patch × N → getDirtyFields → reset.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QDefault, QReadonly, QAlias, QSensitive, QRule } from '@/decorators';

// ─── Models ───────────────────────────────────────────────────────────────────

interface IEmployee {
	id: number;
	name: string;
	department: string;
	salary: number;
}

@Quick({ id: Number, salary: Number }, { unknownPropertyPolicy: 'keep' })
class EmployeeModel extends QModel<IEmployee> {
	declare id: number;
	declare name: string;
	declare department: string;
	declare salary: number;
}

// ─── Model for D-4: @QReadonly + @QDefault ───────────────────────────────────

interface IConfig {
	env: string;
	maxRetries: number;
	appName: string;
}

@Quick({ maxRetries: Number }, { unknownPropertyPolicy: 'keep' })
class ConfigModel extends QModel<IConfig> {
	@QReadonly()
	declare env: string;

	declare maxRetries: number;

	@QDefault('MyApp')
	declare appName: string;
}

// ─── Model for D-5: @QAlias + @QDefault + @QSensitive ────────────────────────

interface ISafeRecord {
	userId: string;
	token: string;
	createdAt: Date;
}

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
class SafeRecordModel extends QModel<ISafeRecord> {
	@QAlias('user_id')
	declare userId: string;

	@QSensitive()
	@QDefault('(no token)')
	declare token: string;

	declare createdAt: Date;
}

// ─── Model for D-3: createMany with rules ────────────────────────────────────

interface IOrder {
	orderId: string;
	amount: number;
}

@Quick({ amount: Number }, { unknownPropertyPolicy: 'keep' })
class OrderModel extends QModel<IOrder> {
	declare orderId: string;

	@QRule(
		(val: number) => typeof val === 'number' && val > 0,
		'Amount must be positive'
	)
	declare amount: number;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: mutable state flows (model-state/D)', () => {
	describe('D-1: create → patch × 3 → getDirtyFields → reset', () => {
		test('patch incrementally changes fields, $qGetDirtyFields() tracks them', () => {
			const emp = new EmployeeModel({
				id: 1,
				name: 'Alice',
				department: 'Engineering',
				salary: 50000,
			});

			emp.$qPatch({ department: 'Product' });
			emp.$qPatch({ salary: 60000 });
			emp.$qPatch({ name: 'Alice Smith' });

			const dirty = emp.$qGetDirtyFields();
			expect(dirty).toContain('department');
			expect(dirty).toContain('salary');
			expect(dirty).toContain('name');
			expect(emp.name).toBe('Alice Smith');
			expect(emp.salary).toBe(60000);
		});

		test('$qReset() restores original state and clears dirty', () => {
			const emp = new EmployeeModel({
				id: 1,
				name: 'Alice',
				department: 'Engineering',
				salary: 50000,
			});

			emp.$qPatch({ department: 'Product', salary: 60000 });
			expect(emp.$qIsDirty()).toBe(true);

			emp.$qReset();
			expect(emp.$qIsDirty()).toBe(false);
			expect(emp.department).toBe('Engineering');
			expect(emp.salary).toBe(50000);
		});
	});

	describe('D-2: $qCopy() chaining — original is never mutated', () => {
		test('copy chain does not mutate the original', () => {
			const original = new EmployeeModel({
				id: 1,
				name: 'Bob',
				department: 'Marketing',
				salary: 40000,
			});

			const copy1 = original.$qCopy({ department: 'Sales' });
			const copy2 = copy1.$qCopy({ salary: 45000 });

			// Original is unchanged
			expect(original.department).toBe('Marketing');
			expect(original.salary).toBe(40000);

			// copy1 has first change
			expect(copy1.department).toBe('Sales');
			expect(copy1.salary).toBe(40000);

			// copy2 has both changes
			expect(copy2.department).toBe('Sales');
			expect(copy2.salary).toBe(45000);
		});
	});

	describe('D-3: createMany() with mixed valid/invalid data', () => {
		test('createMany() creates all valid instances', () => {
			const batchData = [
				{ orderId: 'A1', amount: 100 },
				{ orderId: 'A2', amount: -50 }, // invalid
				{ orderId: 'A3', amount: 200 },
			];

			const { instances, errors } = OrderModel.createMany(batchData);
			expect(instances.length).toBe(2);
			expect(errors.length).toBe(1);
		});

		test('invalid order is in errors with field info', () => {
			const batchData = [
				{ orderId: 'A1', amount: 100 },
				{ orderId: 'A2', amount: -50 },
				{ orderId: 'A3', amount: 200 },
			];

			const { errors } = OrderModel.createMany(batchData);
			expect(errors.length).toBe(1);
			const errFields = errors[0]?.errors.map((err) => err.field);
			expect(errFields).toContain('amount');
		});
	});

	describe('D-4: $qPatch() with @QReadonly + @QDefault', () => {
		test('@QReadonly field cannot be patched', () => {
			const cfg = new ConfigModel({
				env: 'production',
				maxRetries: 3,
				appName: 'MyApp',
			});
			expect(() =>
				cfg.$qPatch({ env: 'staging' } as Partial<IConfig>)
			).toThrow();
		});

		test('@QDefault field can be patched — new value replaces default', () => {
			const cfg = new ConfigModel({ env: 'production', maxRetries: 3 });
			expect(cfg.appName).toBe('MyApp'); // default applied

			cfg.$qPatch({ appName: 'NewApp' });
			expect(cfg.appName).toBe('NewApp'); // patch overrides default
		});

		test('non-readonly field patch succeeds', () => {
			const cfg = new ConfigModel({
				env: 'production',
				maxRetries: 3,
				appName: 'MyApp',
			});
			cfg.$qPatch({ maxRetries: 5 });
			expect(cfg.maxRetries).toBe(5);
		});
	});

	describe('D-5: $qCopy() with @QAlias + @QDefault + @QSensitive', () => {
		const snakeInput = {
			user_id: 'u1',
			createdAt: new Date('2026-01-01'),
		};

		test('original has userId accessible via camelCase', () => {
			const record = new SafeRecordModel(
				snakeInput as unknown as ISafeRecord
			);
			expect(record.userId).toBe('u1');
		});

		test('copy inherits default for sensitive field', () => {
			const record = new SafeRecordModel(
				snakeInput as unknown as ISafeRecord
			);

			// No token provided — default should be applied
			expect(record.token).toBe('(no token)');

			// Copy without providing token — keeps the default
			const copy = record.$qCopy({});
			expect(copy.token).toBe('(no token)');
		});

		test('serialize includes alias key user_id', () => {
			const withToken = {
				user_id: 'u1',
				token: 'secret',
				createdAt: new Date('2026-01-01'),
			};
			const record = new SafeRecordModel(
				withToken as unknown as ISafeRecord
			);

			const serialized = record.$qSerialize() as Record<string, unknown>;
			// alias key should be used in serialization
			expect(serialized['user_id']).toBe('u1');
		});

		test('serialize excludes sensitive token unless includeSensitive', () => {
			const withToken = {
				user_id: 'u1',
				token: 'secret',
				createdAt: new Date('2026-01-01'),
			};
			const record = new SafeRecordModel(
				withToken as unknown as ISafeRecord
			);

			const serialized = record.$qSerialize();
			expect('token' in serialized).toBe(false);

			const full = record.$qSerialize({ includeSensitive: true });
			expect((full as Record<string, unknown>)['token']).toBe('secret');
		});
	});
});

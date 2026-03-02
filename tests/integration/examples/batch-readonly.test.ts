/**
 * Integration tests for examples/batch-readonly.md
 * Validates createMany(), createReadonly(), and related batch/immutability features.
 */
import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QReadonly, ImmutableFieldError } from '@/decorators';

// ─── Models from batch-readonly.md ───────────────────────────────────────────

interface IEmployee {
	id: string;
	name: string;
	email: string;
	salary: number;
	department: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class Employee extends QModel<IEmployee> {
	declare id: string;

	@QRule(
		(val: string) => val.trim().length >= 2,
		'Name must be at least 2 characters'
	)
	declare name: string;

	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Email format is invalid'
	)
	declare email: string;

	@QRule((val: number) => val >= 0, 'Salary cannot be negative')
	declare salary: number;

	declare department: string;
}

interface IRecord {
	id: number;
	status: string;
	lockedAt: string;
}

@Quick({ lockedAt: Date }, { unknownPropertyPolicy: 'keep' })
class Record extends QModel<IRecord> {
	declare id: number;

	@QReadonly()
	declare status: string;

	@QReadonly()
	declare lockedAt: Date;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const importData: IEmployee[] = [
	{
		id: '1',
		name: 'Alice García',
		email: 'alice@company.com',
		salary: 65000,
		department: 'Eng',
	},
	{ id: '2', name: 'B', email: 'bad-email', salary: 70000, department: 'HR' }, // ❌ name + email
	{
		id: '3',
		name: 'Carlos Ruiz',
		email: 'carlos@company.com',
		salary: -500,
		department: 'Fin',
	}, // ❌ salary
	{
		id: '4',
		name: 'Diana Torres',
		email: 'diana@company.com',
		salary: 72000,
		department: 'Mkt',
	},
	{
		id: '5',
		name: 'Eve Martínez',
		email: 'eve@company.com',
		salary: 60000,
		department: 'Eng',
	},
];

describe('Integration: batch creation & readonly example (examples/batch-readonly.md)', () => {
	describe('createMany() — separates valid and invalid', () => {
		it('returns 3 valid instances from 5 items', () => {
			const { instances } = Employee.createMany(importData);
			expect(instances.length).toBe(3);
		});

		it('returns 2 error entries from 5 items', () => {
			const { errors } = Employee.createMany(importData);
			expect(errors.length).toBe(2);
		});

		it('valid instances are Employee model instances', () => {
			const { instances } = Employee.createMany(importData);
			for (const emp of instances) {
				expect(emp).toBeInstanceOf(Employee);
			}
		});

		it('error entries include the row index', () => {
			const { errors } = Employee.createMany(importData);
			const indices = errors.map((err) => err.index);
			expect(indices).toContain(1); // id: '2': index 1
			expect(indices).toContain(2); // id: '3': index 2
		});

		it('error for row 1 (id:2) includes name and email errors', () => {
			const { errors } = Employee.createMany(importData);
			const row1 = errors.find((err) => err.index === 1);
			const fields = row1?.errors.map((err) => err.field) ?? [];
			expect(fields).toContain('name');
			expect(fields).toContain('email');
		});

		it('error for row 2 (id:3) includes salary error', () => {
			const { errors } = Employee.createMany(importData);
			const row2 = errors.find((err) => err.index === 2);
			const fields = row2?.errors.map((err) => err.field) ?? [];
			expect(fields).toContain('salary');
		});

		it('valid instances do not include the invalid rows', () => {
			const { instances } = Employee.createMany(importData);
			const ids = instances.map((emp) => emp.id);
			expect(ids).not.toContain('2');
			expect(ids).not.toContain('3');
		});
	});

	describe('createMany() with includeErrorInstances: true', () => {
		it('returns all 5 instances when includeErrorInstances is true', () => {
			const { instances } = Employee.createMany(importData, {
				includeErrorInstances: true,
			});
			expect(instances.length).toBe(5);
		});

		it('all returned instances are Employee model instances', () => {
			const { instances } = Employee.createMany(importData, {
				includeErrorInstances: true,
			});
			for (const emp of instances) {
				expect(emp).toBeInstanceOf(Employee);
			}
		});
	});

	describe('@QReadonly — immutability via $qCopy() / $qPatch()', () => {
		const record = new Record({
			id: 1,
			status: 'locked',
			lockedAt: '2026-01-01T00:00:00.000Z',
		});

		it('readonly fields are accessible normally on construction', () => {
			expect(record.status).toBe('locked');
			expect(record.lockedAt).toBeInstanceOf(Date);
		});

		it('$qCopy() with a readonly field change throws ImmutableFieldError', () => {
			expect(() => record.$qCopy({ status: 'open' })).toThrow(
				ImmutableFieldError
			);
		});

		it('$qCopy() with only non-readonly fields succeeds', () => {
			const copy = record.$qCopy({ id: 2 });
			expect(copy.id).toBe(2);
			expect(copy.status).toBe('locked'); // preserved
		});

		it('$qPatch() on a readonly field throws ImmutableFieldError', () => {
			const mutable = Record.create({
				id: 1,
				status: 'open',
				lockedAt: '2026-01-01T00:00:00.000Z',
			});
			expect(() => mutable.$qPatch({ status: 'locked' })).toThrow(
				ImmutableFieldError
			);
		});
	});
});

/**
 * Integration tests for @QComputed + serialize + inheritance.
 * Covers: cross-feature/B-4
 *
 * Tests that @QComputed fields appear in $qSerialize(), interact with @QSensitive,
 * and are inherited by child models.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QComputed, QSensitive } from '@/decorators';

// ─── Models from B-4 ─────────────────────────────────────────────────────────

interface IPersonBase {
	firstName: string;
	lastName: string;
	salary: number;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class PersonBase extends QModel<IPersonBase> {
	declare firstName: string;
	declare lastName: string;
	declare salary: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	// NOT decorated — should not appear in serialize
	get initials(): string {
		return `${this.firstName?.[0] ?? '?'}.${this.lastName?.[0] ?? '?'}.`;
	}
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class EmployeeModel extends PersonBase {
	declare department: string;

	@QSensitive()
	declare bonus: number;

	@QComputed()
	@QSensitive()
	get annualCompensation(): number {
		return this.salary + this.bonus;
	}
}

interface IProduct {
	name: string;
	priceNet: number;
	cost: number;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ProductModel extends QModel<IProduct> {
	declare name: string;
	declare priceNet: number;

	@QSensitive()
	declare cost: number;

	@QComputed()
	get margin(): number {
		return Number((this.priceNet - this.cost).toFixed(2));
	}
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: @QComputed + serialize + inheritance (cross-feature/B-4)', () => {
	describe('@QComputed appears in $qSerialize()', () => {
		test('fullName computed is in serialize output', () => {
			const person = new PersonBase({
				firstName: 'Alan',
				lastName: 'Turing',
				salary: 100000,
			});
			const plain = person.$qSerialize() as Record<string, unknown>;
			expect(plain['fullName']).toBe('Alan Turing');
		});

		test('initials (no @QComputed) is NOT in serialize output', () => {
			const person = new PersonBase({
				firstName: 'Alan',
				lastName: 'Turing',
				salary: 100000,
			});
			const plain = person.$qSerialize() as Record<string, unknown>;
			expect(plain['initials']).toBeUndefined();
		});
	});

	describe('@QComputed + @QSensitive — sensitive computed excluded', () => {
		test('annualCompensation computed is excluded by default', () => {
			const emp = new EmployeeModel({
				firstName: 'Alice',
				lastName: 'Smith',
				salary: 80000,
				department: 'Eng',
				bonus: 10000,
			});
			const plain = emp.$qSerialize() as Record<string, unknown>;
			expect(plain['annualCompensation']).toBeUndefined();
		});

		test('annualCompensation is included when includeSensitive: true', () => {
			const emp = new EmployeeModel({
				firstName: 'Alice',
				lastName: 'Smith',
				salary: 80000,
				department: 'Eng',
				bonus: 10000,
			});
			const plain = emp.$qSerialize({ includeSensitive: true }) as Record<
				string,
				unknown
			>;
			expect(plain['annualCompensation']).toBe(90000);
		});
	});

	describe('Child inherits @QComputed from parent', () => {
		test('EmployeeModel.$qSerialize() includes fullName inherited from PersonBase', () => {
			const emp = new EmployeeModel({
				firstName: 'Bob',
				lastName: 'Lee',
				salary: 70000,
				department: 'HR',
				bonus: 5000,
			});
			const plain = emp.$qSerialize() as Record<string, unknown>;
			expect(plain['fullName']).toBe('Bob Lee');
		});

		test('child can access computed from parent on instance', () => {
			const emp = new EmployeeModel({
				firstName: 'Bob',
				lastName: 'Lee',
				salary: 70000,
				department: 'HR',
				bonus: 5000,
			});
			expect(emp.fullName).toBe('Bob Lee');
		});
	});

	describe('@QComputed that depends on @QSensitive field', () => {
		test('margin is computed from raw cost without sensitive exclusion affecting computation', () => {
			const product = new ProductModel({
				name: 'Widget',
				priceNet: 100,
				cost: 60,
			});
			expect(product.margin).toBe(40);
		});

		test('margin appears in serialize since it is not @QSensitive itself', () => {
			const product = new ProductModel({
				name: 'Widget',
				priceNet: 100,
				cost: 60,
			});
			const plain = product.$qSerialize() as Record<string, unknown>;
			expect(plain['margin']).toBe(40);
		});

		test('cost (sensitive) not in default serialize but margin is', () => {
			const product = new ProductModel({
				name: 'Widget',
				priceNet: 100,
				cost: 60,
			});
			const plain = product.$qSerialize() as Record<string, unknown>;
			expect(plain['cost']).toBeUndefined();
			expect(plain['margin']).toBe(40);
		});
	});
});

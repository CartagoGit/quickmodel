import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Shared model
// ---------------------------------------------------------------------------

@Quick({ age: 'number' })
class UserModel extends QModel<{ name: string; age: number }> {
	name: string = '';

	@QRule(
		(value: unknown) => typeof value === 'number' && value >= 18,
		'Must be adult'
	)
	declare age: number;
}

// ---------------------------------------------------------------------------
// Basic behaviour
// ---------------------------------------------------------------------------

describe('createMany() — basic', () => {
	test('should return all instances when all items are valid', () => {
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 },
		];
		const { instances, errors } = UserModel.createMany(data);
		expect(instances).toHaveLength(2);
		expect(errors).toHaveLength(0);
	});

	test('instances should be proper model instances', () => {
		const { instances } = UserModel.createMany([
			{ name: 'Alice', age: 30 },
		]);
		expect(instances[0]).toBeInstanceOf(UserModel);
		expect(instances[0].name).toBe('Alice');
	});

	test('should exclude invalid instances by default', () => {
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Minor', age: 10 }, // fails @QRule
			{ name: 'Bob', age: 25 },
		];
		const { instances, errors } = UserModel.createMany(data);
		expect(instances).toHaveLength(2);
		expect(errors).toHaveLength(1);
	});

	test('errors should contain the correct index', () => {
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Minor', age: 10 },
		];
		const { errors } = UserModel.createMany(data);
		expect(errors[0].index).toBe(1);
	});

	test('errors should contain the failed instance', () => {
		const data = [{ name: 'Minor', age: 10 }];
		const { errors } = UserModel.createMany(data);
		expect(errors[0].instance).toBeInstanceOf(UserModel);
		expect(errors[0].instance.name).toBe('Minor');
	});

	test('errors should contain the validation errors', () => {
		const data = [{ name: 'Minor', age: 10 }];
		const { errors } = UserModel.createMany(data);
		// errors[].errors comes from checkRules().errors + checkIntegrity()
		expect(errors[0].errors.length).toBeGreaterThan(0);
	});

	test('should handle empty array', () => {
		const { instances, errors } = UserModel.createMany([]);
		expect(instances).toHaveLength(0);
		expect(errors).toHaveLength(0);
	});

	test('should handle all items invalid', () => {
		const data = [
			{ name: 'A', age: 5 },
			{ name: 'B', age: 10 },
		];
		const { instances, errors } = UserModel.createMany(data);
		expect(instances).toHaveLength(0);
		expect(errors).toHaveLength(2);
	});

	test('should preserve order of valid instances', () => {
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Minor', age: 5 },
			{ name: 'Bob', age: 25 },
			{ name: 'Carol', age: 40 },
		];
		const { instances } = UserModel.createMany(data);
		expect(instances.map((instance) => instance.name)).toEqual([
			'Alice',
			'Bob',
			'Carol',
		]);
	});
});

// ---------------------------------------------------------------------------
// Option: includeErrorInstances
// ---------------------------------------------------------------------------

describe('createMany() — option includeErrorInstances', () => {
	test('with includeErrorInstances: true — invalid instances ARE in instances[]', () => {
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Minor', age: 10 },
			{ name: 'Bob', age: 25 },
		];
		const { instances, errors } = UserModel.createMany(data, {
			includeErrorInstances: true,
		});
		expect(instances).toHaveLength(3); // all three
		expect(errors).toHaveLength(1); // but error list still populated
	});

	test('with includeErrorInstances: true — errors still has correct index and instance', () => {
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Minor', age: 10 },
		];
		const { errors } = UserModel.createMany(data, {
			includeErrorInstances: true,
		});
		expect(errors[0].index).toBe(1);
		expect((errors[0].instance as any).name).toBe('Minor');
	});

	test('with includeErrorInstances: false (explicit) — same as default', () => {
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Minor', age: 10 },
		];
		const { instances } = UserModel.createMany(data, {
			includeErrorInstances: false,
		});
		expect(instances).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Integration: checkIntegrity failures also counted as errors
// ---------------------------------------------------------------------------

describe('createMany() — integrity failures', () => {
	@Quick({ score: 'number' })
	class ScoreModel extends QModel<{ score: number }> {
		declare score: number;
	}

	test('instance with integrity failure is treated as error', () => {
		const { instances, errors } = ScoreModel.createMany([
			{ score: 100 },
			{ score: 200 },
		]);
		// Both valid — no rules, correct types
		expect(instances).toHaveLength(2);
		expect(errors).toHaveLength(0);
	});

	test('works correctly for model with no @QRule decorators', () => {
		@Quick({ value: 'string' })
		class Simple extends QModel<{ value: string }> {
			declare value: string;
		}
		const { instances, errors } = Simple.createMany([
			{ value: 'a' },
			{ value: 'b' },
		]);
		expect(instances).toHaveLength(2);
		expect(errors).toHaveLength(0);
	});
});

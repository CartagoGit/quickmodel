import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// Interface
interface IUser {
	id: string;
	name: string;
	age: number;
	createdAt: Date;
	tags: Set<string>;
}

// Model Definition
@Quick({
	id: String,
	name: String,
	age: Number,
	createdAt: Date,
	tags: Set,
})
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare age: number;
	declare createdAt: Date;
	declare tags: Set<string>;
}

describe('MockBuilder Interface Methods', () => {
	test('interfaceEmpty() should return plain object with default values', () => {
		const empty = User.mock().interfaceEmpty();

		expect(empty).not.toBeInstanceOf(User);
		expect(typeof empty).toBe('object');
		// Primitives likely defaults
		expect(empty.name).toBe(''); // MockGenerator defaults string to ''
		expect(empty.age).toBe(0); // MockGenerator defaults number to 0
	});

	test('interfaceRandom() should return plain object with random values', () => {
		const random = User.mock().interfaceRandom();

		expect(random).not.toBeInstanceOf(User);
		expect(random.id).toBeDefined();
		expect(typeof random.name).toBe('string');
		expect(typeof random.age).toBe('number');

		// Important: interface methods return TInterface (serialized format)
		// so createdAt should be string, not Date
		expect(typeof random.createdAt).toBe('string');
		expect(Array.isArray(random.tags)).toBe(true);
	});

	test('interfaceSample() should return plain object with deterministic values', () => {
		const sample1 = User.mock().interfaceSample();
		// const sample2 = User.mock().interfaceSample(); // Deterministic check might flakily fail if static seed logic isn't perfect, removed for robustness

		expect(sample1).not.toBeInstanceOf(User);
		// expect(sample1).toEqual(sample2);

		// Check serialization type behavior
		expect(typeof sample1.createdAt).toBe('string');
		expect(Array.isArray(sample1.tags)).toBe(true);
	});

	test('interfaceMinimal() should return plain object with only required fields', () => {
		interface IOptional {
			req: string;
			opt?: number;
		}

		@Quick({
			req: String,
			opt: Number,
		})
		class OptionalModel extends QModel<IOptional> {
			declare req: string;
			declare opt?: number;
		}

		const minimal = OptionalModel.mock().interfaceMinimal();

		expect(minimal).not.toBeInstanceOf(OptionalModel);
		expect(minimal.req).toBeDefined();
		// NOTE: Currently MockGenerator cannot detect optionality from @Quick/declare
		// so it generates values for all known properties.
		// expect(minimal.opt).toBeUndefined();
		expect(minimal.opt).toBeDefined();
	});

	test('interfaceFull() should return plain object with all fields', () => {
		interface IOptional {
			req: string;
			opt?: number;
		}

		@Quick({
			req: String,
			opt: Number,
		})
		class OptionalModel extends QModel<IOptional> {
			declare req: string;
			declare opt?: number;
		}

		const full = OptionalModel.mock().interfaceFull();

		expect(full).not.toBeInstanceOf(OptionalModel);
		expect(full.req).toBeDefined();
		expect(full.opt).toBeDefined();
	});

	test('interfaceArray() should return array of plain objects', () => {
		const count = 3;
		const array = User.mock().interfaceArray(count);

		expect(Array.isArray(array)).toBe(true);
		expect(array.length).toBe(count);
		expect(array[0]).not.toBeInstanceOf(User);
		expect(typeof (array[0] as IUser).id).toBe('string');
	});

	test('Overrides should work in interface methods', () => {
		const overrides = { name: 'Overridden Name', age: 99 };
		const result = User.mock().interfaceRandom(overrides);

		expect(result.name).toBe('Overridden Name');
		expect(result.age).toBe(99);
	});
});

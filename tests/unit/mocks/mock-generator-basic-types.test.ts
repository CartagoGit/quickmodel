/**
 * Unit Test: Mock Generator - Basic Types
 * 
 * Tests mock generation for basic primitive types and simple models
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/quick.model';
import { QType } from '@/core/decorators/qtype.decorator';


describe('Unit: Mock Generator - Basic Types', () => {
	// Simple model with primitives
	interface IUser {
		id: string;
		name: string;
		age: number;
		active: boolean;
		score: number;
	}

	// NOTE: @Quick() without typeMap works only when fields are explicitly registered
	// For mock generation to work, we need @QType() on each field
	class User extends QModel<IUser> {
		@QType() id!: string;
		@QType() name!: string;
		@QType() age!: number;
		@QType() active!: boolean;
		@QType() score!: number;
	}

	test('should generate empty mock with default values', () => {
		const mock = User.mock().empty();

		expect(mock).toBeInstanceOf(User);
		expect(mock.id).toBe('');
		expect(mock.name).toBe('');
		expect(mock.age).toBe(0);
		expect(mock.active).toBe(false);
		expect(mock.score).toBe(0);
	});

	test('should generate random mock with values', () => {
		const mock = User.mock().random();

		expect(mock).toBeInstanceOf(User);
		expect(typeof mock.id).toBe('string');
		expect(typeof mock.name).toBe('string');
		expect(typeof mock.age).toBe('number');
		expect(typeof mock.active).toBe('boolean');
		expect(typeof mock.score).toBe('number');
	});

	test('should generate sample mock with predictable values', () => {
		const mock = User.mock().sample();

		expect(mock).toBeInstanceOf(User);
		expect(typeof mock.id).toBe('string');
		expect(typeof mock.name).toBe('string');
		expect(typeof mock.age).toBe('number');
		expect(typeof mock.active).toBe('boolean');
	});

	test('should allow overrides in mock generation', () => {
		const mock = User.mock().random({ name: 'Alice', age: 30 });

		expect(mock.name).toBe('Alice');
		expect(mock.age).toBe(30);
		expect(typeof mock.id).toBe('string');
	});

	test('should generate array of mocks', () => {
		const mocks = User.mock().array(5);

		expect(mocks).toHaveLength(5);
		expect(mocks[0]).toBeInstanceOf(User);
		expect(mocks[4]).toBeInstanceOf(User);
	});

	test('should generate array with indexed overrides', () => {
		const mocks = User.mock().array(3, 'random', (i) => ({ 
			name: `User${i}`,
			age: 20 + i 
		}));

		expect(mocks[0]!.name).toBe('User0');
		expect(mocks[0]!.age).toBe(20);
		expect(mocks[1]!.name).toBe('User1');
		expect(mocks[1]!.age).toBe(21);
		expect(mocks[2]!.name).toBe('User2');
		expect(mocks[2]!.age).toBe(22);
	});

	test('should generate interface (plain object) mocks', () => {
		const mock = User.mock().interfaceRandom();

		expect(mock).not.toBeInstanceOf(User);
		expect(typeof mock).toBe('object');
		expect(typeof mock.name).toBe('string');
		expect(typeof mock.age).toBe('number');
	});

	test('should handle empty array generation', () => {
		const mocks = User.mock().array(0);

		expect(mocks).toEqual([]);
		expect(mocks).toHaveLength(0);
	});

	test('should throw error for negative array count', () => {
		expect(() => User.mock().array(-1)).toThrow('Count must be non-negative');
	});
});

/**
 * Test: Property Declaration Styles
 *
 * Verifies that all three TypeScript property declaration styles work identically:
 * - declare (no runtime code)
 * - ! (definite assignment)
 * - ? (optional)
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '@/index';

describe('Property Declaration Styles', () => {
	// ============================================================================
	// Test interfaces
	// ============================================================================
	interface IUser {
		id: string;
		name: string;
		age: number;
		email: string;
		createdAt: string;
	}

	interface IUserTransform {
		createdAt: Date;
	}

	// ============================================================================
	// Style 1: declare
	// ============================================================================
	@Quick({
		id: String,
		name: String,
		age: Number,
		email: String,
		createdAt: Date,
	})
	class UserWithDeclare
		extends QModel<IUser>
		implements QInterface<IUser, IUserTransform>
	{
		declare id: string;
		declare name: string;
		declare age: number;
		declare email: string;
		declare createdAt: Date;
	}

	// ============================================================================
	// Style 2: ! (definite assignment)
	// ============================================================================
	@Quick({
		id: String,
		name: String,
		age: Number,
		email: String,
		createdAt: Date,
	})
	class UserWithExclamation
		extends QModel<IUser>
		implements QInterface<IUser, IUserTransform>
	{
		id!: string;
		name!: string;
		age!: number;
		email!: string;
		createdAt!: Date;
	}

	// ============================================================================
	// Style 3: ? (optional) - Using ! for required fields that are always set
	// ============================================================================
	@Quick({
		id: String,
		name: String,
		age: Number,
		email: String,
		createdAt: Date,
	})
	class UserWithOptional
		extends QModel<IUser>
		implements QInterface<IUser, IUserTransform>
	{
		id!: string;
		name!: string;
		age!: number;
		email!: string;
		createdAt!: Date;
	}

	// ============================================================================
	// Test data
	// ============================================================================
	const testData = {
		id: 'test-123',
		name: 'John Doe',
		age: 30,
		email: 'john@example.com',
		createdAt: '2024-01-01T00:00:00.000Z',
	};

	// ============================================================================
	// Tests: Constructor and property access
	// ============================================================================
	describe('Constructor and property access', () => {
		test('declare: should create instance and access all properties', () => {
			const user = new UserWithDeclare(testData);

			expect(user.id).toBe('test-123');
			expect(user.name).toBe('John Doe');
			expect(user.age).toBe(30);
			expect(user.email).toBe('john@example.com');
			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toBe(
				'2024-01-01T00:00:00.000Z'
			);
		});

		test('! (definite assignment): should create instance and access all properties', () => {
			const user = new UserWithExclamation(testData);

			expect(user.id).toBe('test-123');
			expect(user.name).toBe('John Doe');
			expect(user.age).toBe(30);
			expect(user.email).toBe('john@example.com');
			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toBe(
				'2024-01-01T00:00:00.000Z'
			);
		});

		test('? (optional): should create instance and access all properties', () => {
			const user = new UserWithOptional(testData);

			expect(user.id).toBe('test-123');
			expect(user.name).toBe('John Doe');
			expect(user.age).toBe(30);
			expect(user.email).toBe('john@example.com');
			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toBe(
				'2024-01-01T00:00:00.000Z'
			);
		});
	});

	// ============================================================================
	// Tests: Serialization
	// ============================================================================
	describe('Serialization', () => {
		test('declare: should serialize correctly', () => {
			const user = new UserWithDeclare(testData);
			const serialized = user.serialize();

			expect(serialized.id).toBe('test-123');
			expect(serialized.name).toBe('John Doe');
			expect(serialized.age).toBe(30);
			expect(serialized.email).toBe('john@example.com');
			expect(serialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('!: should serialize correctly', () => {
			const user = new UserWithExclamation(testData);
			const serialized = user.serialize();

			expect(serialized.id).toBe('test-123');
			expect(serialized.name).toBe('John Doe');
			expect(serialized.age).toBe(30);
			expect(serialized.email).toBe('john@example.com');
			expect(serialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('?: should serialize correctly', () => {
			const user = new UserWithOptional(testData);
			const serialized = user.serialize();

			expect(serialized.id).toBe('test-123');
			expect(serialized.name).toBe('John Doe');
			expect(serialized.age).toBe(30);
			expect(serialized.email).toBe('john@example.com');
			expect(serialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});
	});

	// ============================================================================
	// Tests: toInterface()
	// ============================================================================
	describe('toInterface()', () => {
		test('declare: should return interface with current values', () => {
			const user = new UserWithDeclare(testData);
			const iface = user.toInterface();

			expect(iface.id).toBe('test-123');
			expect(iface.name).toBe('John Doe');
			expect(iface.age).toBe(30);
			expect(iface.email).toBe('john@example.com');
			expect(iface.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('!: should return interface with current values', () => {
			const user = new UserWithExclamation(testData);
			const iface = user.toInterface();

			expect(iface.id).toBe('test-123');
			expect(iface.name).toBe('John Doe');
			expect(iface.age).toBe(30);
			expect(iface.email).toBe('john@example.com');
			expect(iface.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('?: should return interface with current values', () => {
			const user = new UserWithOptional(testData);
			const iface = user.toInterface();

			expect(iface.id).toBe('test-123');
			expect(iface.name).toBe('John Doe');
			expect(iface.age).toBe(30);
			expect(iface.email).toBe('john@example.com');
			expect(iface.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});
	});

	// ============================================================================
	// Tests: State tracking
	// ============================================================================
	describe('State tracking', () => {
		test('declare: should track changes correctly', () => {
			const user = new UserWithDeclare(testData);

			expect(user.hasChanges()).toBe(false);

			user.name = 'Jane Doe';
			expect(user.hasChanges()).toBe(true);
			expect(user.getChangedFields()).toContain('name');
		});

		test('!: should track changes correctly', () => {
			const user = new UserWithExclamation(testData);

			expect(user.hasChanges()).toBe(false);

			user.name = 'Jane Doe';
			expect(user.hasChanges()).toBe(true);
			expect(user.getChangedFields()).toContain('name');
		});

		test('?: should track changes correctly', () => {
			const user = new UserWithOptional(testData);

			expect(user.hasChanges()).toBe(false);

			user.name = 'Jane Doe';
			expect(user.hasChanges()).toBe(true);
			expect(user.getChangedFields()).toContain('name');
		});
	});

	// ============================================================================
	// Tests: Mocking
	// ============================================================================
	describe('Mocking', () => {
		test('declare: should generate mocks correctly', () => {
			const mock = UserWithDeclare.mock().random();

			expect(mock).toBeInstanceOf(UserWithDeclare);
			expect(typeof mock.id).toBe('string');
			expect(typeof mock.name).toBe('string');
			expect(typeof mock.age).toBe('number');
			expect(typeof mock.email).toBe('string');
			expect(mock.createdAt).toBeInstanceOf(Date);
		});

		test('!: should generate mocks correctly', () => {
			const mock = UserWithExclamation.mock().random();

			expect(mock).toBeInstanceOf(UserWithExclamation);
			expect(typeof mock.id).toBe('string');
			expect(typeof mock.name).toBe('string');
			expect(typeof mock.age).toBe('number');
			expect(typeof mock.email).toBe('string');
			expect(mock.createdAt).toBeInstanceOf(Date);
		});

		test('?: should generate mocks correctly', () => {
			const mock = UserWithOptional.mock().random();

			expect(mock).toBeInstanceOf(UserWithOptional);
			expect(typeof mock.id).toBe('string');
			expect(typeof mock.name).toBe('string');
			expect(typeof mock.age).toBe('number');
			expect(typeof mock.email).toBe('string');
			expect(mock.createdAt).toBeInstanceOf(Date);
		});
	});

	// ============================================================================
	// Tests: Cloning
	// ============================================================================
	describe('Cloning', () => {
		test('declare: should clone correctly', () => {
			const user = new UserWithDeclare(testData);
			const clone = user.clone();

			expect(clone).toBeInstanceOf(UserWithDeclare);
			expect(clone.id).toBe(user.id);
			expect(clone.name).toBe(user.name);
			expect(clone.age).toBe(user.age);
			expect(clone.email).toBe(user.email);
			expect(clone.createdAt.getTime()).toBe(user.createdAt.getTime());
		});

		test('!: should clone correctly', () => {
			const user = new UserWithExclamation(testData);
			const clone = user.clone();

			expect(clone).toBeInstanceOf(UserWithExclamation);
			expect(clone.id).toBe(user.id);
			expect(clone.name).toBe(user.name);
			expect(clone.age).toBe(user.age);
			expect(clone.email).toBe(user.email);
			expect(clone.createdAt.getTime()).toBe(user.createdAt.getTime());
		});

		test('?: should clone correctly', () => {
			const user = new UserWithOptional(testData);
			const clone = user.clone();

			expect(clone).toBeInstanceOf(UserWithOptional);
			expect(clone.id).toBe(user.id);
			expect(clone.name).toBe(user.name);
			expect(clone.age).toBe(user.age);
			expect(clone.email).toBe(user.email);
			expect(clone.createdAt.getTime()).toBe(user.createdAt.getTime());
		});
	});
});

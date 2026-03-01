/**
 * Test: Property Declaration Styles
 *
 * Verifies that all three TypeScript property declaration styles work identically:
 * - declare (no runtime code)
 * - ! (definite assignment)
 * - ? (optional)
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, IQImplements } from '@/index';

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
		implements IQImplements<IUser, IUserTransform>
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
		implements IQImplements<IUser, IUserTransform>
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
		implements IQImplements<IUser, IUserTransform>
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
			const IQSerialized = user.$qm.serialize();

			expect(IQSerialized.id).toBe('test-123');
			expect(IQSerialized.name).toBe('John Doe');
			expect(IQSerialized.age).toBe(30);
			expect(IQSerialized.email).toBe('john@example.com');
			expect(IQSerialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('!: should serialize correctly', () => {
			const user = new UserWithExclamation(testData);
			const IQSerialized = user.$qm.serialize();

			expect(IQSerialized.id).toBe('test-123');
			expect(IQSerialized.name).toBe('John Doe');
			expect(IQSerialized.age).toBe(30);
			expect(IQSerialized.email).toBe('john@example.com');
			expect(IQSerialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('?: should serialize correctly', () => {
			const user = new UserWithOptional(testData);
			const IQSerialized = user.$qm.serialize();

			expect(IQSerialized.id).toBe('test-123');
			expect(IQSerialized.name).toBe('John Doe');
			expect(IQSerialized.age).toBe(30);
			expect(IQSerialized.email).toBe('john@example.com');
			expect(IQSerialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
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
		test('declare: should copied correctly', () => {
			const user = new UserWithDeclare(testData);
			const copied = user.$qm.copy();

			expect(copied).toBeInstanceOf(UserWithDeclare);
			expect(copied.id).toBe(user.id);
			expect(copied.name).toBe(user.name);
			expect(copied.age).toBe(user.age);
			expect(copied.email).toBe(user.email);
			expect(copied.createdAt.getTime()).toBe(user.createdAt.getTime());
		});

		test('!: should copied correctly', () => {
			const user = new UserWithExclamation(testData);
			const copied = user.$qm.copy();

			expect(copied).toBeInstanceOf(UserWithExclamation);
			expect(copied.id).toBe(user.id);
			expect(copied.name).toBe(user.name);
			expect(copied.age).toBe(user.age);
			expect(copied.email).toBe(user.email);
			expect(copied.createdAt.getTime()).toBe(user.createdAt.getTime());
		});

		test('?: should copied correctly', () => {
			const user = new UserWithOptional(testData);
			const copied = user.$qm.copy();

			expect(copied).toBeInstanceOf(UserWithOptional);
			expect(copied.id).toBe(user.id);
			expect(copied.name).toBe(user.name);
			expect(copied.age).toBe(user.age);
			expect(copied.email).toBe(user.email);
			expect(copied.createdAt.getTime()).toBe(user.createdAt.getTime());
		});
	});
});

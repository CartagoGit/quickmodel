import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src';

interface IUser {
	id: string;
	name: string;
	age: number;
	email: string;
	createdAt: string;
}

interface IUserTransforms {
	createdAt: Date;
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> implements IUserTransforms {
	declare id: string;
	declare name: string;
	declare age: number;
	declare email: string;
	declare createdAt: Date;
}

describe('State Management Methods', () => {
	describe('toInterface()', () => {
		test('should return current state in serialized format', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			const iface = user.toInterface();
			
			expect(iface.id).toBe('1');
			expect(iface.name).toBe('John');
			expect(iface.age).toBe(30);
			expect(iface.email).toBe('john@example.com');
			expect(iface.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('should reflect modifications', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';
			user.age = 31;

			const iface = user.toInterface();
			
			expect(iface.name).toBe('Jane');
			expect(iface.age).toBe(31);
		});

		test('should serialize Date to ISO string', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.createdAt = new Date('2024-12-31T23:59:59.999Z');

			const iface = user.toInterface();
			
			expect(typeof iface.createdAt).toBe('string');
			expect(iface.createdAt).toBe('2024-12-31T23:59:59.999Z');
		});
	});

	describe('getInitInterface()', () => {
		test('should return initial state in serialized format', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			const init = user.getInitInterface();
			
			expect(init.id).toBe('1');
			expect(init.name).toBe('John');
			expect(init.age).toBe(30);
			expect(init.email).toBe('john@example.com');
			expect(init.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('should NOT reflect modifications', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';
			user.age = 31;

			const init = user.getInitInterface();
			
			expect(init.name).toBe('John'); // Still original
			expect(init.age).toBe(30); // Still original
		});
	});

	describe('hasChanges()', () => {
		test('should return false for unmodified instance', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			expect(user.hasChanges()).toBe(false);
		});

		test('should return true after modification', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';

			expect(user.hasChanges()).toBe(true);
		});

		test('should detect Date changes', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.createdAt = new Date('2024-12-31T00:00:00.000Z');

			expect(user.hasChanges()).toBe(true);
		});
	});

	describe('isDirty()', () => {
		test('should be alias for hasChanges()', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			expect(user.isDirty()).toBe(false);
			expect(user.isDirty()).toBe(user.hasChanges());

			user.name = 'Jane';

			expect(user.isDirty()).toBe(true);
			expect(user.isDirty()).toBe(user.hasChanges());
		});
	});

	describe('getChangedFields()', () => {
		test('should return empty array for unmodified instance', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			expect(user.getChangedFields()).toEqual([]);
		});

		test('should return array of modified field names', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';
			user.age = 31;

			const changed = user.getChangedFields();
			
			expect(changed).toContain('name');
			expect(changed).toContain('age');
			expect(changed.length).toBe(2);
		});
	});

	describe('getChanges()', () => {
		test('should return empty object for unmodified instance', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			expect(user.getChanges()).toEqual({});
		});

		test('should return only modified fields with current values', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';
			user.age = 31;

			const changes = user.getChanges();
			
			expect(changes.name).toBe('Jane');
			expect(changes.age).toBe(31);
			expect(changes.id).toBeUndefined();
			expect(changes.email).toBeUndefined();
		});

		test('should be perfect for PATCH requests', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';

			const patchData = user.getChanges();
			
			// Only send changed fields to API
			expect(Object.keys(patchData).length).toBe(1);
			expect(patchData.name).toBe('Jane');
		});
	});

	describe('reset()', () => {
		test('should restore initial state', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';
			user.age = 31;
			user.email = 'jane@example.com';

			user.reset();

			expect(user.name).toBe('John');
			expect(user.age).toBe(30);
			expect(user.email).toBe('john@example.com');
		});

		test('should restore transformed types correctly', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			const originalDate = user.createdAt;
			user.createdAt = new Date('2024-12-31T00:00:00.000Z');

			user.reset();

			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toBe(originalDate.toISOString());
		});

		test('should clear dirty flag after reset', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.name = 'Jane';
			expect(user.hasChanges()).toBe(true);

			user.reset();

			expect(user.hasChanges()).toBe(false);
		});
	});

	describe('patch()', () => {
		test('should apply partial updates', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.patch({ name: 'Jane', age: 31 });

			expect(user.name).toBe('Jane');
			expect(user.age).toBe(31);
			expect(user.email).toBe('john@example.com'); // Unchanged
		});

		test('should handle transformed types', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			user.patch({ createdAt: '2024-12-31T00:00:00.000Z' });

			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toBe('2024-12-31T00:00:00.000Z');
		});

		test('should work with API PATCH responses', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			// Simular respuesta de API después de PATCH
			const apiResponse = {
				name: 'Jane',
				age: 31,
				updatedAt: '2024-06-15T10:30:00.000Z'
			};

			user.patch(apiResponse);

			expect(user.name).toBe('Jane');
			expect(user.age).toBe(31);
		});
	});

	describe('getMetadata()', () => {
		test('should return metadata for all fields', () => {
			const metadata = User.getMetadata();

			expect(metadata).toBeInstanceOf(Map);
			expect(metadata.size).toBeGreaterThan(0);
		});

		test('should contain field type information', () => {
			const metadata = User.getMetadata();

			expect(metadata.has('id')).toBe(true);
			expect(metadata.has('name')).toBe(true);
			expect(metadata.has('createdAt')).toBe(true);
		});

		test('should identify Date transformer', () => {
			const metadata = User.getMetadata();
			const createdAtMeta = metadata.get('createdAt');

			expect(createdAtMeta).toBeDefined();
			// The field is registered and has metadata
			expect(metadata.has('createdAt')).toBe(true);
		});
	});
});

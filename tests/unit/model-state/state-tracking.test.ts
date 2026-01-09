import { describe, test, expect } from 'bun:test';
import { Quick, QModel, QInterface } from '@/index';

describe('QModel State Tracking', () => {
	// Test models
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

	@Quick({
		createdAt: Date,
	})
	class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
		declare id: string;
		declare name: string;
		declare age: number;
		declare email: string;
		declare createdAt: Date;
	}

	describe('toInterface() - Current state as primitives', () => {
		test('should return current state with transformed types as primitives', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			const iface = user.toInterface();

			expect(iface.id).toBe('1');
			expect(iface.name).toBe('John');
			expect(iface.age).toBe(30);
			expect(iface.email).toBe('john@example.com');
			expect(typeof iface.createdAt).toBe('string');
			expect(iface.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('should reflect modifications', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';
			user.age = 31;
			user.createdAt = new Date('2024-12-31T00:00:00.000Z');

			const iface = user.toInterface();

			expect(iface.name).toBe('Jane');
			expect(iface.age).toBe(31);
			expect(iface.createdAt).toBe('2024-12-31T00:00:00.000Z');
		});
	});

	describe('getInitInterface() - Initial state as primitives', () => {
		test('should return initial state unchanged', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';
			user.age = 31;

			const init = user.getInitInterface();

			expect(init.name).toBe('John');
			expect(init.age).toBe(30);
			expect(init.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('should return immutable snapshot', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			const init1 = user.getInitInterface();
			const init2 = user.getInitInterface();

			// Different objects (defensive copy)
			expect(init1).not.toBe(init2);
			
			// But same values
			expect(init1).toEqual(init2);
		});
	});

	describe('hasChanges() / isDirty()', () => {
		test('should return false for unmodified instance', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			expect(user.hasChanges()).toBe(false);
			expect(user.isDirty()).toBe(false);
		});

		test('should return true after modification', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';

			expect(user.hasChanges()).toBe(true);
			expect(user.isDirty()).toBe(true);
		});

		test('should detect changes in transformed types', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.createdAt = new Date('2024-12-31T00:00:00.000Z');

			expect(user.hasChanges()).toBe(true);
		});

		test('should return false if changed back to original value', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';
			expect(user.hasChanges()).toBe(true);

			user.name = 'John';
			expect(user.hasChanges()).toBe(false);
		});
	});

	describe('getChangedFields()', () => {
		test('should return empty array for unmodified instance', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			expect(user.getChangedFields()).toEqual([]);
		});

		test('should return only modified field names', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';
			user.age = 31;

			const changed = user.getChangedFields();

			expect(changed).toContain('name');
			expect(changed).toContain('age');
			expect(changed).not.toContain('id');
			expect(changed).not.toContain('email');
			expect(changed.length).toBe(2);
		});

		test('should detect changes in transformed types', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.createdAt = new Date('2024-12-31T00:00:00.000Z');

			expect(user.getChangedFields()).toContain('createdAt');
		});
	});

	describe('getChanges()', () => {
		test('should return empty object for unmodified instance', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			expect(user.getChanges()).toEqual({});
		});

		test('should return only modified fields with current values', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';
			user.age = 31;

			const changes = user.getChanges();

			expect(changes).toEqual({
				name: 'Jane',
				age: 31,
			});
			expect(changes).not.toHaveProperty('id');
			expect(changes).not.toHaveProperty('email');
		});

		test('should return transformed types as primitives', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.createdAt = new Date('2024-12-31T00:00:00.000Z');

			const changes = user.getChanges();

			expect(changes.createdAt).toBe('2024-12-31T00:00:00.000Z');
			expect(typeof changes.createdAt).toBe('string');
		});

		test('should be perfect for PATCH requests', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.email = 'jane@example.com';

			const patchData = user.getChanges();

			// Only send changed fields to API
			expect(Object.keys(patchData)).toEqual(['email']);
			expect(patchData.email).toBe('jane@example.com');
		});
	});

	describe('reset()', () => {
		test('should restore initial state', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';
			user.age = 31;
			user.email = 'jane@example.com';

			user.reset();

			expect(user.name).toBe('John');
			expect(user.age).toBe(30);
			expect(user.email).toBe('john@example.com');
		});

		test('should restore transformed types', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.createdAt = new Date('2024-12-31T00:00:00.000Z');

			user.reset();

			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
		});

		test('should clear dirty flag after reset', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.name = 'Jane';
			expect(user.hasChanges()).toBe(true);

			user.reset();
			expect(user.hasChanges()).toBe(false);
		});

		test('should work with form cancel/undo', () => {
			// Simulate form editing
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			// User edits form
			user.name = 'Jane';
			user.age = 31;
			user.email = 'jane@example.com';

			// User clicks "Cancel" button
			user.reset();

			// Form reverts to original values
			expect(user.name).toBe('John');
			expect(user.age).toBe(30);
			expect(user.email).toBe('john@example.com');
		});
	});

	describe('patch()', () => {
		test('should apply partial updates', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.patch({ name: 'Jane', age: 31 });

			expect(user.name).toBe('Jane');
			expect(user.age).toBe(31);
			expect(user.email).toBe('john@example.com'); // unchanged
			expect(user.id).toBe('1'); // unchanged
		});

		test('should handle transformed types', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
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
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			// Simulate PATCH request to update email
			user.patch({ email: 'newemail@example.com' });

			// Server response applied
			expect(user.email).toBe('newemail@example.com');
			expect(user.name).toBe('John'); // other fields unchanged
		});

		test('should be chainable with other operations', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			user.patch({ name: 'Jane' });
			expect(user.hasChanges()).toBe(true);

			const changes = user.getChanges();
			expect(changes).toEqual({ name: 'Jane' });
		});
	});

	describe('Integration: State tracking workflow', () => {
		test('complete CRUD workflow with change tracking', () => {
			// 1. Create/Read
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			expect(user.hasChanges()).toBe(false);

			// 2. Update (form editing)
			user.name = 'Jane';
			user.age = 31;

			expect(user.isDirty()).toBe(true);
			expect(user.getChangedFields()).toEqual(['name', 'age']);

			// 3. Get changes for PATCH request
			const patchData = user.getChanges();
			expect(patchData).toEqual({ name: 'Jane', age: 31 });

			// 4. Simulate successful save - reset baseline
			// In real app, you'd create new instance from server response
			const saved = new User({
				...user.toInterface(),
			});

			expect(saved.hasChanges()).toBe(false);
		});

		test('form with cancel functionality', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			// User edits form
			user.name = 'Jane';
			user.email = 'jane@example.com';

			// Show "unsaved changes" warning
			if (user.hasChanges()) {
				const changedFields = user.getChangedFields();
				console.log(`Warning: You have unsaved changes to: ${changedFields.join(', ')}`);
			}

			// User clicks cancel
			user.reset();

			// No unsaved changes
			expect(user.hasChanges()).toBe(false);
			expect(user.name).toBe('John');
		});

		test('optimistic UI updates with rollback', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
			});

			// Optimistic update
			user.name = 'Jane';

			// Save initial state for rollback
			const beforeUpdate = user.getInitInterface();

			// Simulate API call failure
			const apiCallFailed = true;

			if (apiCallFailed) {
				// Rollback
				user.reset();
				expect(user.name).toBe('John');
			}
		});
	});
});

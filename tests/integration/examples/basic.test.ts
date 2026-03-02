/**
 * Integration tests for examples/basic.md
 * Validates that all documented snippets compile and produce the expected output.
 */
import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ─── Model from basic.md ─────────────────────────────────────────────────────

interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string;
	updatedAt: string;
}

@Quick({ createdAt: Date, updatedAt: Date }, { unknownPropertyPolicy: 'keep' })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare createdAt: Date;
	declare updatedAt: Date;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Integration: basic example (examples/basic.md)', () => {
	const apiResponse = {
		id: 1,
		name: 'John Doe',
		email: 'john@example.com',
		createdAt: '2026-01-10T10:00:00.000Z',
		updatedAt: '2026-01-10T15:30:00.000Z',
	};

	describe('type transformation on construction', () => {
		it('createdAt is a Date instance', () => {
			const user = new User(apiResponse);
			expect(user.createdAt).toBeInstanceOf(Date);
		});

		it('updatedAt is a Date instance', () => {
			const user = new User(apiResponse);
			expect(user.updatedAt).toBeInstanceOf(Date);
		});

		it('createdAt.getFullYear() returns the correct year', () => {
			const user = new User(apiResponse);
			expect(user.createdAt.getFullYear()).toBe(2026);
		});

		it('primitive fields are passed through unchanged', () => {
			const user = new User(apiResponse);
			expect(user.id).toBe(1);
			expect(user.name).toBe('John Doe');
			expect(user.email).toBe('john@example.com');
		});
	});

	describe('serialization back to plain object', () => {
		it('$qSerialize() returns dates as ISO strings', () => {
			const user = new User(apiResponse);
			const plain = user.$qSerialize();
			expect(plain.createdAt).toBe('2026-01-10T10:00:00.000Z');
			expect(plain.updatedAt).toBe('2026-01-10T15:30:00.000Z');
		});

		it('$qSerialize() preserves primitive fields', () => {
			const user = new User(apiResponse);
			const plain = user.$qSerialize();
			expect(plain.id).toBe(1);
			expect(plain.name).toBe('John Doe');
			expect(plain.email).toBe('john@example.com');
		});
	});

	describe('roundtrip: new User → $qSerialize → new User', () => {
		it('roundtrip preserves Date values', () => {
			const original = new User(apiResponse);
			const serialized = original.$qSerialize();
			const reconstructed = new User(serialized);
			expect(reconstructed.createdAt).toBeInstanceOf(Date);
			expect(reconstructed.createdAt.getTime()).toBe(
				original.createdAt.getTime()
			);
		});

		it('roundtrip preserves primitive values', () => {
			const original = new User(apiResponse);
			const serialized = original.$qSerialize();
			const reconstructed = new User(serialized);
			expect(reconstructed.id).toBe(original.id);
			expect(reconstructed.name).toBe(original.name);
		});
	});

	describe('User.create() static factory', () => {
		it('creates a User instance', () => {
			const user = User.create(apiResponse);
			expect(user).toBeInstanceOf(User);
		});

		it('transforms dates with static create()', () => {
			const user = User.create(apiResponse);
			expect(user.createdAt).toBeInstanceOf(Date);
		});
	});
});

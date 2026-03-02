/**
 * Integration tests for examples/mocks.md
 * Validates that the mock() API generates correct typed instances.
 */
import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ─── Model from mocks.md ──────────────────────────────────────────────────────

interface IUserMock {
	id: string;
	name: string;
	email: string;
	age: number;
	createdAt: string;
	tags: string[];
	isActive: boolean;
}

@Quick({ createdAt: Date, tags: Set }, { unknownPropertyPolicy: 'keep' })
class UserMock extends QModel<IUserMock> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare age: number;
	declare createdAt: Date;
	declare tags: Set<string>;
	declare isActive: boolean;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: mocks example (examples/mocks.md)', () => {
	describe('mock().random() — single random instance', () => {
		it('random() returns a UserMock instance', () => {
			const user = UserMock.mock().random();
			expect(user).toBeInstanceOf(UserMock);
		});

		it('random() createdAt is a Date instance (transformer respected)', () => {
			const user = UserMock.mock().random();
			expect(user.createdAt).toBeInstanceOf(Date);
		});

		it('random() tags is a Set (transformer respected)', () => {
			const user = UserMock.mock().random();
			expect(user.tags).toBeInstanceOf(Set);
		});
	});

	describe('mock().empty() — empty/zero values', () => {
		it('empty() returns a UserMock instance', () => {
			const user = UserMock.mock().empty();
			expect(user).toBeInstanceOf(UserMock);
		});

		it('empty() createdAt is a Date instance (transformer respected)', () => {
			const user = UserMock.mock().empty();
			expect(user.createdAt).toBeInstanceOf(Date);
		});

		it('empty() tags is a Set instance (transformer respected)', () => {
			const user = UserMock.mock().empty();
			expect(user.tags).toBeInstanceOf(Set);
		});
	});

	describe('mock().sample() — deterministic values', () => {
		it('sample() returns a UserMock instance', () => {
			const user = UserMock.mock().sample();
			expect(user).toBeInstanceOf(UserMock);
		});

		it('sample() produces the same values on two calls', () => {
			const user1 = UserMock.mock().sample();
			const user2 = UserMock.mock().sample();
			expect(user1.$qSerialize()).toEqual(user2.$qSerialize());
		});
	});

	describe('mock().array() — arrays of mocks', () => {
		it('array(5) returns 5 UserMock instances', () => {
			const users = UserMock.mock().array(5);
			expect(users.length).toBe(5);
		});

		it('array(5) each element is a UserMock instance', () => {
			const users = UserMock.mock().array(5);
			for (const user of users) {
				expect(user).toBeInstanceOf(UserMock);
			}
		});

		it('array(3, "sample") each element has the same data', () => {
			const samples = UserMock.mock().array(3, 'sample');
			const serialized = samples.map((usr) => usr.$qSerialize());
			expect(serialized[0]).toEqual(serialized[1]);
			expect(serialized[1]).toEqual(serialized[2]);
		});

		it('array(3, "random", overrideFn) applies per-index override', () => {
			const named = UserMock.mock().array(3, 'random', (idx) => ({
				name: `User ${idx + 1}`,
				email: `user${idx + 1}@test.com`,
			}));
			expect(named[0]?.name).toBe('User 1');
			expect(named[2]?.name).toBe('User 3');
		});
	});

	describe('mock() + $qSerialize() roundtrip', () => {
		it('random instance serializes and reconstructs with correct types', () => {
			const original = UserMock.mock().random();
			const serialized = original.$qSerialize();
			const reconstructed = new UserMock(serialized);
			expect(reconstructed.createdAt).toBeInstanceOf(Date);
			expect(reconstructed.tags).toBeInstanceOf(Set);
			expect(reconstructed.createdAt.getTime()).toBe(
				original.createdAt.getTime()
			);
		});
	});
});

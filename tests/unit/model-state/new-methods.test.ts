/**
 * TDD — Tests for new QModel methods:
 *   - toPlain()
 *   - serialize({ pick, omit })
 *   - diff(other)
 *   - equals(other)
 *
 * All tests are written BEFORE the implementation exists.
 * Each test describes the DESIRED behaviour precisely.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';

// ===========================================================================
// Shared fixtures
// ===========================================================================

interface IUser {
	id: string;
	name: string;
	age: number;
	email: string;
	createdAt: string;
	balance: string;
}

@Quick({ createdAt: Date, balance: BigInt })
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare age: number;
	declare email: string;
	declare createdAt: Date;
	declare balance: bigint;
}

interface IProduct {
	sku: string;
	price: number;
	tags: string[];
}

@Quick({})
class Product extends QModel<IProduct> {
	declare sku: string;
	declare price: number;
	declare tags: string[];
}

// ===========================================================================
// toPlain()
// ===========================================================================

describe('QModel.toPlain()', () => {
	test('should return a plain object (not a class instance)', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '999',
		});

		const plain = user.toPlain();

		// Not a QModel instance – just a plain record
		expect(plain).not.toBeInstanceOf(QModel);
		expect(typeof plain).toBe('object');
		expect(plain).not.toBeNull();
	});

	test('should preserve Date as a Date object (NOT convert to string)', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-06-15T10:00:00.000Z',
			balance: '100',
		});

		const plain = user.toPlain();

		// Runtime type → Date stays Date
		expect(plain.createdAt).toBeInstanceOf(Date);
		expect((plain.createdAt as Date).toISOString()).toBe(
			'2024-06-15T10:00:00.000Z'
		);
	});

	test('should preserve bigint as bigint (NOT convert to string)', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '999999999999999',
		});

		const plain = user.toPlain();

		expect(typeof plain.balance).toBe('bigint');
		expect(plain.balance).toBe(999999999999999n);
	});

	test('should include all top-level primitive fields', () => {
		const user = new User({
			id: 'abc',
			name: 'Alice',
			age: 25,
			email: 'alice@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '42',
		});

		const plain = user.toPlain();

		expect(plain.id).toBe('abc');
		expect(plain.name).toBe('Alice');
		expect(plain.age).toBe(25);
		expect(plain.email).toBe('alice@test.com');
	});

	test('toPlain() reflects modifications made after construction', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		const newDate = new Date('2025-12-31T00:00:00.000Z');
		user.createdAt = newDate;
		user.name = 'Jane';

		const plain = user.toPlain();

		expect(plain.name).toBe('Jane');
		expect(plain.createdAt).toBeInstanceOf(Date);
		expect((plain.createdAt as Date).toISOString()).toBe(
			'2025-12-31T00:00:00.000Z'
		);
	});

	test('should NOT include internal QModel properties (__ prefix)', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		const plain = user.toPlain();
		const keys = Object.keys(plain);

		expect(keys.every((key) => !key.startsWith('__'))).toBe(true);
	});

	test('should work with plain (non-transformed) models', () => {
		const product = new Product({
			sku: 'ABC-001',
			price: 29.99,
			tags: ['sale', 'new'],
		});

		const plain = product.toPlain();

		expect(plain.sku).toBe('ABC-001');
		expect(plain.price).toBe(29.99);
		expect(plain.tags).toEqual(['sale', 'new']);
	});

	test('toPlain() result is a new object (not same reference)', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		const plain1 = user.toPlain();
		const plain2 = user.toPlain();

		expect(plain1).not.toBe(plain2);
		expect(plain1).toEqual(plain2);
	});
});

// ===========================================================================
// serialize({ pick, omit })
// ===========================================================================

describe('QModel.$qSerialize() with pick/omit options', () => {
	let user: User;

	beforeEach(() => {
		user = new User({
			id: '42',
			name: 'Bob',
			age: 40,
			email: 'bob@test.com',
			createdAt: '2024-03-15T00:00:00.000Z',
			balance: '55555',
		});
	});

	test('pick: should include ONLY the specified fields', () => {
		const result = user.$qSerialize(undefined, {
			pick: ['id', 'name'],
		}) as Record<string, unknown>;

		expect(result).toEqual({ id: '42', name: 'Bob' });
		expect('age' in result).toBe(false);
		expect('email' in result).toBe(false);
		expect('createdAt' in result).toBe(false);
		expect('balance' in result).toBe(false);
	});

	test('pick: selected transformed fields should still be serialized (Date → ISO string)', () => {
		const result = user.$qSerialize(undefined, {
			pick: ['id', 'createdAt'],
		}) as Record<string, unknown>;

		expect(result).toEqual({
			id: '42',
			createdAt: '2024-03-15T00:00:00.000Z',
		});
	});

	test('pick: selected bigint field should still be serialized (bigint → string)', () => {
		const result = user.$qSerialize(undefined, { pick: ['balance'] });

		expect(typeof result.balance).toBe('string');
		expect(result.balance).toBe('55555');
	});

	test('omit: should exclude ONLY the specified fields', () => {
		const result = user.$qSerialize(undefined, {
			omit: ['createdAt', 'balance'],
		});

		expect('createdAt' in result).toBe(false);
		expect('balance' in result).toBe(false);
		expect(result.id).toBe('42');
		expect(result.name).toBe('Bob');
		expect(result.age).toBe(40);
		expect(result.email).toBe('bob@test.com');
	});

	test('omit: should serialize remaining transformed fields correctly', () => {
		const result = user.$qSerialize(undefined, { omit: ['balance'] });

		// createdAt should still be serialized as ISO string
		expect(typeof result.createdAt).toBe('string');
		expect(result.createdAt).toBe('2024-03-15T00:00:00.000Z');
	});

	test('neither pick nor omit: should serialize all fields as before', () => {
		const result = user.$qSerialize();

		expect(result.id).toBe('42');
		expect(result.name).toBe('Bob');
		expect(result.age).toBe(40);
		expect(result.email).toBe('bob@test.com');
		expect(result.createdAt).toBe('2024-03-15T00:00:00.000Z');
		expect(typeof result.balance).toBe('string');
	});

	test('pick with empty array should return empty object', () => {
		const result = user.$qSerialize(undefined, { pick: [] }) as Record<
			string,
			unknown
		>;

		expect(result).toEqual({});
	});

	test('omit with all field names should return empty object', () => {
		const result = user.$qSerialize(undefined, {
			omit: ['id', 'name', 'age', 'email', 'createdAt', 'balance'],
		}) as Record<string, unknown>;

		expect(result).toEqual({});
	});

	test('pick takes precedence if both pick and omit are provided', () => {
		// pick wins: only id should appear, omit is ignored
		const result = user.$qSerialize(undefined, {
			pick: ['id'],
			omit: ['id', 'name'],
		}) as Record<string, unknown>;

		expect(result).toEqual({ id: '42' });
	});
});

// ===========================================================================
// diff(other)
// ===========================================================================

describe('QModel.$qDiff()', () => {
	test('should return empty object when both instances are equal', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(userA.$qDiff(userB)).toEqual({});
	});

	test('should return changed primitive fields with before/after', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'Jane',
			age: 31,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		const diff = userA.$qDiff(userB);

		expect(Object.keys(diff).sort()).toEqual(['age', 'name']);
		expect(diff.name).toEqual({ before: 'John', after: 'Jane' });
		expect(diff.age).toEqual({ before: 30, after: 31 });
	});

	test('should detect changes in serialized form (Date → ISO string comparison)', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2025-06-15T00:00:00.000Z',
			balance: '100',
		});

		const diff = userA.$qDiff(userB);

		expect('createdAt' in diff).toBe(true);
		expect(diff.createdAt.before).toBe('2024-01-01T00:00:00.000Z');
		expect(diff.createdAt.after).toBe('2025-06-15T00:00:00.000Z');
	});

	test('diff is asymmetric: a.$qDiff(b) has before=a, after=b', () => {
		const userA = new User({
			id: '1',
			name: 'Alice',
			age: 20,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});
		const userB = new User({
			id: '1',
			name: 'Bob',
			age: 25,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		const diffAB = userA.$qDiff(userB);
		const diffBA = userB.$qDiff(userA);

		// From a's perspective: before=Alice, after=Bob
		expect(diffAB.name).toEqual({ before: 'Alice', after: 'Bob' });
		// From b's perspective: before=Bob, after=Alice
		expect(diffBA.name).toEqual({ before: 'Bob', after: 'Alice' });
	});

	test('should detect bigint changes', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '9999',
		});

		const diff = userA.$qDiff(userB);

		expect('balance' in diff).toBe(true);
	});

	test('should NOT include id in diff when both instances have same id', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'Jane',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		const diff = userA.$qDiff(userB);

		expect('id' in diff).toBe(false);
		expect('name' in diff).toBe(true);
	});

	test('diff with plain (non-transformed) models', () => {
		const productA = new Product({ sku: 'ABC', price: 10, tags: ['a'] });
		const productB = new Product({
			sku: 'ABC',
			price: 20,
			tags: ['a', 'b'],
		});

		const diff = productA.$qDiff(productB);

		expect('price' in diff).toBe(true);
		expect(diff.price).toEqual({ before: 10, after: 20 });
		expect('tags' in diff).toBe(true);
	});
});

// ===========================================================================
// equals(other)
// ===========================================================================

describe('QModel.$qEquals()', () => {
	test('should return true for two equal instances', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(userA.$qEquals(userB)).toBe(true);
	});

	test('should return false when any field differs', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 31, // age differs
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(userA.$qEquals(userB)).toBe(false);
	});

	test('equals is symmetric: a.$qEquals(b) === b.$qEquals(a)', () => {
		const userA = new User({
			id: '1',
			name: 'Alice',
			age: 20,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});
		const userB = new User({
			id: '1',
			name: 'Alice',
			age: 20,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		expect(userA.$qEquals(userB)).toBe(userB.$qEquals(userA));
	});

	test('equals is reflexive: a.$qEquals(a) === true', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		expect(userA.$qEquals(userA)).toBe(true);
	});

	test('equals should compare Dates correctly (same moment → true)', () => {
		const isoDate = '2024-06-01T12:00:00.000Z';
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: isoDate,
			balance: '1',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: isoDate,
			balance: '1',
		});

		expect(userA.$qEquals(userB)).toBe(true);
	});

	test('equals should compare Dates correctly (different moment → false)', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2025-01-01T00:00:00.000Z',
			balance: '1',
		});

		expect(userA.$qEquals(userB)).toBe(false);
	});

	test('equals should compare bigint correctly', () => {
		const userA = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const userB = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '999',
		});

		expect(userA.$qEquals(userB)).toBe(false);
	});

	test('copied() result should equal original via equals()', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(user.$qEquals(user.$qCopy())).toBe(true);
	});

	test('equals with plain models and arrays', () => {
		const productA = new Product({ sku: 'X', price: 5, tags: ['a', 'b'] });
		const productB = new Product({ sku: 'X', price: 5, tags: ['a', 'b'] });
		const productC = new Product({ sku: 'X', price: 5, tags: ['a'] });

		expect(productA.$qEquals(productB)).toBe(true);
		expect(productA.$qEquals(productC)).toBe(false);
	});
});

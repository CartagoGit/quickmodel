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

		expect(keys.every((k) => !k.startsWith('__'))).toBe(true);
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

describe('QModel.serialize() with pick/omit options', () => {
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
		const result = user.serialize(undefined, {
			pick: ['id', 'name'],
		}) as Record<string, unknown>;

		expect(result).toEqual({ id: '42', name: 'Bob' });
		expect('age' in result).toBe(false);
		expect('email' in result).toBe(false);
		expect('createdAt' in result).toBe(false);
		expect('balance' in result).toBe(false);
	});

	test('pick: selected transformed fields should still be serialized (Date → ISO string)', () => {
		const result = user.serialize(undefined, {
			pick: ['id', 'createdAt'],
		}) as Record<string, unknown>;

		expect(result).toEqual({
			id: '42',
			createdAt: '2024-03-15T00:00:00.000Z',
		});
	});

	test('pick: selected bigint field should still be serialized (bigint → string)', () => {
		const result = user.serialize(undefined, { pick: ['balance'] });

		expect(typeof result.balance).toBe('string');
		expect(result.balance).toBe('55555');
	});

	test('omit: should exclude ONLY the specified fields', () => {
		const result = user.serialize(undefined, {
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
		const result = user.serialize(undefined, { omit: ['balance'] });

		// createdAt should still be serialized as ISO string
		expect(typeof result.createdAt).toBe('string');
		expect(result.createdAt).toBe('2024-03-15T00:00:00.000Z');
	});

	test('neither pick nor omit: should serialize all fields as before', () => {
		const result = user.serialize();

		expect(result.id).toBe('42');
		expect(result.name).toBe('Bob');
		expect(result.age).toBe(40);
		expect(result.email).toBe('bob@test.com');
		expect(result.createdAt).toBe('2024-03-15T00:00:00.000Z');
		expect(typeof result.balance).toBe('string');
	});

	test('pick with empty array should return empty object', () => {
		const result = user.serialize(undefined, { pick: [] }) as Record<
			string,
			unknown
		>;

		expect(result).toEqual({});
	});

	test('omit with all field names should return empty object', () => {
		const result = user.serialize(undefined, {
			omit: ['id', 'name', 'age', 'email', 'createdAt', 'balance'],
		}) as Record<string, unknown>;

		expect(result).toEqual({});
	});

	test('pick takes precedence if both pick and omit are provided', () => {
		// pick wins: only id should appear, omit is ignored
		const result = user.serialize(undefined, {
			pick: ['id'],
			omit: ['id', 'name'],
		}) as Record<string, unknown>;

		expect(result).toEqual({ id: '42' });
	});
});

// ===========================================================================
// diff(other)
// ===========================================================================

describe('QModel.diff()', () => {
	test('should return empty object when both instances are equal', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(a.diff(b)).toEqual({});
	});

	test('should return changed primitive fields with before/after', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'Jane',
			age: 31,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		const diff = a.diff(b);

		expect(Object.keys(diff).sort()).toEqual(['age', 'name']);
		expect(diff.name).toEqual({ before: 'John', after: 'Jane' });
		expect(diff.age).toEqual({ before: 30, after: 31 });
	});

	test('should detect changes in serialized form (Date → ISO string comparison)', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2025-06-15T00:00:00.000Z',
			balance: '100',
		});

		const diff = a.diff(b);

		expect('createdAt' in diff).toBe(true);
		expect(diff.createdAt.before).toBe('2024-01-01T00:00:00.000Z');
		expect(diff.createdAt.after).toBe('2025-06-15T00:00:00.000Z');
	});

	test('diff is asymmetric: a.diff(b) has before=a, after=b', () => {
		const a = new User({
			id: '1',
			name: 'Alice',
			age: 20,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});
		const b = new User({
			id: '1',
			name: 'Bob',
			age: 25,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		const diffAB = a.diff(b);
		const diffBA = b.diff(a);

		// From a's perspective: before=Alice, after=Bob
		expect(diffAB.name).toEqual({ before: 'Alice', after: 'Bob' });
		// From b's perspective: before=Bob, after=Alice
		expect(diffBA.name).toEqual({ before: 'Bob', after: 'Alice' });
	});

	test('should detect bigint changes', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '9999',
		});

		const diff = a.diff(b);

		expect('balance' in diff).toBe(true);
	});

	test('should NOT include id in diff when both instances have same id', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'Jane',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		const diff = a.diff(b);

		expect('id' in diff).toBe(false);
		expect('name' in diff).toBe(true);
	});

	test('diff with plain (non-transformed) models', () => {
		const a = new Product({ sku: 'ABC', price: 10, tags: ['a'] });
		const b = new Product({ sku: 'ABC', price: 20, tags: ['a', 'b'] });

		const diff = a.diff(b);

		expect('price' in diff).toBe(true);
		expect(diff.price).toEqual({ before: 10, after: 20 });
		expect('tags' in diff).toBe(true);
	});
});

// ===========================================================================
// equals(other)
// ===========================================================================

describe('QModel.equals()', () => {
	test('should return true for two equal instances', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(a.equals(b)).toBe(true);
	});

	test('should return false when any field differs', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 31, // age differs
			email: 'john@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(a.equals(b)).toBe(false);
	});

	test('equals is symmetric: a.equals(b) === b.equals(a)', () => {
		const a = new User({
			id: '1',
			name: 'Alice',
			age: 20,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});
		const b = new User({
			id: '1',
			name: 'Alice',
			age: 20,
			email: 'a@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		expect(a.equals(b)).toBe(b.equals(a));
	});

	test('equals is reflexive: a.equals(a) === true', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});

		expect(a.equals(a)).toBe(true);
	});

	test('equals should compare Dates correctly (same moment → true)', () => {
		const isoDate = '2024-06-01T12:00:00.000Z';
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: isoDate,
			balance: '1',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: isoDate,
			balance: '1',
		});

		expect(a.equals(b)).toBe(true);
	});

	test('equals should compare Dates correctly (different moment → false)', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '1',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2025-01-01T00:00:00.000Z',
			balance: '1',
		});

		expect(a.equals(b)).toBe(false);
	});

	test('equals should compare bigint correctly', () => {
		const a = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});
		const b = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '999',
		});

		expect(a.equals(b)).toBe(false);
	});

	test('clone() result should equal original via equals()', () => {
		const user = new User({
			id: '1',
			name: 'John',
			age: 30,
			email: 'j@test.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			balance: '100',
		});

		expect(user.equals(user.clone())).toBe(true);
	});

	test('equals with plain models and arrays', () => {
		const a = new Product({ sku: 'X', price: 5, tags: ['a', 'b'] });
		const b = new Product({ sku: 'X', price: 5, tags: ['a', 'b'] });
		const c = new Product({ sku: 'X', price: 5, tags: ['a'] });

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});
});

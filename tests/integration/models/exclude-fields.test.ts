import 'reflect-metadata';
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../../src';

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

interface ISession {
	id: string;
	token: string;
}

/** Model with WeakMap in excludeFields */
@Quick({ cache: WeakMap }, { excludeFields: ['cache'] })
class Session extends QModel<ISession> {
	declare id: string;
	declare token: string;
	declare cache: WeakMap<object, any>;
}

interface IAccount {
	id: number;
	name: string;
	password: string;
	internalMeta: string;
}

/** Multiple fields excluded */
@Quick({}, { excludeFields: ['password', 'internalMeta'] })
class Account extends QModel<IAccount> {
	declare id: number;
	declare name: string;
	declare password: string;
	declare internalMeta: string;
}

interface IProduct {
	id: string;
	price: string;
}

/** excludeFields with type transformation */
@Quick({ price: BigInt }, { excludeFields: ['price'] })
class Product extends QModel<IProduct> {
	declare id: string;
	declare price: bigint;
}

interface IChild {
	x: number;
	internal: string;
}

/** No excludeFields on this class */
@Quick({})
class PlainModel extends QModel<IChild> {
	declare x: number;
	declare internal: string;
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('@Quick() excludeFields option', () => {
	describe('basic exclusion from serialization', () => {
		test('excluded field does not appear in toJSON()', () => {
			// cache: [] initiates a real WeakMap (value is not undefined), so the exclusion is meaningful
			const session = new Session({
				id: 'abc',
				token: 'xyz',
				cache: [],
			} as any);
			const json = JSON.parse(session.toJSON());
			expect(json).not.toHaveProperty('cache');
			expect(json).toMatchObject({ id: 'abc', token: 'xyz' });
		});

		test('excluded field does not appear in serialize()', () => {
			const session = new Session({
				id: 'abc',
				token: 'xyz',
				cache: [],
			} as any);
			const result = session.serialize();
			expect(result).not.toHaveProperty('cache');
		});

		test('multiple excludeFields removes all listed fields', () => {
			const account = new Account({
				id: 1,
				name: 'Alice',
				password: 'secret',
				internalMeta: 'debug',
			});
			const json = JSON.parse(account.toJSON());
			expect(json).not.toHaveProperty('password');
			expect(json).not.toHaveProperty('internalMeta');
			expect(json).toMatchObject({ id: 1, name: 'Alice' });
		});

		test('non-excluded fields still appear normally', () => {
			const account = new Account({
				id: 42,
				name: 'Bob',
				password: 'secret',
				internalMeta: 'debug',
			});
			const result = account.serialize() as any;
			expect(result.id).toBe(42);
			expect(result.name).toBe('Bob');
		});

		test('works when excluded field is also a transformed type', () => {
			const product = new Product({ id: 'p1', price: '9999' });
			const json = JSON.parse(product.toJSON());
			expect(json).not.toHaveProperty('price');
			expect(json).toMatchObject({ id: 'p1' });
		});
	});

	describe('excludeFields and deserialization are independent', () => {
		test('excluded field is still populated on the model instance', () => {
			// Pass cache as empty array — WeakMap is created from array of tuples
			const session = new Session({
				id: 'abc',
				token: 'xyz',
				cache: [],
			} as any);
			// excludeFields only affects output — the instance still holds the value
			expect(session.cache).toBeInstanceOf(WeakMap);
		});

		test('excluded string field is still available on the instance', () => {
			const account = new Account({
				id: 1,
				name: 'Alice',
				password: 'secret',
				internalMeta: 'debug',
			});
			expect(account.password).toBe('secret');
			expect(account.internalMeta).toBe('debug');
		});
	});

	describe('models without excludeFields are unaffected', () => {
		test('all fields appear when no excludeFields is set', () => {
			const model = new PlainModel({ x: 5, internal: 'data' });
			const json = JSON.parse(model.toJSON());
			expect(json).toMatchObject({ x: 5, internal: 'data' });
		});
	});

	describe('interaction with runtime omit option', () => {
		test('omit removes additional fields at call time', () => {
			const account = new Account({
				id: 1,
				name: 'Alice',
				password: 'secret',
				internalMeta: 'debug',
			});
			// password already excluded by decorator; also omit 'name' at runtime
			const result = account.serialize(undefined, {
				omit: ['name'],
			}) as any;
			expect(result).not.toHaveProperty('password');
			expect(result).not.toHaveProperty('internalMeta');
			expect(result).not.toHaveProperty('name');
			expect(result).toHaveProperty('id');
		});
	});
});

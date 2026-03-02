// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Tests for QModel.create() factory method
 *
 * Tests the static create() method that provides automatic type-safety
 * without needing explicit property declarations
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('QModel.create() factory method', () => {
	describe('Basic usage', () => {
		test('should create instance with automatic type-safety', () => {
			interface IUser {
				id: number;
				name: string;
				email: string;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class User extends QModel<IUser> {
				declare id: number;
				declare name: string;
				declare email: string;
			}

			const user = User.create({
				id: 1,
				name: 'Alice',
				email: 'alice@example.com',
			});

			expect(user.id).toBe(1);
			expect(user.name).toBe('Alice');
			expect(user.email).toBe('alice@example.com');
			expect(user).toBeInstanceOf(User);
		});

		test('should succeed without @Quick() decorator (Default: Allow Unknown)', () => {
			interface IPerson {
				name: string;
				age: number;
			}

			// Without @Quick, strict mode is DISABLED by default.
			// It should allow properties even if not decorated.
			class Person extends QModel<IPerson> {
				declare name: string;
				declare age: number;
			}

			const person = Person.create({ name: 'Bob', age: 30 });
			expect(person.name).toBe('Bob');
			expect(person.age).toBe(30);
		});
	});

	describe('Type transformations', () => {
		test('should transform Date types', () => {
			interface IPost {
				id: number;
				title: string;
				createdAt: string;
			}

			@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
			class Post extends QModel<IPost> {
				declare id: number;
				declare title: string;
				declare createdAt: Date;
			}

			const post = Post.create({
				id: 1,
				title: 'Hello World',
				createdAt: '2026-01-10T00:00:00.000Z',
			});

			expect(post.id).toBe(1);
			expect(post.title).toBe('Hello World');
			expect(post.createdAt).toBeInstanceOf(Date);
			expect(post.createdAt.getFullYear()).toBe(2026);
		});

		test('should transform BigInt types', () => {
			interface IAccount {
				id: string;
				balance: string;
			}

			@Quick({ balance: BigInt }, { unknownPropertyPolicy: 'keep' })
			class Account extends QModel<IAccount> {
				declare id: string;
				declare balance: bigint;
			}

			const account = Account.create({
				id: 'ACC-1',
				balance: '999999999999999',
			});

			expect(account.id).toBe('ACC-1');
			expect(account.balance).toEqual(999999999999999n);
			expect(typeof account.balance).toBe('bigint');
		});

		test('should transform Set and Map types', () => {
			interface IData {
				tags: string[];
				metadata: [string, string][];
			}

			@Quick(
				{
					tags: Set,
					metadata: Map,
				},
				{ unknownPropertyPolicy: 'keep' }
			)
			class Data extends QModel<IData> {
				declare tags: Set<string>;
				declare metadata: Map<string, string>;
			}

			const data = Data.create({
				tags: ['typescript', 'node'],
				metadata: [
					['key1', 'value1'],
					['key2', 'value2'],
				],
			});

			expect(data.tags).toBeInstanceOf(Set);
			expect(data.tags.size).toBe(2);
			expect(data.tags.has('typescript')).toBe(true);

			expect(data.metadata).toBeInstanceOf(Map);
			expect(data.metadata.size).toBe(2);
			expect(data.metadata.get('key1')).toBe('value1');
		});
	});

	describe('Nested models', () => {
		test('should transform nested models', () => {
			interface IAddress {
				street: string;
				city: string;
			}

			interface IProfile {
				bio: string;
				address: IAddress;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Address extends QModel<IAddress> {
				declare street: string;
				declare city: string;
			}

			@Quick({ address: Address }, { unknownPropertyPolicy: 'keep' })
			class Profile extends QModel<IProfile> {
				declare bio: string;
				declare address: Address;
			}

			const profile = Profile.create({
				bio: 'Developer',
				address: {
					street: '123 Main St',
					city: 'NYC',
				},
			});

			expect(profile.bio).toBe('Developer');
			expect(profile.address).toBeInstanceOf(Address);
			expect(profile.address.street).toBe('123 Main St');
			expect(profile.address.city).toBe('NYC');
		});

		test('should transform arrays of nested models', () => {
			interface IComment {
				text: string;
				author: string;
			}

			interface IBlogPost {
				title: string;
				comments: IComment[];
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Comment extends QModel<IComment> {
				declare text: string;
				declare author: string;
			}

			@Quick({ comments: [Comment] }, { unknownPropertyPolicy: 'keep' })
			class BlogPost extends QModel<IBlogPost> {
				declare title: string;
				declare comments: Comment[];
			}

			const post = BlogPost.create({
				title: 'My Post',
				comments: [
					{ text: 'Great!', author: 'Alice' },
					{ text: 'Thanks!', author: 'Bob' },
				],
			});

			expect(post.title).toBe('My Post');
			expect(post.comments).toHaveLength(2);
			expect(post.comments?.[0]).toBeInstanceOf(Comment);
			expect(post.comments?.[0]?.text).toBe('Great!');
			expect(post.comments?.[1]).toBeInstanceOf(Comment);
			expect(post.comments?.[1]?.author).toBe('Bob');
		});
	});

	describe('Methods and functionality', () => {
		test('should work with custom methods', () => {
			interface IProduct {
				name: string;
				price: number;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Product extends QModel<IProduct> {
				declare name: string;
				declare price: number;

				getFormattedPrice(): string {
					return `$${this.price.toFixed(2)}`;
				}

				getName(): string {
					return this.name;
				}
			}

			const product = Product.create({ name: 'Laptop', price: 999.99 });

			expect(product.name).toBe('Laptop');
			expect(product.price).toBe(999.99);
			expect(product.getFormattedPrice()).toBe('$999.99');
			expect(product.getName()).toBe('Laptop');
		});

		test('should work with toInterface()', () => {
			interface IOrder {
				orderId: string;
				total: number;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Order extends QModel<IOrder> {
				declare orderId: string;
				declare total: number;
			}

			const order = Order.create({ orderId: 'ORD-1', total: 250.5 });
			const plain = order.$qToInterface();

			expect(plain.orderId).toBe('ORD-1');
			expect(plain.total).toBe(250.5);
			expect(plain).not.toBeInstanceOf(Order);
		});

		test('should work with toJSON()', () => {
			interface IItem {
				code: string;
				quantity: number;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Item extends QModel<IItem> {
				declare code: string;
				declare quantity: number;
			}

			const item = Item.create({ code: 'ITEM-1', quantity: 10 });
			const parsed = item.toJSON();

			expect(parsed.code).toBe('ITEM-1');
			expect(parsed.quantity).toBe(10);
		});
	});

	describe('Complex scenarios', () => {
		test('should handle optional properties', () => {
			interface IConfig {
				name: string;
				value?: number;
			}

			// In Strict Mode, optional properties MUST be declared in the schema
			// if we want them to be accepted even if not present in the first usage.
			// We use { value: Number } to register 'value' as a known property.
			@Quick(
				{
					value: Number, // Registers 'value' as known type
				},
				{ unknownPropertyPolicy: 'keep' }
			)
			class Config extends QModel<IConfig> {
				declare name: string;
				declare value?: number;
			}

			const config1 = Config.create({ name: 'setting' } as IConfig);
			const config2 = Config.create({
				name: 'setting',
				value: 42,
			} as IConfig);

			expect(config1.name).toBe('setting');
			expect(config1.value).toBeUndefined();

			expect(config2.name).toBe('setting');
			expect(config2.value).toBe(42);
		});

		test('should handle arrays and collections', () => {
			interface IData {
				numbers: number[];
				strings: string[];
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Data extends QModel<IData> {
				declare numbers: number[];
				declare strings: string[];
			}

			const data = Data.create({
				numbers: [1, 2, 3],
				strings: ['a', 'b', 'c'],
			});

			expect(data.numbers).toEqual([1, 2, 3]);
			expect(data.strings).toEqual(['a', 'b', 'c']);
		});

		test('should handle multiple transformations', () => {
			interface IRecord {
				id: string;
				createdAt: string;
				updatedAt: string;
				balance: string;
				tags: string[];
			}

			@Quick(
				{
					createdAt: Date,
					updatedAt: Date,
					balance: BigInt,
					tags: Set,
				},
				{ unknownPropertyPolicy: 'keep' }
			)
			class Record extends QModel<IRecord> {
				declare id: string;
				declare createdAt: Date;
				declare updatedAt: Date;
				declare balance: bigint;
				declare tags: Set<string>;
			}

			const record = Record.create({
				id: 'REC-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-10T00:00:00.000Z',
				balance: '123456789',
				tags: ['important', 'verified'],
			});

			expect(record.id).toBe('REC-1');
			expect(record.createdAt).toBeInstanceOf(Date);
			expect(record.updatedAt).toBeInstanceOf(Date);
			expect(record.balance).toEqual(123456789n);
			expect(record.tags).toBeInstanceOf(Set);
			expect(record.tags.size).toBe(2);
		});
	});

	describe('Comparison with constructor', () => {
		test('create() and new constructor should behave identically', () => {
			interface IUser {
				id: number;
				name: string;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class UserWithDeclare extends QModel<IUser> {
				declare id: number;
				declare name: string;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class UserWithCreate extends QModel<IUser> {}

			const data = { id: 1, name: 'Alice' };

			const user1 = new UserWithDeclare(data);
			const user2 = UserWithCreate.create(data);

			expect(user1.id).toBe((user2 as unknown as IUser).id); // @quickmodel-rule-ignore: no-as-unknown
			expect(user1.name).toBe((user2 as unknown as IUser).name); // @quickmodel-rule-ignore: no-as-unknown
			expect(user1.$qToInterface()).toEqual(user2.$qToInterface());
		});
	});
});

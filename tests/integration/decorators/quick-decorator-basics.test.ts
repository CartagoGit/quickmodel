/**
 * Integration Test: @Quick() Decorator - Basic Usage
 * 
 * Tests the @Quick() decorator with simple type mappings
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, type QInterface } from '../../../src';

describe('Integration: @Quick() Decorator Basics', () => {
	test('should auto-detect and transform Date types', () => {
		interface IUser {
			id: string;
			name: string;
			createdAt: string;
		}

		interface IUserTransform {
			createdAt: Date;
		}

		@Quick({
			createdAt: Date,
		})
		class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
			id!: string;
			name!: string;
			createdAt!: Date;
		}

		const user = new User({
			id: '1',
			name: 'Alice',
			createdAt: '2024-01-01T00:00:00.000Z',
		});

		expect(user.id).toBe('1');
		expect(user.name).toBe('Alice');
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
	});

	test('should handle multiple type transformations', () => {
		interface IAccount {
			id: string;
			balance: string;
			pattern: string;
			createdAt: string;
		}

		interface IAccountTransform {
			balance: bigint;
			pattern: RegExp;
			createdAt: Date;
		}

		@Quick({
			balance: BigInt,
			pattern: RegExp,
			createdAt: Date,
		})
		class Account extends QModel<IAccount> implements QInterface<IAccount, IAccountTransform> {
			id!: string;
			balance!: bigint;
			pattern!: RegExp;
			createdAt!: Date;
		}

		const account = new Account({
			id: '1',
			balance: '999999',
			pattern: '^test$',
			createdAt: '2024-01-01T00:00:00.000Z',
		});

		expect(account.id).toBe('1');
		expect(account.balance).toBe(999999n);
		expect(account.pattern).toBeInstanceOf(RegExp);
		expect(account.pattern.source).toBe('^test$');
		expect(account.createdAt).toBeInstanceOf(Date);
	});

	test('should work with optional properties', () => {
		interface IPost {
			id: string;
			title: string;
			publishedAt: string | null;
		}

		interface IPostTransform {
			publishedAt: Date | null;
		}

		@Quick({
			publishedAt: Date,
		})
		class Post extends QModel<IPost> implements QInterface<IPost, IPostTransform> {
			id!: string;
			title!: string;
			publishedAt!: Date | null;
		}

		const draft = new Post({
			id: '1',
			title: 'Draft',
			publishedAt: null,
		});

		const published = new Post({
			id: '2',
			title: 'Published',
			publishedAt: '2024-01-01T00:00:00.000Z',
		});

		expect(draft.publishedAt).toBeNull();
		expect(published.publishedAt).toBeInstanceOf(Date);
	});

	test('should preserve properties without type mapping', () => {
		interface IData {
			id: string;
			value: number;
			flag: boolean;
			metadata: Record<string, any>;
		}

		@Quick({})
		class Data extends QModel<IData> implements QInterface<IData> {
			id!: string;
			value!: number;
			flag!: boolean;
			metadata!: Record<string, any>;
		}

		const data = new Data({
			id: '1',
			value: 42,
			flag: true,
			metadata: { key: 'value' },
		});

		expect(data.id).toBe('1');
		expect(data.value).toBe(42);
		expect(data.flag).toBe(true);
		expect(data.metadata).toEqual({ key: 'value' });
	});

	test('should serialize back correctly', () => {
		interface IUser {
			id: string;
			balance: string;
			createdAt: string;
		}

		interface IUserTransform {
			balance: bigint;
			createdAt: Date;
		}

		@Quick({
			balance: BigInt,
			createdAt: Date,
		})
		class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
			id!: string;
			balance!: bigint;
			createdAt!: Date;
		}

		const user = new User({
			id: '1',
			balance: '999',
			createdAt: '2024-01-01T00:00:00.000Z',
		});

		const serialized = user.toInterface();

		expect(serialized.id).toBe('1');
		expect(serialized.balance).toEqual({ __type: 'bigint', value: '999' });
		expect(serialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		expect(typeof serialized.balance).toBe('object');
		expect(typeof serialized.createdAt).toBe('string');
	});

	test('should handle collections', () => {
		interface IData {
			id: string;
			tags: string[];
			metadata: [string, any][];
		}

		interface IDataTransform {
			tags: Set<string>;
			metadata: Map<string, any>;
		}

		@Quick({
			tags: Set,
			metadata: Map,
		})
		class Data extends QModel<IData> implements QInterface<IData, IDataTransform> {
			id!: string;
			tags!: Set<string>;
			metadata!: Map<string, any>;
		}

		const data = new Data({
			id: '1',
			tags: ['tag1', 'tag2'],
			metadata: [
				['key1', 'value1'],
				['key2', 'value2'],
			],
		});

		expect(data.tags).toBeInstanceOf(Set);
		expect(data.tags.has('tag1')).toBe(true);
		expect(data.metadata).toBeInstanceOf(Map);
		expect(data.metadata.get('key1')).toBe('value1');
	});
});

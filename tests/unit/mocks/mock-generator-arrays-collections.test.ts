/**
 * Unit Test: Mock Generator - Arrays and Collections
 * 
 * Tests mock generation for arrays, Sets, Maps, and collections
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '@/index';

describe('Unit: Mock Generator - Arrays and Collections', () => {
	interface IPost {
		id: string;
		title: string;
		tags: string[];
		ratings: number[];
		collaborators: string[];
	}

	@Quick({})
	class Post extends QModel<IPost> {
		id!: string;
		title!: string;
		tags!: string[];
		ratings!: number[];
		collaborators!: string[];
	}

	test('should generate mocks with string arrays', () => {
		const mock = Post.mock().random();

		expect(Array.isArray(mock.tags)).toBe(true);
		expect(mock.tags.length).toBeGreaterThan(0);
		mock.tags.forEach(tag => {
			expect(typeof tag).toBe('string');
		});
	});

	test('should generate mocks with number arrays', () => {
		const mock = Post.mock().random();

		expect(Array.isArray(mock.ratings)).toBe(true);
		expect(mock.ratings.length).toBeGreaterThan(0);
		mock.ratings.forEach(rating => {
			expect(typeof rating).toBe('number');
		});
	});

	test('should generate empty mocks with empty arrays', () => {
		const mock = Post.mock().empty();

		expect(Array.isArray(mock.tags)).toBe(true);
		expect(mock.tags).toEqual([]);
		expect(Array.isArray(mock.ratings)).toBe(true);
		expect(mock.ratings).toEqual([]);
	});

	test('should allow overriding arrays', () => {
		const mock = Post.mock().random({
			tags: ['javascript', 'typescript'],
			ratings: [5, 4, 5],
		});

		expect(mock.tags).toEqual(['javascript', 'typescript']);
		expect(mock.ratings).toEqual([5, 4, 5]);
	});

	// Arrays of nested models
	interface IComment {
		author: string;
		text: string;
		likes: number;
	}

	@Quick({})
	class Comment extends QModel<IComment> {
		author!: string;
		text!: string;
		likes!: number;
	}

	interface IBlogPost {
		id: string;
		title: string;
		comments: IComment[];
	}

	interface IBlogPostTransform {
		comments: Comment[];
	}

	@Quick({
		comments: Comment,
	})
	class BlogPost extends QModel<IBlogPost> implements QInterface<IBlogPost, IBlogPostTransform> {
		id!: string;
		title!: string;
		comments!: Comment[];
	}

	test('should generate mocks with arrays of nested models', () => {
		const mock = BlogPost.mock().random();

		expect(Array.isArray(mock.comments)).toBe(true);
		expect(mock.comments.length).toBeGreaterThan(0);
		mock.comments.forEach(comment => {
			expect(comment).toBeInstanceOf(Comment);
			expect(typeof comment.author).toBe('string');
			expect(typeof comment.text).toBe('string');
			expect(typeof comment.likes).toBe('number');
		});
	});

	test('should allow overriding nested model arrays', () => {
		const customComments = [
			Comment.mock().random({ author: 'Alice', likes: 10 }).serialize(),
			Comment.mock().random({ author: 'Bob', likes: 5 }).serialize(),
		];

		const mock = BlogPost.mock().random({
			comments: customComments,
		});

		expect(mock.comments).toHaveLength(2);
		expect(mock.comments[0]!.author).toBe('Alice');
		expect(mock.comments[0]!.likes).toBe(10);
		expect(mock.comments[1]!.author).toBe('Bob');
		expect(mock.comments[1]!.likes).toBe(5);
	});

	// Map and Set
	interface IDataStore {
		id: string;
		tags: Set<string>;
		metadata: Map<string, unknown>;
	}

	interface IDataStoreTransform {
		tags: Set<string>;
		metadata: Map<string, unknown>;
	}

	@Quick({
		tags: Set,
		metadata: Map,
	})
	class DataStore extends QModel<IDataStore> implements QInterface<IDataStore, IDataStoreTransform> {
		id!: string;
		tags!: Set<string>;
		metadata!: Map<string, unknown>;
	}

	test('should generate mocks with Set', () => {
		const mock = DataStore.mock().random();

		expect(mock.tags).toBeInstanceOf(Set);
		expect(mock.tags.size).toBeGreaterThan(0);
	});

	test('should generate mocks with Map', () => {
		const mock = DataStore.mock().random();

		expect(mock.metadata).toBeInstanceOf(Map);
		expect(mock.metadata.size).toBeGreaterThan(0);
	});

	test('should allow overriding Set and Map', () => {
		const customTags = new Set(['tag1', 'tag2', 'tag3']);
		const customMetadata = new Map<string, unknown>([['key1', 'value1'], ['key2', 123]]);

		const mock = DataStore.mock().random({
			tags: customTags,
			metadata: customMetadata,
		});

		expect(mock.tags.size).toBe(3);
		expect(mock.tags.has('tag1')).toBe(true);
		expect(mock.metadata.size).toBe(2);
		expect(mock.metadata.get('key1')).toBe('value1');
	});
});

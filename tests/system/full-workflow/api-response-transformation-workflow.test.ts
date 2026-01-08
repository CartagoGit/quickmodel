/**
 * System Test: API Response Transformation
 * 
 * Tests complete workflow of receiving API responses,
 * transforming them to models, and sending back to API
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, type QInterface } from '../../../src';

describe('System: API Response Transformation', () => {
	// Simulated API responses (what backend sends)
	const mockApiResponses = {
		user: {
			id: 'usr_123',
			username: 'john_doe',
			email: 'john@example.com',
			createdAt: '2024-01-15T10:30:00.000Z',
			lastLogin: '2024-01-20T15:45:30.500Z',
			metadata: {
				preferences: { theme: 'dark', notifications: true },
				tags: ['premium', 'verified'],
			},
		},
		posts: [
			{
				id: 'post_1',
				title: 'First Post',
				content: 'Hello World',
				authorId: 'usr_123',
				publishedAt: '2024-01-16T08:00:00.000Z',
				tags: ['intro', 'hello'],
				views: '1500',
			},
			{
				id: 'post_2',
				title: 'Second Post',
				content: 'More content',
				authorId: 'usr_123',
				publishedAt: '2024-01-17T09:30:00.000Z',
				tags: ['update'],
				views: '2500',
			},
		],
		stats: {
			totalViews: '4000',
			totalPosts: 2,
			averageViews: '2000',
			lastUpdated: '2024-01-20T16:00:00.000Z',
		},
	};

	// Models
	interface IUser {
		id: string;
		username: string;
		email: string;
		createdAt: string;
		lastLogin: string;
		metadata: {
			preferences: Record<string, unknown>;
			tags: string[];
		};
	}

	interface IUserTransform {
		createdAt: Date;
		lastLogin: Date;
	}

	interface IPost {
		id: string;
		title: string;
		content: string;
		authorId: string;
		publishedAt: string;
		tags: string[];
		views: string; // BigInt
	}

	interface IPostTransform {
		publishedAt: Date;
		views: bigint;
	}

	interface IStats {
		totalViews: string; // BigInt
		totalPosts: number;
		averageViews: string; // BigInt
		lastUpdated: string;
	}

	interface IStatsTransform {
		totalViews: bigint;
		averageViews: bigint;
		lastUpdated: Date;
	}

	@Quick({
		createdAt: Date,
		lastLogin: Date,
	})
	class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
		id!: string;
		username!: string;
		email!: string;
		createdAt!: Date;
		lastLogin!: Date;
		metadata!: {
			preferences: Record<string, unknown>;
			tags: string[];
		};

		getDisplayName(): string {
			return this.username.replace('_', ' ');
		}

		hasTag(tag: string): boolean {
			return this.metadata.tags.includes(tag);
		}
	}

	@Quick({
		publishedAt: Date,
		views: BigInt,
	})
	class Post extends QModel<IPost> implements QInterface<IPost, IPostTransform> {
		id!: string;
		title!: string;
		content!: string;
		authorId!: string;
		publishedAt!: Date;
		tags!: string[];
		views!: bigint;

		getReadingTime(): number {
			const wordsPerMinute = 200;
			const words = this.content.split(/\s+/).length;
			return Math.ceil(words / wordsPerMinute);
		}

		hasTag(tag: string): boolean {
			return this.tags.includes(tag);
		}
	}

	@Quick({
		totalViews: BigInt,
		averageViews: BigInt,
		lastUpdated: Date,
	})
	class Stats extends QModel<IStats> implements QInterface<IStats, IStatsTransform> {
		totalViews!: bigint;
		totalPosts!: number;
		averageViews!: bigint;
		lastUpdated!: Date;
	}

	test('Complete API workflow: fetch → transform → use → serialize → send', () => {
		// STEP 1: Simulate receiving API response
		const apiResponseJson = JSON.stringify(mockApiResponses.user);

		// STEP 2: Transform to model
		const user = User.fromJSON(apiResponseJson);

		// STEP 3: Verify transformation
		expect(user).toBeInstanceOf(User);
		expect(user.id).toBe('usr_123');
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user.lastLogin).toBeInstanceOf(Date);
		expect(user.createdAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
		expect(user.lastLogin.toISOString()).toBe('2024-01-20T15:45:30.500Z');

		// STEP 4: Use model methods
		expect(user.getDisplayName()).toBe('john doe');
		expect(user.hasTag('premium')).toBe(true);
		expect(user.hasTag('basic')).toBe(false);

		// STEP 5: Modify model
		user.metadata.tags.push('active');
		user.lastLogin = new Date();

		// STEP 6: Serialize back for API
		const updatedJson = user.toJSON();
		const parsed = JSON.parse(updatedJson);

		expect(parsed.metadata.tags).toContain('active');
		expect(typeof parsed.lastLogin).toBe('string');
		expect(typeof parsed.createdAt).toBe('string');
	});

	test('Should handle array of API responses', () => {
		// STEP 1: Receive array of posts from API
		const apiResponseJson = JSON.stringify(mockApiResponses.posts);

		// STEP 2: Parse and transform each post
		const postsData = JSON.parse(apiResponseJson);
		const posts = postsData.map((postData: unknown) =>
			Post.deserialize(postData)
		);

		// STEP 3: Verify all posts transformed correctly
		expect(posts.length).toBe(2);
		expect(posts[0]).toBeInstanceOf(Post);
		expect(posts[1]).toBeInstanceOf(Post);

		// STEP 4: Verify data types
		expect(posts[0].publishedAt).toBeInstanceOf(Date);
		expect(posts[0].views).toBe(1500n);
		expect(posts[1].views).toBe(2500n);

		// STEP 5: Use model methods
		expect(posts[0].getReadingTime()).toBeGreaterThan(0);
		expect(posts[0].hasTag('intro')).toBe(true);

		// STEP 6: Transform back to API format
		const serializedPosts = posts.map((post: Post) => JSON.parse(post.toJSON()));

		expect(serializedPosts[0].views).toBe('1500');
		expect(typeof serializedPosts[0].publishedAt).toBe('string');
		expect(serializedPosts[0].tags).toEqual(['intro', 'hello']);
	});

	test('Should handle stats with BigInt calculations', () => {
		// STEP 1: Receive stats from API
		const stats = Stats.deserialize(mockApiResponses.stats);

		// STEP 2: Verify BigInt transformation
		expect(stats.totalViews).toBe(4000n);
		expect(stats.averageViews).toBe(2000n);
		expect(stats.lastUpdated).toBeInstanceOf(Date);

		// STEP 3: Perform calculations
		const viewsAfterUpdate = stats.totalViews + 500n;
		expect(viewsAfterUpdate).toBe(4500n);

		// STEP 4: Update and serialize
		stats.totalViews = viewsAfterUpdate;
		stats.lastUpdated = new Date();

		const serialized = JSON.parse(stats.toJSON());
		expect(serialized.totalViews).toBe('4500');
		expect(typeof serialized.lastUpdated).toBe('string');
	});

	test('Should handle nested API responses', () => {
		// Complex API response with nested data
		const complexResponse = {
			user: mockApiResponses.user,
			posts: mockApiResponses.posts,
			stats: mockApiResponses.stats,
		};

		const json = JSON.stringify(complexResponse);
		const parsed = JSON.parse(json);

		// Transform each part
		const user = User.deserialize(parsed.user);
		const posts = parsed.posts.map((p: unknown) => Post.deserialize(p));
		const stats = Stats.deserialize(parsed.stats);

		// Verify everything transformed correctly
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(posts[0].publishedAt).toBeInstanceOf(Date);
		expect(posts[0].views).toBe(1500n);
		expect(stats.totalViews).toBe(4000n);

		// Verify relationships
		expect(posts[0].authorId).toBe(user.id);
		expect(posts.length).toBe(stats.totalPosts);
	});

	test('Should handle API error responses gracefully', () => {
		// Empty/null responses
		const emptyUser = User.deserialize({
			id: 'usr_empty',
			username: '',
			email: '',
			createdAt: new Date().toISOString(),
			lastLogin: new Date().toISOString(),
			metadata: { preferences: {}, tags: [] },
		});

		expect(emptyUser.username).toBe('');
		expect(emptyUser.metadata.tags).toEqual([]);
	});

	test('Should maintain data integrity through multiple transformations', () => {
		const originalDate = '2024-01-15T10:30:00.000Z';
		const originalViews = '123456789';

		const post = Post.deserialize({
			id: 'post_test',
			title: 'Test',
			content: 'Test content',
			authorId: 'usr_1',
			publishedAt: originalDate,
			tags: ['test'],
			views: originalViews,
		});

		// First transformation
		const json1 = post.toJSON();
		const parsed1 = JSON.parse(json1);

		// Second transformation
		const post2 = Post.fromJSON(json1);
		const json2 = post2.toJSON();
		const parsed2 = JSON.parse(json2);

		// Third transformation
		const post3 = Post.fromJSON(json2);

		// Verify data integrity
		expect(post3.publishedAt.toISOString()).toBe(originalDate);
		expect(post3.views).toBe(123456789n);
		expect(parsed2.publishedAt).toBe(originalDate);
		expect(parsed2.views).toBe(originalViews);
	});

	test('Should handle API pagination metadata', () => {
		interface IPaginatedResponse {
			data: IPost[];
			meta: {
				page: number;
				perPage: number;
				total: string; // BigInt
				lastFetch: string;
			};
		}

		interface IPaginatedResponseTransform {
			data: Post[];
			meta: {
				page: number;
				perPage: number;
				total: bigint;
				lastFetch: Date;
			};
		}

		@Quick({
			data: Post,
			'meta.total': BigInt,
			'meta.lastFetch': Date,
		})
		class PaginatedPosts
			extends QModel<IPaginatedResponse>
			implements QInterface<IPaginatedResponse, IPaginatedResponseTransform>
		{
			data!: Post[];
			meta!: {
				page: number;
				perPage: number;
				total: bigint;
				lastFetch: Date;
			};

			hasNextPage(): boolean {
				const totalPages = Number(this.meta.total) / this.meta.perPage;
				return this.meta.page < Math.ceil(totalPages);
			}
		}

		const paginatedResponse = PaginatedPosts.deserialize({
			data: mockApiResponses.posts,
			meta: {
				page: 1,
				perPage: 10,
				total: '42',
				lastFetch: new Date().toISOString(),
			},
		});

		expect(paginatedResponse.data.length).toBe(2);
		expect(paginatedResponse.data[0]).toBeInstanceOf(Post);
		expect(paginatedResponse.meta.total).toBe(42n);
		expect(paginatedResponse.meta.lastFetch).toBeInstanceOf(Date);
		expect(paginatedResponse.hasNextPage()).toBe(true);
	});
});

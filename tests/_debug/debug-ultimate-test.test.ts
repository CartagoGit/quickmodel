import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import 'reflect-metadata';

describe('Debug Ultimate Test', () => {
	interface ITag {
		name: string;
		priority: string;
	}

	interface IPost {
		id: number;
		title: string;
		tags: ITag[];
		dates: string[];
		metadata: [string, any][];
	}

	interface IUser {
		id: number;
		name: string;
		posts: IPost[][];
		settings: [string, string][];
	}

	@Quick({ priority: BigInt })
	class Tag extends QModel<ITag> {
		declare name: string;
		declare priority: bigint;
	}

	@Quick({
		tags: [Tag],
		dates: [Date],
		metadata: Map,
	})
	class Post extends QModel<IPost> {
		declare id: number;
		declare title: string;
		declare tags: Tag[];
		declare dates: Date[];
		declare metadata: Map<string, any>;
	}

	@Quick({
		posts: [[Post]],
		settings: Map,
	})
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;
		declare posts: Post[][];
		declare settings: Map<string, string>;
	}

	test('Check metadata on User.posts', () => {
		const user = new User({
			id: 1,
			name: 'Test',
			posts: [],
			settings: [],
		});

		const arrayElementClass = Reflect.getMetadata('arrayElementClass', user, 'posts');
		const arrayNestingDepth = Reflect.getMetadata('arrayNestingDepth', user, 'posts');
		const designType = Reflect.getMetadata('design:type', user, 'posts');

		console.log('Metadata for User.posts:');
		console.log('  arrayElementClass:', arrayElementClass);
		console.log('  arrayNestingDepth:', arrayNestingDepth);
		console.log('  designType:', designType);

		expect(arrayElementClass).toBe(Post);
		expect(arrayNestingDepth).toBe(2);
		expect(designType).toBe(Array);
	});

	test('Try to deserialize Post[][]', () => {
		const user = new User({
			id: 1,
			name: 'Test User',
			posts: [
				[
					{
						id: 1,
						title: 'Post 1',
						tags: [{ name: 'tag1', priority: '100' }],
						dates: ['2026-01-01T00:00:00.000Z'],
						metadata: [['key', 'value']],
					},
				],
			],
			settings: [['theme', 'dark']],
		});

		console.log('User.posts:', user.posts);
		console.log('User.posts[0]:', user.posts[0]);
		console.log('User.posts[0][0]:', user.posts[0][0]);
		console.log('Is Post instance?', user.posts[0][0] instanceof Post);

		expect(user.posts[0][0]).toBeInstanceOf(Post);
	});
});

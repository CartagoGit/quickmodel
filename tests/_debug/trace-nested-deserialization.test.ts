import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Debug: Trace deserialization flow', () => {
	interface IPost {
		id: number;
		dates: string[];
	}

	@Quick({ dates: [Date] })
	class Post extends QModel<IPost> {
		declare id: number;
		declare dates: Date[];
	}

	test('Simple Post with dates array', () => {
		console.log('\n=== Creating Post directly ===');
		const post = new Post({
			id: 1,
			dates: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
		});

		console.log('Result:', {
			id: post.id,
			dates: post.dates,
			datesIsArray: Array.isArray(post.dates),
			firstDateType: post.dates[0]?.constructor?.name,
		});

		expect(post.dates).toHaveLength(2);
		expect(post.dates[0]).toBeInstanceOf(Date);
	});

	interface IUser {
		id: number;
		posts: IPost[];
	}

	@Quick({ posts: [Post] })
	class User extends QModel<IUser> {
		declare id: number;
		declare posts: Post[];
	}

	test('User with Post[] containing dates arrays', () => {
		console.log('\n=== Creating User with nested Post[] ===');
		const user = new User({
			id: 1,
			posts: [
				{
					id: 1,
					dates: ['2026-01-01T00:00:00.000Z'],
				},
			],
		});

		console.log('Result:', {
			userId: user.id,
			postsLength: user.posts.length,
			postType: user.posts[0]?.constructor?.name,
			postDates: user.posts[0]?.dates,
			datesIsArray: Array.isArray(user.posts[0]?.dates),
			firstDateType: user.posts[0]?.dates?.[0]?.constructor?.name,
		});

		expect(user.posts[0].dates).toHaveLength(1);
		// This should pass but currently fails
		expect(user.posts[0].dates[0]).toBeInstanceOf(Date);
	});
});

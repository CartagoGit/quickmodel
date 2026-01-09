import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import 'reflect-metadata';

describe('Debug Simple Nested Array', () => {
	interface IComment {
		text: string;
	}

	interface IPost {
		id: number;
		comments: IComment[];
	}

	interface IUser {
		id: number;
		posts: IPost[];
	}

	class Comment extends QModel<IComment> {
		declare text: string;
	}

	@Quick({ comments: [Comment] })
	class Post extends QModel<IPost> {
		declare id: number;
		declare comments: Comment[];
	}

	@Quick({ posts: [Post] })
	class User extends QModel<IUser> {
		declare id: number;
		declare posts: Post[];
	}

	test('Simple Post[] → Comment[]', () => {
		console.log('\n===== Creating User =====');
		const user = new User({
			id: 1,
			posts: [
				{
					id: 1,
					comments: [{ text: 'Comment 1' }],
				},
			],
		});

		console.log('\n===== Checking Results =====');
		console.log('user.posts:', user.posts);
		console.log('user.posts[0]:', user.posts[0]);
		console.log('user.posts[0] instanceof Post:', user.posts[0] instanceof Post);
		console.log('user.posts[0].comments:', user.posts[0]?.comments);
		console.log('user.posts[0].comments[0]:', user.posts[0]?.comments[0]);
		console.log('user.posts[0].comments[0] instanceof Comment:', user.posts[0]?.comments[0] instanceof Comment);

		expect(user.posts[0]).toBeInstanceOf(Post);
		expect(user.posts[0]?.comments[0]).toBeInstanceOf(Comment);
	});
});

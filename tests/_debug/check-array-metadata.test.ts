import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import 'reflect-metadata';

interface IPost {
	id: number;
	title: string;
}

interface IUser {
	id: number;
	posts: IPost[];
}

class Post extends QModel<IPost> {
	id!: number;
	title!: string;
}

@Quick({
	posts: Post,
})
class User extends QModel<IUser> {
	id!: number;
	posts!: Post[];
}

describe('Debug: Array Metadata Registration', () => {
	test('should check what metadata is registered for posts property', () => {
		// Create with empty array first
		const user1 = new User({ id: 1, posts: [] });
		console.log('=== EMPTY ARRAY TEST ===');
		console.log('posts (empty):', user1.posts);
		
		// Now with actual data
		const user2 = new User({ id: 1, posts: [{ id: 1, title: 'Test' }] });

		const designType = Reflect.getMetadata('design:type', user2, 'posts');
		const arrayElementClass = Reflect.getMetadata('arrayElementClass', user2, 'posts');
		const fieldType = Reflect.getMetadata('fieldType', user2, 'posts');

		console.log('=== METADATA DEBUG ===');
		console.log('design:type:', designType);
		console.log('arrayElementClass:', arrayElementClass);
		console.log('fieldType:', fieldType);
		console.log('posts value:', user2.posts);
		console.log('posts[0] instanceof Post:', user2.posts?.[0] instanceof Post);

		expect(arrayElementClass).toBe(Post);
		expect(designType).toBe(Array);
		expect(user2.posts[0]).toBeInstanceOf(Post);
	});
});

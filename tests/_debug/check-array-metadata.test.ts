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

@Quick()
class Post extends QModel<IPost> {
	// Primitivos se auto-detectan en runtime, pero TypeScript necesita los tipos
	declare id: number;
	declare title: string;
}

@Quick({
	posts: [Post]
	// Primitivos (id, title) se auto-detectan, no necesitan dot notation
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

	console.log('\n=== LAZY GETTER DEMO ===');
	console.log('ANTES de acceder a .id:');
	console.log('  post.id (descriptor):', Object.getOwnPropertyDescriptor(user2.posts[0], 'id'));
	console.log('DESPUÉS de acceder a .id:');
	const postId = user2.posts[0]!.id;  // ← Trigger lazy getter
	console.log('  post.id value:', postId);
	console.log('  post.id (descriptor):', Object.getOwnPropertyDescriptor(user2.posts[0], 'id'));
	console.log('  post.title value:', user2.posts[0]!.title);  // ← También funciona

	expect(arrayElementClass).toBe(Post);
	expect(designType).toBe(Array);
	expect(user2.posts[0]).toBeInstanceOf(Post);
	expect(user2.posts[0]!.id).toBe(1);           // ✅ Lazy getter funciona
	expect(user2.posts[0]!.title).toBe('Test');   // ✅ Lazy getter funciona
	});
});

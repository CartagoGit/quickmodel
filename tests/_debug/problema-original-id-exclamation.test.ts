/**
 * Prueba Simple: El Problema Original
 * 
 * Demuestra por qué necesitábamos agregar @Quick() a las clases
 * que usaban la sintaxis id!: number
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('El Problema Original: id! vs declare', () => {
	interface IPost {
		id: number;
		title: string;
	}

	interface IUser {
		id: number;
		posts: IPost[];
	}

	test('❌ PROBLEMA: id! sin @Quick() = undefined', () => {
		class Post extends QModel<IPost> {
			id!: number;
			title!: string;
		}

		const post = new Post({ id: 1, title: 'Test' });

		console.log('\n❌ PROBLEMA ORIGINAL:');
		console.log('post.id:', post.id);
		console.log('post.title:', post.title);

		expect(post.id).toBeUndefined();
		expect(post.title).toBeUndefined();
	});

	test('✅ SOLUCIÓN 1: Agregar @Quick()', () => {
		@Quick()
		class Post extends QModel<IPost> {
			id!: number;
			title!: string;
		}

		const post = new Post({ id: 1, title: 'Test' });

		console.log('\n✅ SOLUCIÓN 1 - Con @Quick():');
		console.log('post.id:', post.id);
		console.log('post.title:', post.title);

		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('✅ SOLUCIÓN 2: Usar declare en vez de !', () => {
		class Post extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		const post = new Post({ id: 1, title: 'Test' });

		console.log('\n✅ SOLUCIÓN 2 - Con declare:');
		console.log('post.id:', post.id);
		console.log('post.title:', post.title);

		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('🔍 CASO REAL: Array de Posts', () => {
		console.log('\n🔍 CASO REAL - Array de Posts:');

		// ❌ Sin @Quick()
		class PostWithout extends QModel<IPost> {
			id!: number;
			title!: string;
		}

		@Quick({
			posts: [PostWithout]
		})
		class UserWithout extends QModel<IUser> {
			id!: number;
			posts!: PostWithout[];
		}

		const user1 = new UserWithout({
			id: 1,
			posts: [{ id: 100, title: 'Post 1' }]
		});

		console.log('Sin @Quick() en Post:');
		console.log('  user.posts[0].id:', user1.posts[0]?.id);
		console.log('  user.posts[0].title:', user1.posts[0]?.title);

		// ✅ Con @Quick()
		@Quick()
		class PostWith extends QModel<IPost> {
			id!: number;
			title!: string;
		}

		@Quick({
			posts: [PostWith]
		})
		class UserWith extends QModel<IUser> {
			id!: number;
			posts!: PostWith[];
		}

		const user2 = new UserWith({
			id: 1,
			posts: [{ id: 100, title: 'Post 1' }]
		});

		console.log('\nCon @Quick() en Post:');
		console.log('  user.posts[0].id:', user2.posts[0]?.id);
		console.log('  user.posts[0].title:', user2.posts[0]?.title);

		// Verificar
		expect(user1.posts[0]?.id).toBeUndefined();  // ❌ No funciona
		expect(user2.posts[0]?.id).toBe(100);        // ✅ Funciona
	});
});

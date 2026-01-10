/**
 * Test: Diferencia entre declare vs ! (definite assignment)
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('declare vs ! (definite assignment)', () => {
	interface IPost {
		id: number;
		title: string;
	}

	test('Sin @Quick() usando declare', () => {
		class PostDeclare extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		const post = new PostDeclare({ id: 1, title: 'Test' });

		console.log('\n=== declare SIN @Quick() ===');
		console.log('post.id:', post.id);
		console.log('post.title:', post.title);
		console.log('Has own property id?', post.hasOwnProperty('id'));
		console.log('Property descriptors:', Object.getOwnPropertyNames(post));

		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('Sin @Quick() usando ! (definite assignment)', () => {
		class PostExclamation extends QModel<IPost> {
			id!: number;
			title!: string;
		}

		const post = new PostExclamation({ id: 1, title: 'Test' });

		console.log('\n=== ! (definite assignment) SIN @Quick() ===');
		console.log('post.id:', post.id);
		console.log('post.title:', post.title);
		console.log('Has own property id?', post.hasOwnProperty('id'));
		console.log('Property descriptors:', Object.getOwnPropertyNames(post));

		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('Sin @Quick() usando ? (optional)', () => {
		class PostOptional extends QModel<IPost> {
			id?: number;
			title?: string;
		}

		const post = new PostOptional({ id: 1, title: 'Test' });

		console.log('\n=== ? (optional) SIN @Quick() ===');
		console.log('post.id:', post.id);
		console.log('post.title:', post.title);
		console.log('Has own property id?', post.hasOwnProperty('id'));
		console.log('Property descriptors:', Object.getOwnPropertyNames(post));

		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('Comparar metadata design:type entre declare y !', () => {
		class PostDeclare extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		class PostExclamation extends QModel<IPost> {
			id!: number;
			title!: string;
		}

		console.log('\n=== Metadata Comparison ===');
		
		// Crear instancias
		const declarePost = new PostDeclare({ id: 1, title: 'Test' });
		const exclamationPost = new PostExclamation({ id: 1, title: 'Test' });

		// Verificar metadata
		console.log('PostDeclare - design:type for id:', 
			Reflect.getMetadata('design:type', declarePost, 'id'));
		console.log('PostExclamation - design:type for id:', 
			Reflect.getMetadata('design:type', exclamationPost, 'id'));

		// Verificar propiedades propias
		console.log('\nPostDeclare own properties:', Object.getOwnPropertyNames(declarePost));
		console.log('PostExclamation own properties:', Object.getOwnPropertyNames(exclamationPost));
	});

	test('Con @Quick() ambos deberían funcionar igual', () => {
		@Quick()
		class PostDeclare extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		@Quick()
		class PostExclamation extends QModel<IPost> {
			id!: number;
			title!: string;
		}

		const declarePost = new PostDeclare({ id: 1, title: 'Test' });
		const exclamationPost = new PostExclamation({ id: 1, title: 'Test' });

		console.log('\n=== Con @Quick() - declare vs ! ===');
		console.log('declare - id:', declarePost.id);
		console.log('! - id:', exclamationPost.id);

		expect(declarePost.id).toBe(1);
		expect(declarePost.title).toBe('Test');
		expect(exclamationPost.id).toBe(1);
		expect(exclamationPost.title).toBe('Test');
	});
});

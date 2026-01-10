/**
 * Test: Diferencia entre QModel con y sin @Quick()
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('QModel with vs without @Quick()', () => {
	interface IPost {
		id: number;
		title: string;
	}

	test('✅ QModel SIN @Quick() - lazy getters se instalan automáticamente', () => {
		// Clase que EXTIENDE QModel pero NO tiene @Quick()
		class PostWithoutQuick extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		const post = new PostWithoutQuick({ id: 1, title: 'Test' });

		// Actualización: QModel ahora instala lazy getters automáticamente
		// incluso sin @Quick(), usando las claves del objeto data
		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('✅ QModel CON @Quick() - propiedades funcionan', () => {
		// Clase que EXTIENDE QModel CON @Quick()
		@Quick()
		class PostWithQuick extends QModel<IPost> {
			declare id: number;
			declare title: string;
		}

		const post = new PostWithQuick({ id: 1, title: 'Test' });

		// Con @Quick(), los lazy getters se instalan correctamente
		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('✅ Clase externa SIN QModel - funciona sin @Quick()', () => {
		// Clase que NO extiende QModel (clase externa)
		class ExternalPost {
			id!: number;
			title!: string;

			constructor(data: any) {
				Object.assign(this, data);
			}
		}

		const post = new ExternalPost({ id: 1, title: 'Test' });

		// Clase externa maneja sus propias propiedades
		expect(post.id).toBe(1);
		expect(post.title).toBe('Test');
	});

	test('✅ Clase externa usada en QModel - funciona correctamente', () => {
		// Clase externa (simulando una librería)
		class ExternalPost {
			id!: number;
			title!: string;

			constructor(data: any) {
				Object.assign(this, data);
			}
		}

		interface IUser {
			userId: number;
			post: any;
		}

		// QModel usando clase externa
		@Quick({
			post: ExternalPost,
		})
		class User extends QModel<IUser> {
			userId!: number;
			post!: ExternalPost;
		}

		const user = new User({
			userId: 1,
			post: { id: 100, title: 'Test Post' },
		});

		expect(user.userId).toBe(1);
		expect(user.post).toBeInstanceOf(ExternalPost);
		expect(user.post.id).toBe(100);
		expect(user.post.title).toBe('Test Post');
	});
});

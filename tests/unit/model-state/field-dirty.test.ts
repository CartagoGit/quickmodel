/**
 * TDD Tests: merge() and isDirty(field?) methods
 *
 * RED phase — estas casuísticas deben fallar inicialmente porque:
 * - isDirty() existe SIN argumento de campo
 * - merge() NO existe aún (solo existe patch() que muta en lugar)
 */
import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

// ============================================================
// MODELOS DE PRUEBA
// ============================================================

interface IUser {
	id: string;
	name: string;
	age: number;
	email: string;
	active: boolean;
	createdAt: string;
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare age: number;
	declare email: string;
	declare active: boolean;
	declare createdAt: Date;
}

interface IOrder {
	id: number;
	total: string;
	note?: string;
}

@Quick({ total: BigInt })
class Order extends QModel<IOrder> {
	declare id: number;
	declare total: bigint;
	declare note?: string;
}

// ============================================================
// SUITE: isDirty(field?)
// ============================================================
describe('QModel — isDirty(field?)', () => {
	describe('sin argumento (comportamiento existente — debe seguir funcionando)', () => {
		test('false cuando no hay cambios', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			expect(user.$qIsDirty()).toBe(false);
		});

		test('true cuando hay cambios', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.name = 'Jane';
			expect(user.$qIsDirty()).toBe(true);
		});
	});

	describe('con nombre de campo — isDirty(field)', () => {
		test('false para campo que no ha cambiado', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.name = 'Jane';
			expect(user.$qIsDirty('email')).toBe(false);
			expect(user.$qIsDirty('age')).toBe(false);
			expect(user.$qIsDirty('id')).toBe(false);
		});

		test('true para el campo que cambió', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.name = 'Jane';
			expect(user.$qIsDirty('name')).toBe(true);
		});

		test('true para campo Date que cambió', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.createdAt = new Date('2025-06-15T00:00:00.000Z');
			expect(user.$qIsDirty('createdAt')).toBe(true);
			expect(user.$qIsDirty('name')).toBe(false);
		});

		test('false para campo Date que NO cambió', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.name = 'Jane';
			expect(user.$qIsDirty('createdAt')).toBe(false);
		});

		test('true para campo BigInt que cambió', () => {
			const order = new Order({ id: 1, total: '1000' });
			order.total = 9999n;
			expect(order.$qIsDirty('total')).toBe(true);
			expect(order.$qIsDirty('id')).toBe(false);
		});

		test('false para campo opcional que no estaba y sigue sin estar', () => {
			const order = new Order({ id: 1, total: '500' });
			expect(order.$qIsDirty('note')).toBe(false);
		});

		test('true para campo opcional que se añadió', () => {
			const order = new Order({ id: 1, total: '500' });
			order.note = 'express';
			expect(order.$qIsDirty('note')).toBe(true);
		});

		test('false para campo inexistente — no lanza, solo devuelve false', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			expect(() =>
				user.$qIsDirty('nonExistentField' as any)
			).not.toThrow();
			expect(user.$qIsDirty('nonExistentField' as any)).toBe(false);
		});

		test('varios campos cambiados — solo los correctos aparecen como dirty', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.name = 'Jane';
			user.age = 31;

			expect(user.$qIsDirty('name')).toBe(true);
			expect(user.$qIsDirty('age')).toBe(true);
			expect(user.$qIsDirty('email')).toBe(false);
			expect(user.$qIsDirty('active')).toBe(false);
		});

		test('después de reset(), ningún campo está dirty', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.name = 'Jane';
			user.age = 31;
			expect(user.$qIsDirty('name')).toBe(true);

			user.$qReset();

			expect(user.$qIsDirty()).toBe(false);
			expect(user.$qIsDirty('name')).toBe(false);
			expect(user.$qIsDirty('age')).toBe(false);
		});

		test('después de patch(), solo los campos parcheados están dirty', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.$qPatch({ name: 'Jane' });

			expect(user.$qIsDirty('name')).toBe(true);
			expect(user.$qIsDirty('email')).toBe(false);
		});
	});
});

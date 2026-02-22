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

interface IAddress {
	street: string;
	city: string;
}

interface IEmployee {
	id: string;
	name: string;
	address: IAddress;
}

@Quick({ address: Object })
class Employee extends QModel<IEmployee> {
	declare id: string;
	declare name: string;
	declare address: IAddress;
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
			expect(user.isDirty()).toBe(false);
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
			expect(user.isDirty()).toBe(true);
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
			expect(user.isDirty('email')).toBe(false);
			expect(user.isDirty('age')).toBe(false);
			expect(user.isDirty('id')).toBe(false);
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
			expect(user.isDirty('name')).toBe(true);
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
			expect(user.isDirty('createdAt')).toBe(true);
			expect(user.isDirty('name')).toBe(false);
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
			expect(user.isDirty('createdAt')).toBe(false);
		});

		test('true para campo BigInt que cambió', () => {
			const order = new Order({ id: 1, total: '1000' });
			order.total = 9999n;
			expect(order.isDirty('total')).toBe(true);
			expect(order.isDirty('id')).toBe(false);
		});

		test('false para campo opcional que no estaba y sigue sin estar', () => {
			const order = new Order({ id: 1, total: '500' });
			expect(order.isDirty('note')).toBe(false);
		});

		test('true para campo opcional que se añadió', () => {
			const order = new Order({ id: 1, total: '500' });
			order.note = 'express';
			expect(order.isDirty('note')).toBe(true);
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
			expect(() => user.isDirty('nonExistentField' as any)).not.toThrow();
			expect(user.isDirty('nonExistentField' as any)).toBe(false);
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

			expect(user.isDirty('name')).toBe(true);
			expect(user.isDirty('age')).toBe(true);
			expect(user.isDirty('email')).toBe(false);
			expect(user.isDirty('active')).toBe(false);
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
			expect(user.isDirty('name')).toBe(true);

			user.reset();

			expect(user.isDirty()).toBe(false);
			expect(user.isDirty('name')).toBe(false);
			expect(user.isDirty('age')).toBe(false);
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
			user.patch({ name: 'Jane' });

			expect(user.isDirty('name')).toBe(true);
			expect(user.isDirty('email')).toBe(false);
		});
	});
});

// ============================================================
// SUITE: merge(partial) — inmutable
// ============================================================
describe('QModel — merge(partial)', () => {
	describe('retorna nueva instancia (inmutabilidad)', () => {
		test('devuelve objeto diferente al original', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane' });
			expect(merged).not.toBe(user);
		});

		test('es instancia de la misma clase', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane' });
			expect(merged).toBeInstanceOf(User);
		});

		test('el original NO se modifica', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			user.merge({ name: 'Jane', age: 99 });
			expect(user.name).toBe('John');
			expect(user.age).toBe(30);
		});
	});

	describe('valores en la nueva instancia', () => {
		test('los campos del patch se actualizan en la nueva instancia', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane', age: 31 });
			expect(merged.name).toBe('Jane');
			expect(merged.age).toBe(31);
		});

		test('los campos no incluidos conservan el valor original', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane' });
			expect(merged.id).toBe('1');
			expect(merged.email).toBe('j@e.com');
			expect(merged.active).toBe(true);
		});

		test('los campos de tipo Date se transforman correctamente', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({
				createdAt: '2025-06-15T00:00:00.000Z',
			});
			expect(merged.createdAt).toBeInstanceOf(Date);
			expect(merged.createdAt.toISOString()).toBe(
				'2025-06-15T00:00:00.000Z'
			);
		});

		test('los campos de tipo BigInt se transforman correctamente', () => {
			const order = new Order({ id: 1, total: '1000' });
			const merged = order.merge({ total: '9999' });
			expect(typeof merged.total).toBe('bigint');
			expect(merged.total).toBe(9999n);
		});

		test('merge vacío equivale a clone()', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({});
			expect(merged).not.toBe(user);
			expect(merged.name).toBe(user.name);
			expect(merged.age).toBe(user.age);
			expect(merged.email).toBe(user.email);
		});
	});

	describe('estado de la nueva instancia', () => {
		test('la nueva instancia NO está dirty (merge = nuevo estado inicial)', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane' });
			expect(merged.isDirty()).toBe(false);
		});

		test('la nueva instancia tiene su propia historia — reset vuelve al estado del merge', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane' });

			merged.name = 'Bob';
			expect(merged.isDirty()).toBe(true);

			merged.reset();
			// Después del reset, vuelve a 'Jane' (estado del merge), NO a 'John'
			expect(merged.name).toBe('Jane');
			expect(merged.isDirty()).toBe(false);
		});

		test('encadenar merges funciona correctamente', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const v2 = user.merge({ name: 'Jane' });
			const v3 = v2.merge({ age: 99 });

			expect(v3.name).toBe('Jane');
			expect(v3.age).toBe(99);
			expect(v3.email).toBe('j@e.com');
			// Todos son independientes
			expect(user.name).toBe('John');
			expect(v2.age).toBe(30);
		});
	});

	describe('serialize/toInterface en la nueva instancia', () => {
		test('serialize() refleja los valores merged', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane', age: 31 });
			const serialized = merged.serialize();
			expect(serialized.name).toBe('Jane');
			expect(serialized.age).toBe(31);
			expect(serialized.email).toBe('j@e.com');
		});

		test('diff() entre original y merged muestra solo los campos cambiados', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30,
				email: 'j@e.com',
				active: true,
				createdAt: '2024-01-01T00:00:00.000Z',
			});
			const merged = user.merge({ name: 'Jane' });
			const d = user.diff(merged);
			expect(Object.keys(d)).toEqual(['name']);
			expect(d.name).toEqual({ before: 'John', after: 'Jane' });
		});
	});
});

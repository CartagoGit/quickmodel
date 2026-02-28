// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * TDD Tests: QModelCollection<T>
 *
 * RED phase — QModelCollection does not exist yet.
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QModelCollection } from '@/core/models/quick-collection.model';

// ============================================================
// MODELOS DE PRUEBA
// ============================================================

interface IUser {
	id: number;
	name: string;
	role: string;
	age: number;
	active: boolean;
}

@Quick()
class UserModel extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare role: string;
	declare age: number;
	declare active: boolean;
}

const SEED = [
	{ id: 1, name: 'Alice', role: 'admin', age: 30, active: true },
	{ id: 2, name: 'Bob', role: 'user', age: 25, active: true },
	{ id: 3, name: 'Carol', role: 'user', age: 35, active: false },
	{ id: 4, name: 'Dave', role: 'admin', age: 28, active: true },
	{ id: 5, name: 'Eve', role: 'user', age: 22, active: false },
];

// ============================================================
// TESTS
// ============================================================

describe('QModelCollection — construcción', () => {
	it('QModelCollection.from() crea una colección desde un array de datos', () => {
		const col = QModelCollection.from(UserModel, SEED);
		expect(col).toBeInstanceOf(QModelCollection);
	});

	it('size devuelve el número de elementos', () => {
		const col = QModelCollection.from(UserModel, SEED);
		expect(col.size).toBe(5);
	});

	it('toArray() devuelve instancias de la clase modelo', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const arr = col.toArray();
		expect(arr).toHaveLength(5);
		expect(arr[0]).toBeInstanceOf(UserModel);
	});

	it('User.collection() es alias estático de QModelCollection.from()', () => {
		const col = UserModel.collection(SEED);
		expect(col).toBeInstanceOf(QModelCollection);
		expect(col.size).toBe(5);
	});
});

describe('QModelCollection — filtrado y búsqueda', () => {
	it('where() filtra por predicado', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const admins = col.where((usr) => usr.role === 'admin');
		expect(admins.size).toBe(2);
		admins.toArray().forEach((usr) => expect(usr.role).toBe('admin'));
	});

	it('where() devuelve una nueva colección (no muta la original)', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const filtered = col.where((usr) => usr.active);
		expect(col.size).toBe(5);
		expect(filtered.size).toBe(3);
	});

	it('where() chaining funciona correctamente', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col
			.where((usr) => usr.active)
			.where((usr) => usr.role === 'admin');
		expect(result.size).toBe(2);
	});

	it('find() devuelve el primer elemento que cumple el predicado', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const user = col.find((usr) => usr.name === 'Bob');
		expect(user).toBeInstanceOf(UserModel);
		expect(user?.name).toBe('Bob');
	});

	it('find() devuelve undefined cuando no hay coincidencia', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const user = col.find((usr) => usr.name === 'Zoe');
		expect(user).toBeUndefined();
	});
});

describe('QModelCollection — ordenación', () => {
	it('sortBy() ordena ascendente por campo string', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.sortBy('name');
		const names = sorted.toArray().map((usr) => usr.name);
		expect(names).toEqual([...names].sort());
	});

	it('sortBy() ordena ascendente por campo numérico', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.sortBy('age');
		const ages = sorted.toArray().map((usr) => usr.age);
		expect(ages).toEqual([...ages].sort((lhs, rhs) => lhs - rhs));
	});

	it('sortBy() con desc: true ordena descendente', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.sortBy('age', { desc: true });
		const ages = sorted.toArray().map((usr) => usr.age);
		expect(ages[0]).toBeGreaterThan(ages[ages.length - 1]);
	});

	it('sortBy() devuelve una nueva colección sin mutar', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.sortBy('name');
		expect(col.toArray()[0]?.name).toBe('Alice'); // original inalterado
		expect(sorted.toArray()[0]?.name).toBe('Alice'); // coincide — Alice es la primera
	});
});

describe('QModelCollection — paginación', () => {
	it('paginate() devuelve la primera página', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.paginate(1, 2);
		expect(page.size).toBe(2);
		expect(page.toArray()[0]?.name).toBe('Alice');
	});

	it('paginate() devuelve la segunda página', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.paginate(2, 2);
		expect(page.size).toBe(2);
		expect(page.toArray()[0]?.name).toBe('Carol');
	});

	it('paginate() última página puede ser incompleta', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.paginate(3, 2);
		expect(page.size).toBe(1);
	});

	it('paginate() página fuera de rango devuelve colección vacía', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.paginate(10, 2);
		expect(page.size).toBe(0);
	});
});

describe('QModelCollection — agrupación', () => {
	it('groupBy() agrupa por campo', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const grouped = col.groupBy('role');
		expect(Object.keys(grouped)).toHaveLength(2);
		expect(grouped['admin']).toHaveLength(2);
		expect(grouped['user']).toHaveLength(3);
	});

	it('groupBy() devuelve instancias del modelo en los grupos', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const grouped = col.groupBy('role');
		expect(grouped['admin']?.[0]).toBeInstanceOf(UserModel);
	});
});

describe('QModelCollection — serialización', () => {
	it('serialize() devuelve un array de plain objects', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col.serialize();
		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(5);
		const first = result[0];
		expect(first && typeof first === 'object' && 'id' in first).toBe(true);
	});

	it('serialize() aplica las opciones a cada elemento', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col.serialize({ pick: ['id', 'name'] });
		const first = result[0];
		expect(Object.keys(first)).toEqual(
			expect.arrayContaining(['id', 'name'])
		);
		expect(first['role']).toBeUndefined();
	});

	it('toJSON() devuelve un JSON string de array', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const json = col.toJSON();
		const parsed = JSON.parse(json) as unknown[];
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(5);
	});
});

describe('QModelCollection — validación', () => {
	it('checkAllRules() devuelve valid:true si no hay reglas ni errores', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col.checkAllRules();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

describe('QModelCollection — colección vacía', () => {
	it('from() con array vacío crea colección de size 0', () => {
		const col = QModelCollection.from(UserModel, []);
		expect(col.size).toBe(0);
		expect(col.toArray()).toHaveLength(0);
	});

	it('serialize() en colección vacía devuelve array vacío', () => {
		const col = QModelCollection.from(UserModel, []);
		expect(col.serialize()).toHaveLength(0);
	});

	it('where() en colección vacía devuelve colección vacía', () => {
		const col = QModelCollection.from(UserModel, []);
		expect(col.where(() => true).size).toBe(0);
	});
});

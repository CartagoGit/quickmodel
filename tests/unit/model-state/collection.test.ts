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

	it('$qSize devuelve el número de elementos', () => {
		const col = QModelCollection.from(UserModel, SEED);
		expect(col.$qSize).toBe(5);
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
		expect(col.$qSize).toBe(5);
	});
});

describe('QModelCollection — filtrado y búsqueda', () => {
	it('$qWhere() filtra por predicado', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const admins = col.$qWhere((usr) => usr.role === 'admin');
		expect(admins.$qSize).toBe(2);
		admins.toArray().forEach((usr) => expect(usr.role).toBe('admin'));
	});

	it('$qWhere() devuelve una nueva colección (no muta la original)', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const filtered = col.$qWhere((usr) => usr.active);
		expect(col.$qSize).toBe(5);
		expect(filtered.$qSize).toBe(3);
	});

	it('$qWhere() chaining funciona correctamente', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col
			.$qWhere((usr) => usr.active)
			.$qWhere((usr) => usr.role === 'admin');
		expect(result.$qSize).toBe(2);
	});

	it('$qFind() devuelve el primer elemento que cumple el predicado', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const user = col.$qFind((usr) => usr.name === 'Bob');
		expect(user).toBeInstanceOf(UserModel);
		expect(user?.name).toBe('Bob');
	});

	it('$qFind() devuelve undefined cuando no hay coincidencia', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const user = col.$qFind((usr) => usr.name === 'Zoe');
		expect(user).toBeUndefined();
	});
});

describe('QModelCollection — ordenación', () => {
	it('$qSortBy() ordena ascendente por campo string', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.$qSortBy('name');
		const names = sorted.toArray().map((usr) => usr.name);
		expect(names).toEqual([...names].sort());
	});

	it('$qSortBy() ordena ascendente por campo numérico', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.$qSortBy('age');
		const ages = sorted.toArray().map((usr) => usr.age);
		expect(ages).toEqual([...ages].sort((lhs, rhs) => lhs - rhs));
	});

	it('$qSortBy() con order: desc ordena descendente', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.$qSortBy('age', { order: 'desc' });
		const ages = sorted.toArray().map((usr) => usr.age);
		expect(ages[0]).toBeGreaterThan(ages[ages.length - 1]);
	});

	it('$qSortBy() devuelve una nueva colección sin mutar', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const sorted = col.$qSortBy('name');
		expect(col.toArray()[0]?.name).toBe('Alice'); // original inalterado
		expect(sorted.toArray()[0]?.name).toBe('Alice'); // coincide — Alice es la primera
	});
});

describe('QModelCollection — paginación', () => {
	it('$qPaginate() devuelve la primera página', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.$qPaginate(1, 2);
		expect(page.$qSize).toBe(2);
		expect(page.toArray()[0]?.name).toBe('Alice');
	});

	it('$qPaginate() devuelve la segunda página', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.$qPaginate(2, 2);
		expect(page.$qSize).toBe(2);
		expect(page.toArray()[0]?.name).toBe('Carol');
	});

	it('$qPaginate() última página puede ser incompleta', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.$qPaginate(3, 2);
		expect(page.$qSize).toBe(1);
	});

	it('$qPaginate() página fuera de rango devuelve colección vacía', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const page = col.$qPaginate(10, 2);
		expect(page.$qSize).toBe(0);
	});
});

describe('QModelCollection — agrupación', () => {
	it('$qGroupBy() agrupa por campo', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const grouped = col.$qGroupBy('role');
		expect(Object.keys(grouped)).toHaveLength(2);
		expect(grouped['admin']).toHaveLength(2);
		expect(grouped['user']).toHaveLength(3);
	});

	it('$qGroupBy() devuelve instancias del modelo en los grupos', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const grouped = col.$qGroupBy('role');
		expect(grouped['admin']?.[0]).toBeInstanceOf(UserModel);
	});
});

describe('QModelCollection — serialización', () => {
	it('$qSerialize() devuelve un array de plain objects', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col.$qSerialize();
		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(5);
		const first = result[0];
		expect(first && typeof first === 'object' && 'id' in first).toBe(true);
	});

	it('$qSerialize() aplica las opciones a cada elemento', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col.$qSerialize({ pick: ['id', 'name'] });
		const first = result[0];
		expect(Object.keys(first)).toEqual(
			expect.arrayContaining(['id', 'name'])
		);
		expect(first['role']).toBeUndefined();
	});

	it('$qToJSON() devuelve un JSON string de array', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const json = col.$qToJSON();
		const parsed = JSON.parse(json) as unknown[]; // @quickmodel-rule-ignore: no-as-unknown
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(5);
	});
});

describe('QModelCollection — validación', () => {
	it('$qCheckAllRules() devuelve valid:true si no hay reglas ni errores', () => {
		const col = QModelCollection.from(UserModel, SEED);
		const result = col.$qCheckAllRules();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

describe('QModelCollection — colección vacía', () => {
	it('from() con array vacío crea colección de $qSize 0', () => {
		const col = QModelCollection.from(UserModel, []);
		expect(col.$qSize).toBe(0);
		expect(col.toArray()).toHaveLength(0);
	});

	it('$qSerialize() en colección vacía devuelve array vacío', () => {
		const col = QModelCollection.from(UserModel, []);
		expect(col.$qSerialize()).toHaveLength(0);
	});

	it('$qWhere() en colección vacía devuelve colección vacía', () => {
		const col = QModelCollection.from(UserModel, []);
		expect(col.$qWhere(() => true).$qSize).toBe(0);
	});
});

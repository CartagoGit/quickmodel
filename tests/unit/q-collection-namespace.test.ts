/**
 * TDD — Tests for Propuesta X: API $q* en QModelCollection.
 *
 * RED phase: todos los tests con $q* fallan porque los métodos no existen todavía.
 * Una vez implementados en quick-collection.model.ts, todos deben pasar.
 */

import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QModelCollection } from '@/core/models/quick-collection.model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface IUser {
	id: number;
	name: string;
	age: number;
	active: boolean;
}

@Quick()
class UserModel extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare age: number;
	declare active: boolean;
}

const SEED: IUser[] = [
	{ id: 1, name: 'Alice', age: 30, active: true },
	{ id: 2, name: 'Bob', age: 25, active: true },
	{ id: 3, name: 'Carol', age: 35, active: false },
];

function makeCollection(): QModelCollection<UserModel> {
	return QModelCollection.from(UserModel, SEED);
}

// ---------------------------------------------------------------------------
// Serialización
// ---------------------------------------------------------------------------

describe('$qSerialize()', () => {
	it('retorna un array de objetos planos', () => {
		const col = makeCollection();
		const result = col.$qSerialize();
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBe(3);
		expect(result[0]).toMatchObject({ name: 'Alice', age: 30 });
	});
});

// ---------------------------------------------------------------------------
// Tamaño y vacío
// ---------------------------------------------------------------------------

describe('$qSize', () => {
	it('retorna el número de elementos', () => {
		expect(makeCollection().$qSize).toBe(3);
	});

	it('es 0 en una colección vacía', () => {
		const empty = QModelCollection.from(UserModel, []);
		expect(empty.$qSize).toBe(0);
	});
});

describe('$qIsEmpty', () => {
	it('es false cuando hay elementos', () => {
		expect(makeCollection().$qIsEmpty).toBe(false);
	});

	it('es true en una colección vacía', () => {
		const empty = QModelCollection.from(UserModel, []);
		expect(empty.$qIsEmpty).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Filtrado y búsqueda
// ---------------------------------------------------------------------------

describe('$qWhere()', () => {
	it('retorna una nueva colección filtrada', () => {
		const col = makeCollection();
		const result = col.$qWhere((usr) => usr.age > 28);
		expect(result).toBeInstanceOf(QModelCollection);
		expect(result.$qSize).toBe(2); // Alice (30) + Carol (35)
	});

	it('retorna colección vacía si ningún elemento cumple el predicado', () => {
		const col = makeCollection();
		const result = col.$qWhere((usr) => usr.age > 100);
		expect(result.$qSize).toBe(0);
	});
});

describe('$qFind()', () => {
	it('retorna el primer elemento que cumple el predicado', () => {
		const col = makeCollection();
		const found = col.$qFind((usr) => usr.name === 'Bob');
		expect(found?.name).toBe('Bob');
	});

	it('retorna undefined si ningún elemento cumple', () => {
		const col = makeCollection();
		expect(col.$qFind((usr) => usr.age > 100)).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Orden
// ---------------------------------------------------------------------------

describe('$qSortBy()', () => {
	it('ordena por campo numérico ascendente', () => {
		const col = makeCollection();
		const sorted = col.$qSortBy('age');
		expect(sorted.$qFirst()?.age).toBe(25); // Bob
	});

	it('ordena por campo numérico descendente', () => {
		const col = makeCollection();
		const sorted = col.$qSortBy('age', { order: 'desc' });
		expect(sorted.$qFirst()?.age).toBe(35); // Carol
	});
});

// ---------------------------------------------------------------------------
// Paginación
// ---------------------------------------------------------------------------

describe('$qPaginate()', () => {
	it('retorna la primera página con el tamaño correcto', () => {
		const col = makeCollection();
		const page = col.$qPaginate(1, 2);
		expect(page.$qSize).toBe(2);
	});

	it('retorna la segunda página (puede ser parcial)', () => {
		const col = makeCollection();
		const page = col.$qPaginate(2, 2);
		expect(page.$qSize).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Agrupación
// ---------------------------------------------------------------------------

describe('$qGroupBy()', () => {
	it('agrupa elementos por el valor del campo', () => {
		const col = makeCollection();
		const groups = col.$qGroupBy('active');
		expect(groups).toHaveProperty('true');
		expect(groups).toHaveProperty('false');
		expect(groups['true'].length).toBe(2); // Alice + Bob
		expect(groups['false'].length).toBe(1); // Carol
	});
});

// ---------------------------------------------------------------------------
// Acceso a extremos
// ---------------------------------------------------------------------------

describe('$qFirst() / $qLast()', () => {
	it('$qFirst() retorna el primer elemento', () => {
		expect(makeCollection().$qFirst()?.name).toBe('Alice');
	});

	it('$qLast() retorna el último elemento', () => {
		expect(makeCollection().$qLast()?.name).toBe('Carol');
	});

	it('$qFirst() retorna undefined en colección vacía', () => {
		const empty = QModelCollection.from(UserModel, []);
		expect(empty.$qFirst()).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Predicados booleanos
// ---------------------------------------------------------------------------

describe('$qEvery() / $qSome()', () => {
	it('$qEvery() es true si todos cumplen el predicado', () => {
		const col = makeCollection();
		expect(col.$qEvery((usr) => usr.age > 0)).toBe(true);
	});

	it('$qEvery() es false si alguno no cumple', () => {
		const col = makeCollection();
		expect(col.$qEvery((usr) => usr.active)).toBe(false);
	});

	it('$qSome() es true si al menos uno cumple', () => {
		const col = makeCollection();
		expect(col.$qSome((usr) => !usr.active)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Conteo y estadística
// ---------------------------------------------------------------------------

describe('$qCount()', () => {
	it('sin predicado retorna el total', () => {
		expect(makeCollection().$qCount()).toBe(3);
	});

	it('con predicado cuenta los que cumplen', () => {
		const col = makeCollection();
		expect(col.$qCount((usr) => usr.active)).toBe(2);
	});
});

describe('$qSum() / $qAvg() / $qMin() / $qMax()', () => {
	it('$qSum() suma el campo numérico', () => {
		const col = makeCollection();
		expect(col.$qSum('age')).toBe(90); // 30+25+35
	});

	it('$qAvg() promedia el campo numérico', () => {
		const col = makeCollection();
		expect(col.$qAvg('age')).toBe(30);
	});

	it('$qMin() retorna el elemento con el valor mínimo', () => {
		const col = makeCollection();
		const min = col.$qMin('age');
		expect(min?.name).toBe('Bob');
	});

	it('$qMax() retorna el elemento con el valor máximo', () => {
		const col = makeCollection();
		const max = col.$qMax('age');
		expect(max?.name).toBe('Carol');
	});
});

// ---------------------------------------------------------------------------
// Validación colectiva
// ---------------------------------------------------------------------------

describe('$qCheckAllRules()', () => {
	it('retorna un objeto con valid y errors', () => {
		const col = makeCollection();
		const result = col.$qCheckAllRules();
		expect(result).toHaveProperty('valid');
		expect(result).toHaveProperty('errors');
	});

	it('valid es true sin @QRule', () => {
		expect(makeCollection().$qCheckAllRules().valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

describe('$qToCSV()', () => {
	it('retorna un string que contiene los nombres de columna', () => {
		const csv = makeCollection().$qToCSV();
		expect(typeof csv).toBe('string');
		expect(csv).toContain('name');
	});
});

// ---------------------------------------------------------------------------
// $qToJSON() — renombrado según convención $q*
// ---------------------------------------------------------------------------

describe('$qToJSON()', () => {
	it('retorna un JSON string del array', () => {
		const col = makeCollection();
		const json = col.$qToJSON();
		expect(typeof json).toBe('string');
		const parsed = JSON.parse(json) as unknown[];
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed.length).toBe(3);
	});

	it('el string parseado contiene los datos correctos', () => {
		const col = makeCollection();
		const parsed = JSON.parse(col.$qToJSON()) as Array<
			Record<string, unknown>
		>;
		expect(parsed[0]?.['name']).toBe('Alice');
		expect(parsed[1]?.['name']).toBe('Bob');
	});
});

// ---------------------------------------------------------------------------
// fromJSON — deserializar colección desde JSON string
// ---------------------------------------------------------------------------

describe('QModelCollection.fromJSON()', () => {
	it('crea una colección a partir de un JSON string roundtrip', () => {
		const original = makeCollection();
		const json = original.$qToJSON();
		const restored = QModelCollection.fromJSON(UserModel, json);
		expect(restored).toBeInstanceOf(QModelCollection);
		expect(restored.$qSize).toBe(3);
	});

	it('las instancias restauradas son de la clase correcta', () => {
		const json = makeCollection().$qToJSON();
		const restored = QModelCollection.fromJSON(UserModel, json);
		expect(restored.$qFirst()).toBeInstanceOf(UserModel);
	});

	it('preserva los valores de los campos', () => {
		const json = makeCollection().$qToJSON();
		const restored = QModelCollection.fromJSON(UserModel, json);
		expect(restored.$qFirst()?.name).toBe('Alice');
		expect(restored.$qFirst()?.age).toBe(30);
	});

	it('lanza SyntaxError si el JSON es inválido', () => {
		expect(() =>
			QModelCollection.fromJSON(UserModel, 'not-valid-json')
		).toThrow(SyntaxError);
	});
});

// ---------------------------------------------------------------------------
// Getter $qm ya NO debe existir en la colección
// ---------------------------------------------------------------------------

describe('Getter $qm eliminado de QModelCollection', () => {
	it('$qm ya no existe en la colección', () => {
		const col = makeCollection();
		// @quickmodel-rule-ignore: no-as-unknown
		expect(
			(col as unknown as Record<string, unknown>)['$qm']
		).toBeUndefined();
	});
});

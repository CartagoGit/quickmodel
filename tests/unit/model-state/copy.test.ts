/**
 * TDD Tests: copy(partial?) method
 *
 * copy() unifies merge() and copied() into a single immutable method:
 * - copy()           → identical deep copy (new reference)
 * - copy({ ... })    → new instance with partial fields overridden
 *
 * RED phase — copy() does not exist yet.
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

interface IComplexEntity {
	id: string;
	createdAt: string;
	amount: string;
	pattern: string;
	tags: string[];
	metadata: Record<string, string>;
}

@Quick({ createdAt: Date, amount: BigInt })
class ComplexEntity extends QModel<IComplexEntity> {
	declare id: string;
	declare createdAt: Date;
	declare amount: bigint;
	declare pattern: string;
	declare tags: string[];
	declare metadata: Record<string, string>;
}
void ComplexEntity; // referenced to trigger decorator registration

const BASE_USER = {
	id: '1',
	name: 'John',
	age: 30,
	email: 'j@e.com',
	active: true,
	createdAt: '2024-01-01T00:00:00.000Z',
};

// ============================================================
// SUITE: copy() sin argumentos — equivale al antiguo copied()
// ============================================================
describe('QModel — copy() sin argumentos', () => {
	test('devuelve una instancia diferente (nueva referencia)', () => {
		const user = new User(BASE_USER);
		const copied = user.$qCopy();
		expect(copied).not.toBe(user);
	});

	test('es instancia de la misma clase', () => {
		const user = new User(BASE_USER);
		expect(user.$qCopy()).toBeInstanceOf(User);
	});

	test('los valores son idénticos al original', () => {
		const user = new User(BASE_USER);
		const copied = user.$qCopy();
		expect(copied.id).toBe(user.id);
		expect(copied.name).toBe(user.name);
		expect(copied.age).toBe(user.age);
		expect(copied.email).toBe(user.email);
		expect(copied.active).toBe(user.active);
	});

	test('los campos Date son nuevas instancias con el mismo valor', () => {
		const user = new User(BASE_USER);
		const copied = user.$qCopy();
		expect(copied.createdAt).toBeInstanceOf(Date);
		expect(copied.createdAt.getTime()).toBe(user.createdAt.getTime());
		expect(copied.createdAt).not.toBe(user.createdAt);
	});

	test('modificar el original NO afecta a la copia', () => {
		const user = new User(BASE_USER);
		const copied = user.$qCopy();
		user.name = 'Jane';
		expect(copied.name).toBe('John');
	});

	test('modificar la copia NO afecta al original', () => {
		const user = new User(BASE_USER);
		const copied = user.$qCopy();
		copied.name = 'Jane';
		expect(user.name).toBe('John');
	});

	test('la copia está limpia (isDirty = false)', () => {
		const user = new User(BASE_USER);
		user.name = 'Dirty';
		const copied = user.$qCopy();
		expect(copied.$qIsDirty()).toBe(false);
	});

	test('reset() en la copia vuelve al estado del momento de la copia', () => {
		const user = new User(BASE_USER);
		user.name = 'Dirty';
		const copied = user.$qCopy(); // copia el estado "Dirty"
		copied.name = 'Bob';
		copied.$qReset();
		expect(copied.name).toBe('Dirty'); // vuelve al estado de la copia, no al original
	});

	test('equals() entre original y copia es true', () => {
		const user = new User(BASE_USER);
		expect(user.$qEquals(user.$qCopy())).toBe(true);
	});

	test('tipos complejos (BigInt) se copian correctamente', () => {
		const order = new Order({ id: 1, total: '1000' });
		const copied = order.$qCopy();
		expect(typeof copied.total).toBe('bigint');
		expect(copied.total).toBe(1000n);
	});

	test('campos opcionales ausentes se preservan', () => {
		const order = new Order({ id: 1, total: '500' });
		const copied = order.$qCopy();
		expect(copied.note).toBeUndefined();
	});

	test('campos opcionales presentes se preservan', () => {
		const order = new Order({ id: 1, total: '500', note: 'express' });
		const copied = order.$qCopy();
		expect(copied.note).toBe('express');
	});
});

// ============================================================
// SUITE: copy(partial) — equivale al antiguo merge()
// ============================================================
describe('QModel — copy(partial)', () => {
	describe('inmutabilidad', () => {
		test('devuelve objeto diferente al original', () => {
			const user = new User(BASE_USER);
			expect(user.$qCopy({ name: 'Jane' })).not.toBe(user);
		});

		test('es instancia de la misma clase', () => {
			const user = new User(BASE_USER);
			expect(user.$qCopy({ name: 'Jane' })).toBeInstanceOf(User);
		});

		test('el original NO se modifica', () => {
			const user = new User(BASE_USER);
			user.$qCopy({ name: 'Jane', age: 99 });
			expect(user.name).toBe('John');
			expect(user.age).toBe(30);
		});
	});

	describe('valores en la nueva instancia', () => {
		test('los campos del partial se actualizan', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({ name: 'Jane', age: 31 });
			expect(copied.name).toBe('Jane');
			expect(copied.age).toBe(31);
		});

		test('los campos no incluidos conservan el valor original', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({ name: 'Jane' });
			expect(copied.id).toBe('1');
			expect(copied.email).toBe('j@e.com');
			expect(copied.active).toBe(true);
		});

		test('campos Date se transforman correctamente', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({
				createdAt: '2025-06-15T00:00:00.000Z',
			});
			expect(copied.createdAt).toBeInstanceOf(Date);
			expect(copied.createdAt.toISOString()).toBe(
				'2025-06-15T00:00:00.000Z'
			);
		});

		test('campos BigInt se transforman correctamente', () => {
			const order = new Order({ id: 1, total: '1000' });
			const copied = order.$qCopy({ total: '9999' });
			expect(typeof copied.total).toBe('bigint');
			expect(copied.total).toBe(9999n);
		});

		test('copy({}) equivale a copy() — misma referencia nueva, mismos datos', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({});
			expect(copied).not.toBe(user);
			expect(copied.name).toBe(user.name);
			expect(copied.age).toBe(user.age);
			expect(copied.email).toBe(user.email);
		});
	});

	describe('estado de la nueva instancia', () => {
		test('la nueva instancia NO está dirty', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({ name: 'Jane' });
			expect(copied.$qIsDirty()).toBe(false);
		});

		test('reset() en la nueva instancia vuelve al estado del copy', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({ name: 'Jane' });
			copied.name = 'Bob';
			copied.$qReset();
			expect(copied.name).toBe('Jane'); // vuelve a Jane, NO a John
			expect(copied.$qIsDirty()).toBe(false);
		});

		test('encadenar copy() funciona correctamente', () => {
			const user = new User(BASE_USER);
			const user2 = user.$qCopy({ name: 'Jane' });
			const user3 = user2.$qCopy({ age: 99 });

			expect(user3.name).toBe('Jane');
			expect(user3.age).toBe(99);
			expect(user3.email).toBe('j@e.com');
			// Todos independientes
			expect(user.name).toBe('John');
			expect(user2.age).toBe(30);
		});
	});

	describe('serialize y diff', () => {
		test('serialize() refleja los valores del copy', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({ name: 'Jane', age: 31 });
			const serialized = copied.$qSerialize();
			expect(serialized.name).toBe('Jane');
			expect(serialized.age).toBe(31);
			expect(serialized.email).toBe('j@e.com');
		});

		test('diff() entre original y copy muestra solo los campos cambiados', () => {
			const user = new User(BASE_USER);
			const copied = user.$qCopy({ name: 'Jane' });
			const differences = user.$qDiff(copied);
			expect(Object.keys(differences)).toEqual(['name']);
			expect(differences.name).toEqual({ before: 'John', after: 'Jane' });
		});
	});
});

// ============================================================
// SUITE: copy() con distintos estilos de declaración
// ============================================================
describe('QModel — copy() con estilos de declaración', () => {
	interface IConfig {
		apiUrl: string;
		timeout: number;
		retries?: number;
	}

	@Quick({})
	class ConfigDeclare extends QModel<IConfig> {
		declare apiUrl: string;
		declare timeout: number;
		declare retries?: number;
	}

	const configData = {
		apiUrl: 'https://api.example.com',
		timeout: 5000,
		retries: 3,
	};

	test('declare: copy() produce instancia independiente', () => {
		const config = new ConfigDeclare(configData);
		const copied = config.$qCopy();
		expect(copied).toBeInstanceOf(ConfigDeclare);
		expect(copied.apiUrl).toBe(config.apiUrl);
		expect(copied.timeout).toBe(config.timeout);
		// Modificar original no afecta a la copia
		config.timeout = 10000;
		expect(copied.timeout).toBe(5000);
	});

	test('declare: copy(partial) sobreescribe los campos indicados', () => {
		const config = new ConfigDeclare(configData);
		const copied = config.$qCopy({ timeout: 9999 });
		expect(copied.timeout).toBe(9999);
		expect(copied.apiUrl).toBe('https://api.example.com');
	});
});

// ============================================================
// SUITE: copy() para reactividad cross-framework
// ============================================================
describe('QModel — copy() como herramienta de reactividad', () => {
	test('copy() produce nueva referencia detectable por cualquier signal/store', () => {
		const user = new User(BASE_USER);
		const user2 = user.$qCopy({ name: 'Bob' });
		expect(user2).not.toBe(user); // nueva referencia → framework detecta cambio
		expect(user2.name).toBe('Bob');
		expect(user.name).toBe('John'); // original intacto
	});

	test('patch() + copy() como patrón batch: mutar rápido y luego emitir nueva ref', () => {
		const user = new User(BASE_USER);
		user.$qPatch({ name: 'Bob', age: 31 }); // mutaciones rápidas
		const emitted = user.$qCopy(); // nueva ref para el signal/store
		expect(emitted).not.toBe(user);
		expect(emitted.name).toBe('Bob');
		expect(emitted.age).toBe(31);
	});
});

// @quickmodel-rule-ignore: no-as-unknown  intentional: guard tests require calling non-$q methods to verify they throw
/**
 * TDD — Tests for Propuesta X: API $q* unificada en QModel.
 *
 *
 * Convención: IQ* = interfaces · Q* = clases/decoradores · $q* = métodos de instancia
 */

import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface IUser {
	name: string;
	age: number;
	createdAt: Date;
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare name: string;
	declare age: number;
	declare createdAt: Date;
}

function makeUser(overrides?: Partial<IUser>): User {
	return new User({
		name: 'Alice',
		age: 30,
		createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
		...overrides,
	});
}

// ---------------------------------------------------------------------------
// Serialización
// ---------------------------------------------------------------------------

describe('$qSerialize()', () => {
	it('retorna un objeto plano con los campos del modelo', () => {
		const user = makeUser();
		const result = user.$qSerialize();
		expect(result).toMatchObject({ name: 'Alice', age: 30 });
	});

	it('no retorna la instancia original', () => {
		const user = makeUser();
		expect(user.$qSerialize()).not.toBe(user);
	});
});

// ---------------------------------------------------------------------------
// Change tracking
// ---------------------------------------------------------------------------

describe('$qIsDirty()', () => {
	it('es false en una instancia recién creada', () => {
		expect(makeUser().$qIsDirty()).toBe(false);
	});

	it('es false para un campo concreto en una instancia recién creada', () => {
		expect(makeUser().$qIsDirty('name')).toBe(false);
	});
});

describe('$qHasChanges()', () => {
	it('es false en una instancia recién creada', () => {
		expect(makeUser().$qHasChanges()).toBe(false);
	});
});

describe('$qPatch() + $qGetChanges()', () => {
	it('$qPatch() muta el campo y $qGetChanges() lo refleja', () => {
		const user = makeUser();
		user.$qPatch({ age: 31 });
		expect(user.$qIsDirty('age')).toBe(true);
		expect(user.$qGetChanges()).toEqual({ age: 31 });
	});

	it('$qPatch() no marca como dirty un campo que no cambió', () => {
		const user = makeUser();
		user.$qPatch({ name: 'Alice' }); // mismo valor
		expect(user.$qIsDirty('name')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Copia, diff y equals
// ---------------------------------------------------------------------------

describe('$qCopy()', () => {
	it('retorna una nueva instancia del mismo modelo', () => {
		const user = makeUser();
		const clone = user.$qCopy({ name: 'Bob' });
		expect(clone).toBeInstanceOf(User);
		expect(clone.name).toBe('Bob');
	});

	it('la instancia original no se modifica', () => {
		const user = makeUser();
		user.$qCopy({ age: 99 });
		expect(user.age).toBe(30);
	});
});

describe('$qFrom()', () => {
	it('crea una nueva instancia del mismo modelo desde un objeto plano', () => {
		const user = makeUser();
		const other = user.$qFrom({
			name: 'Bob',
			age: 25,
			createdAt: '2025-06-01T00:00:00.000Z' as unknown as Date,
		});
		expect(other).toBeInstanceOf(User);
		expect(other.name).toBe('Bob');
		expect(other.age).toBe(25);
	});

	it('aplica transformadores de tipo (Date)', () => {
		const user = makeUser();
		const other = user.$qFrom({
			name: 'Bob',
			age: 25,
			createdAt: '2025-06-01T00:00:00.000Z' as unknown as Date,
		});
		expect(other.createdAt).toBeInstanceOf(Date);
	});

	it('no modifica la instancia original', () => {
		const user = makeUser();
		user.$qFrom({
			name: 'Zed',
			age: 99,
			createdAt: '2025-01-01T00:00:00.000Z' as unknown as Date,
		});
		expect(user.name).toBe('Alice');
		expect(user.age).toBe(30);
	});
});

describe('$qFromJSON()', () => {
	it('crea una nueva instancia del mismo modelo desde un JSON string', () => {
		const user = makeUser();
		const json = user.$qToJSON();
		const restored = user.$qFromJSON(json);
		expect(restored).toBeInstanceOf(User);
		expect(restored.name).toBe('Alice');
		expect(restored.age).toBe(30);
	});

	it('aplica transformadores de tipo (Date) desde JSON', () => {
		const user = makeUser();
		const json = user.$qToJSON();
		const restored = user.$qFromJSON(json);
		expect(restored.createdAt).toBeInstanceOf(Date);
	});

	it('lanza SyntaxError si el JSON es inválido', () => {
		const user = makeUser();
		expect(() => user.$qFromJSON('not-valid-json')).toThrow(SyntaxError);
	});

	it('produce un resultado equivalente al de la instancia original', () => {
		const user = makeUser();
		const restored = user.$qFromJSON(user.$qToJSON());
		expect(user.$qEquals(restored)).toBe(true);
	});
});

describe('$qDiff()', () => {
	it('retorna diferencias campo a campo', () => {
		const usr = makeUser();
		const other = usr.$qCopy({ age: 31 });
		const diff = usr.$qDiff(other);
		expect(diff).toMatchObject({ age: { before: 30, after: 31 } });
	});

	it('retorna objeto vacío si las instancias son iguales', () => {
		const usr = makeUser();
		const other = makeUser();
		expect(usr.$qDiff(other)).toEqual({});
	});
});

describe('$qEquals()', () => {
	it('es true para dos instancias con los mismos valores', () => {
		const usr = makeUser();
		const other = makeUser();
		expect(usr.$qEquals(other)).toBe(true);
	});

	it('es false cuando difieren en al menos un campo', () => {
		const usr = makeUser();
		const other = makeUser({ age: 31 });
		expect(usr.$qEquals(other)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Integridad
// ---------------------------------------------------------------------------

describe('$qHasIntegrity()', () => {
	it('es true para datos correctos', () => {
		expect(makeUser().$qHasIntegrity()).toBe(true);
	});
});

describe('$qCheckIntegrity()', () => {
	it('retorna array vacío cuando no hay errores', () => {
		expect(makeUser().$qCheckIntegrity()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

describe('$qIsValid()', () => {
	it('es true para un modelo sin @QRule', () => {
		expect(makeUser().$qIsValid()).toBe(true);
	});
});

describe('$qCheckRules()', () => {
	it('retorna { valid: true } sin @QRule', () => {
		expect(makeUser().$qCheckRules().valid).toBe(true);
	});
});

describe('$qValidationReport()', () => {
	it('tiene las claves valid, integrity y rules', () => {
		const report = makeUser().$qValidationReport();
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});
});

// ---------------------------------------------------------------------------
// Lectura de estado
// ---------------------------------------------------------------------------

describe('$qToInterface()', () => {
	it('retorna el estado actual como objeto plano', () => {
		const user = makeUser();
		const iface = user.$qToInterface();
		expect(iface.name).toBe('Alice');
		expect(iface.age).toBe(30);
	});
});

describe('$qGetInitInterface()', () => {
	it('retorna el snapshot del constructor', () => {
		const user = makeUser();
		user.$qPatch({ age: 99 });
		const init = user.$qGetInitInterface();
		// debe reflejar el valor original, no el patcheado
		expect(init.age).toBe(30);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('$qReset()', () => {
	it('revierte todos los cambios al estado inicial', () => {
		const user = makeUser();
		user.$qPatch({ age: 99, name: 'Zed' });
		user.$qReset();
		expect(user.age).toBe(30);
		expect(user.name).toBe('Alice');
	});

	it('$qHasChanges() es false después del reset', () => {
		const user = makeUser();
		user.$qPatch({ age: 99 });
		user.$qReset();
		expect(user.$qHasChanges()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Legacy method removal — los métodos sin $q ya no existen en la clase
// ---------------------------------------------------------------------------

describe('Métodos legacy eliminados: ya no existen en la instancia [QuickModel]', () => {
	it('serialize() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).serialize).toBe('undefined');
	});

	it('isDirty() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).isDirty).toBe('undefined');
	});

	it('checkIntegrity() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).checkIntegrity).toBe('undefined');
	});

	it('hasChanges() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).hasChanges).toBe('undefined');
	});

	it('reset() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).reset).toBe('undefined');
	});

	it('toInterface() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).toInterface).toBe('undefined');
	});

	it('getInitInterface() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).getInitInterface).toBe('undefined');
	});

	it('patch() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).patch).toBe('undefined');
	});

	it('copy() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).copy).toBe('undefined');
	});

	it('getChanges() ya no existe en la instancia', () => {
		const user = makeUser();
		expect(typeof (user as any).getChanges).toBe('undefined');
	});
});

// ---------------------------------------------------------------------------
// Getter $qm ya NO debe existir
// ---------------------------------------------------------------------------

describe('Getter $qm eliminado', () => {
	it('$qm ya no existe en la instancia', () => {
		const user = makeUser();
		expect((user as any).$qm).toBeUndefined();
	});
});

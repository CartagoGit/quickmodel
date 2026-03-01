/**
 * TDD Tests: @QVersion + schema migrations — Propuesta N
 * Verifica migración automática al construir instancias con datos de versión anterior.
 */
import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QVersion } from '@/decorators';

// ─────────────────────────────────────────────────────────────────────────────
// Modelos de prueba
// ─────────────────────────────────────────────────────────────────────────────

interface IUserV2 {
	fullName: string;
	email: string;
	_v?: number;
}

/**
 * v1 → v2: firstName + lastName unificados en fullName.
 */
@Quick()
@QVersion(2, {
	migrations: {
		1: (data: Record<string, unknown>) => ({
			...data,
			fullName:
				`${String(data['firstName'] ?? '')} ${String(data['lastName'] ?? '')}`.trim(),
		}),
	},
})
class UserV2 extends QModel<IUserV2> {
	declare fullName: string;
	declare email: string;
}

interface IDocV3 {
	body: string;
	tags: string[];
	_v?: number;
}

/**
 * v1 → v2 → v3: migración en dos pasos.
 * v1: { content, label }
 * v2: { body, label }         ← content → body
 * v3: { body, tags }          ← label → tags array
 */
@Quick()
@QVersion(3, {
	migrations: {
		1: (data: Record<string, unknown>) => ({
			...data,
			body: data['content'],
		}),
		2: (data: Record<string, unknown>) => ({
			...data,
			tags: [data['label']],
		}),
	},
})
class DocV3 extends QModel<IDocV3> {
	declare body: string;
	declare tags: string[];
}

interface IProductV1 {
	name: string;
	_v?: number;
}

/** Modelo sin migraciones — solo declara versión actual. */
@Quick()
@QVersion(1, { migrations: {} })
class ProductV1 extends QModel<IProductV1> {
	declare name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('@QVersion — migración v1 → v2', () => {
	test('datos v1 se migran automáticamente a v2', () => {
		const user = new UserV2({
			firstName: 'Alice',
			lastName: 'Martin',
			email: 'a@b.com',
			_v: 1,
		} as unknown as IUserV2); // @quickmodel-rule-ignore: no-as-unknown

		expect(user.fullName).toBe('Alice Martin');
		expect(user.email).toBe('a@b.com');
	});

	test('datos ya en v2 no se migran (se usan tal cual)', () => {
		const user = new UserV2({
			fullName: 'Bob Smith',
			email: 'b@c.com',
			_v: 2,
		});

		expect(user.fullName).toBe('Bob Smith');
	});

	test('datos sin _v se tratan como versión actual (sin migración)', () => {
		const user = new UserV2({
			fullName: 'Carol White',
			email: 'c@d.com',
		});

		expect(user.fullName).toBe('Carol White');
	});
});

describe('@QVersion — migración multistep v1 → v3', () => {
	test('datos v1 se migran en dos pasos hasta v3', () => {
		const doc = new DocV3({
			content: 'Hello',
			label: 'news',
			_v: 1,
		} as unknown as IDocV3); // @quickmodel-rule-ignore: no-as-unknown

		expect(doc.body).toBe('Hello');
		expect(doc.tags).toEqual(['news']);
	});

	test('datos v2 se migran solo el paso 2→3', () => {
		const doc = new DocV3({
			body: 'World',
			label: 'tech',
			_v: 2,
		} as unknown as IDocV3); // @quickmodel-rule-ignore: no-as-unknown

		expect(doc.body).toBe('World');
		expect(doc.tags).toEqual(['tech']);
	});

	test('datos v3 no se migran', () => {
		const doc = new DocV3({
			body: 'End',
			tags: ['final'],
			_v: 3,
		});

		expect(doc.body).toBe('End');
		expect(doc.tags).toEqual(['final']);
	});
});

describe('@QVersion — sin datos versionados', () => {
	test('modelo sin migraciones funciona normalmente', () => {
		const prod = new ProductV1({ name: 'Widget', _v: 1 });
		expect(prod.name).toBe('Widget');
	});

	test('modelo con @QVersion construye sin error desde datos actuales', () => {
		const user = new UserV2({ fullName: 'Dave', email: 'd@e.com' });
		expect(user.fullName).toBe('Dave');
	});
});

describe('@QVersion — integridad con serialize()', () => {
	test('instancia migrada serializa correctamente', () => {
		const user = new UserV2({
			firstName: 'Eve',
			lastName: 'Jones',
			email: 'e@f.com',
			_v: 1,
		} as unknown as IUserV2); // @quickmodel-rule-ignore: no-as-unknown

		const plain = user.$qSerialize();
		expect(plain['fullName']).toBe('Eve Jones');
		expect(plain['email']).toBe('e@f.com');
	});
});

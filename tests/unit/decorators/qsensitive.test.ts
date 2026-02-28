/**
 * TDD Tests: @QSensitive decorator
 *
 * RED phase — @QSensitive does not exist yet.
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QSensitive } from '@/core/decorators/qsensitive.decorator';

// ============================================================
// MODELOS DE PRUEBA
// ============================================================

interface IUser {
	id: number;
	name: string;
	email: string;
	password: string;
	token: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;

	@QSensitive()
	declare password: string;

	@QSensitive()
	declare token: string;
}

interface IProfile {
	id: string;
	username: string;
	apiKey: string;
}

@Quick()
class ProfileModel extends QModel<IProfile> {
	declare id: string;
	declare username: string;

	@QSensitive()
	declare apiKey: string;
}

// ============================================================
// TESTS
// ============================================================

describe('@QSensitive — exclusión por defecto', () => {
	it('excluye el campo sensible de serialize() por defecto', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const result = user.serialize() as Record<string, unknown>;
		expect(result['password']).toBeUndefined();
		expect(result['token']).toBeUndefined();
	});

	it('incluye los campos no-sensibles en serialize()', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const result = user.serialize() as Record<string, unknown>;
		expect(result['id']).toBe(1);
		expect(result['name']).toBe('Alice');
		expect(result['email']).toBe('alice@example.com');
	});

	it('incluye los campos sensibles cuando includeSensitive: true', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const result = user.serialize({ includeSensitive: true }) as Record<
			string,
			unknown
		>;
		expect(result['password']).toBe('secret123');
		expect(result['token']).toBe('tok_abc');
	});

	it('excluye el campo sensible de toJSON()', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const parsed = JSON.parse(user.toJSON()) as Record<string, unknown>;
		expect(parsed['password']).toBeUndefined();
		expect(parsed['token']).toBeUndefined();
	});

	it('NO afecta a toInterface() — los campos siguen accesibles vía modelo', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const iface = user.toInterface();
		expect(iface.password).toBe('secret123');
	});

	it('el campo sigue accesible directamente como propiedad', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		expect(user.password).toBe('secret123');
	});

	it('funciona con un solo campo sensible', () => {
		const profile = new ProfileModel({
			id: 'p1',
			username: 'alice',
			apiKey: 'sk_live_abc123',
		});
		const result = profile.serialize() as Record<string, unknown>;
		expect(result['apiKey']).toBeUndefined();
		expect(result['id']).toBe('p1');
		expect(result['username']).toBe('alice');
	});

	it('includeSensitive: true incluye el campo sensible también en clase de un solo campo', () => {
		const profile = new ProfileModel({
			id: 'p1',
			username: 'alice',
			apiKey: 'sk_live_abc123',
		});
		const result = profile.serialize({ includeSensitive: true }) as Record<
			string,
			unknown
		>;
		expect(result['apiKey']).toBe('sk_live_abc123');
	});

	it('create() + copy() preservan el campo sensible en el acceso directo', () => {
		const user = UserModel.create({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const copy = user.copy({ name: 'Bob' });
		expect(copy.password).toBe('secret123');
	});

	it('serialize() en la copia también excluye los campos sensibles', () => {
		const user = UserModel.create({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const copy = user.copy({ name: 'Bob' });
		const result = copy.serialize() as Record<string, unknown>;
		expect(result['password']).toBeUndefined();
		expect(result['token']).toBeUndefined();
	});

	it('checkRules() puede seguir validando el campo sensible', () => {
		// @QSensitive no debe interferir con la validación
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		// No hay reglas en este modelo, pero checkRules debe ejecutarse sin errores
		expect(() => user.checkRules()).not.toThrow();
	});
});

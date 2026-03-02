/**
 * TDD Tests: @QSensitive decorator
 *
 * RED phase — @QSensitive does not exist yet.
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QRule } from '@/decorators';
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
class UserModel extends QModel<
	IUser,
	Record<never, never>,
	'password' | 'token'
> {
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
class ProfileModel extends QModel<IProfile, Record<never, never>, 'apiKey'> {
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
		const result = user.$qSerialize();
		expect((result as Record<string, unknown>)['password']).toBeUndefined();
		expect((result as Record<string, unknown>)['token']).toBeUndefined();
	});

	it('incluye los campos no-sensibles en serialize()', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const result = user.$qSerialize();
		expect(result.id).toBe(1);
		expect(result.name).toBe('Alice');
		expect(result.email).toBe('alice@example.com');
	});

	it('incluye los campos sensibles cuando includeSensitive: true', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const result = user.$qSerialize({ includeSensitive: true });
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
		const parsed = user.toJSON();
		expect((parsed as Record<string, unknown>)['password']).toBeUndefined();
		expect((parsed as Record<string, unknown>)['token']).toBeUndefined();
	});

	it('NO afecta a toInterface() — los campos siguen accesibles vía modelo', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const iface = user.$qToInterface();
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
		const result = profile.$qSerialize();
		expect((result as Record<string, unknown>)['apiKey']).toBeUndefined();
		expect(result.id).toBe('p1');
		expect(result.username).toBe('alice');
	});

	it('includeSensitive: true incluye el campo sensible también en clase de un solo campo', () => {
		const profile = new ProfileModel({
			id: 'p1',
			username: 'alice',
			apiKey: 'sk_live_abc123',
		});
		const result = profile.$qSerialize({
			includeSensitive: true,
		});
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
		const copy = user.$qCopy({ name: 'Bob' });
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
		const copy = user.$qCopy({ name: 'Bob' });
		const result = copy.$qSerialize() as Record<string, unknown>;
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
		expect(() => user.$qCheckRules()).not.toThrow();
	});

	it('@QSensitive no interfiere con $qCheckRules() — retorna valid:true sin errores cuando no hay reglas', () => {
		const user = new UserModel({
			id: 1,
			name: 'Alice',
			email: 'alice@example.com',
			password: 'secret123',
			token: 'tok_abc',
		});
		const result = user.$qCheckRules();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});
// ============================================================
// MODELO CON @QSensitive + @QRule
// ============================================================

interface ISecureAccount {
	id: number;
	username: string;
	password: string;
}

@Quick()
class SecureAccountModel extends QModel<
	ISecureAccount,
	Record<never, never>,
	'password'
> {
	declare id: number;
	declare username: string;

	@QSensitive()
	@QRule(
		(val: string) => val.length >= 8,
		'La contraseña debe tener al menos 8 caracteres'
	)
	declare password: string;
}

describe('@QSensitive + @QRule — $qCheckRules() valida campos sensibles', () => {
	it('retorna valid:true cuando el campo sensible cumple sus reglas', () => {
		const acc = new SecureAccountModel({
			id: 1,
			username: 'alice',
			password: 'supersecret',
		});
		const result = acc.$qCheckRules();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('retorna valid:false con el error correcto cuando el campo sensible no cumple sus reglas', () => {
		const acc = new SecureAccountModel({
			id: 2,
			username: 'bob',
			password: 'short',
		});
		const result = acc.$qCheckRules();
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0]?.message).toBe(
			'La contraseña debe tener al menos 8 caracteres'
		);
	});

	it('el campo sensible sigue excluido de $qSerialize() aunque falle sus reglas', () => {
		const acc = new SecureAccountModel({
			id: 2,
			username: 'bob',
			password: 'short',
		});
		const serialized = acc.$qSerialize();
		expect(
			(serialized as Record<string, unknown>)['password']
		).toBeUndefined();
	});
});

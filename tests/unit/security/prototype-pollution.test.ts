import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Security: Prototype Pollution Prevention', () => {
	test('should prevent modification of prototype via JSON payload', () => {
		interface IUser {
			name: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare name: string;
		}

		// Simula un payload malicioso
		const payload = JSON.parse(
			'{"name":"Hacker", "__proto__": {"isAdmin": true}}'
		);

		const user = new User(payload);

		// Verifica que no ha contaminado el objeto
		expect((user as any).__proto__.isAdmin).toBeUndefined();
		expect((user as any).isAdmin).toBeUndefined();

		// Verifica que no ha contaminado el modelo base
		expect((User.prototype as any).isAdmin).toBeUndefined();

		// Verifica que no ha contaminado Object
		expect(({} as any).isAdmin).toBeUndefined();
	});

	test('should prevent overwriting constructor', () => {
		interface IUser {
			name: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare name: string;
		}

		// Intento de romper el constructor
		const payload = {
			name: 'Hacker',
			constructor: 'broken',
		};

		const user = new User(payload as any);

		// El constructor de la instancia debe seguir siendo válido (función)
		// No verificamos igualdad exacta con User porque @Quick envuelve el constructor
		// y retorna el original, pero user.constructor podría apuntar al original unwrapped?
		// En cualquier caso, NO debe ser 'broken'.
		expect(user.constructor).not.toBe('broken');
		expect(typeof user.constructor).toBe('function');
	});

	test('should prevent modification of prototype property', () => {
		interface IUser {
			name: string;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare name: string;
		}

		const payload = {
			name: 'Hacker',
			prototype: { infected: true },
		};

		const user = new User(payload as any);
		expect((user as any).prototype).toBeUndefined();
	});
});

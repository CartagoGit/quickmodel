import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '../../../src/index';

/**
 * Este test verifica que el MockGenerator hidrata correctamente las instancias
 * ahora que QModel.initialize acepta argumentos.
 *
 * Anteriormente (Fallback), si initialize no aceptaba argumentos,
 * el mock se creaba vacío. Este test asegura que eso no ocurra.
 */
describe('Mock Generator - Hydration & Fallback', () => {
	interface IUser {
		id: number;
		name: string;
		isActive: boolean;
	}

	@Quick({
		id: 'number',
		name: 'string',
		isActive: 'boolean',
	})
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;
		declare isActive: boolean;
	}

	it('should correctly hydrate a mocked instance (No Fallback needed)', () => {
		// 1. Generar mock (usando .random() para obtener la instancia)
		const mockUser = User.mock().random();

		// 2. Verificar que es una instancia de User
		expect(mockUser).toBeInstanceOf(User);

		// 3. Verificar que tiene datos (no está vacía)
		expect(mockUser.id).toBeDefined();
		expect(typeof mockUser.id).toBe('number');

		expect(mockUser.name).toBeDefined();
		expect(typeof mockUser.name).toBe('string');

		expect(mockUser.isActive).toBeDefined();
		expect(typeof mockUser.isActive).toBe('boolean');

		// 4. Verificar acceso vía propiedades directas (Lazy Getters)
		// Si la hidratación fallase, esto sería undefined
		expect(mockUser.name.length).toBeGreaterThan(0);
	});

	it('should accept overrides during mocking', () => {
		// Usar .random(overrides)
		const override = { name: 'Fixed Name', id: 999 };
		const mockUser = User.mock().random(override);

		expect(mockUser.name).toBe('Fixed Name');
		expect(mockUser.id).toBe(999);
		// isActive should still be generated random
		expect(typeof mockUser.isActive).toBe('boolean');
	});

	it('should handle complex nested hydration in mocks', () => {
		interface IProfile {
			bio: string;
		}

		@Quick({ bio: 'string' })
		class Profile extends QModel<IProfile> {
			declare bio: string;
		}

		interface IComplex {
			profile: Profile;
		}

		@Quick({ profile: Profile })
		class ComplexUser extends QModel<IComplex> {
			declare profile: Profile;
		}

		// Usar random() para obtener la instancia
		const mock = ComplexUser.mock().random();

		expect(mock.profile).toBeInstanceOf(Profile);
		expect(mock.profile.bio).toBeDefined();
		expect(typeof mock.profile.bio).toBe('string');
	});
});

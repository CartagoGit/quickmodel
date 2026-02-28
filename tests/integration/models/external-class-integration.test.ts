/**
 * Test: Clases externas sin @Quick()
 *
 * Verifica cómo QuickModel maneja clases que no tienen el decorador @Quick()
 * (típicamente clases de librerías externas)
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('External classes without @Quick()', () => {
	// Simulamos una clase de una librería externa (sin @Quick())
	class ExternalUser {
		id!: number;
		name!: string;
		email!: string;

		constructor(data: Partial<ExternalUser>) {
			Object.assign(this, data);
		}

		getDisplayName(): string {
			return `${this.name} <${this.email}>`;
		}
	}

	// Otra clase externa sin decoradores
	class ExternalAddress {
		street!: string;
		city!: string;
		zipCode!: string;

		constructor(data: Partial<ExternalAddress>) {
			Object.assign(this, data);
		}
	}

	// Interfaces
	interface IProfile {
		userId: number;
		user: unknown; // ExternalUser serializado
		address: unknown; // ExternalAddress serializado
	}

	interface ITeam {
		id: number;
		members: unknown[]; // Array de ExternalUser
	}

	test('Should handle single external class without @Quick()', () => {
		@Quick(
			{
				user: ExternalUser,
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Profile extends QModel<IProfile> {
			userId!: number;
			user!: ExternalUser;
		}

		const profile = new Profile({
			userId: 1,
			user: {
				id: 100,
				name: 'John Doe',
				email: 'john@example.com',
			},
		});

		// Verificar si se instancia correctamente
		expect(profile.userId).toBe(1);
		expect(profile.user).toBeInstanceOf(ExternalUser);
		expect(profile.user?.id).toBe(100);
		expect(profile.user?.name).toBe('John Doe');
		if (profile.user instanceof ExternalUser) {
			expect(profile.user.getDisplayName()).toBe(
				'John Doe <john@example.com>'
			);
		}
	});

	test('Should handle array of external classes without @Quick()', () => {
		@Quick(
			{
				members: [ExternalUser],
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Team extends QModel<ITeam> {
			id!: number;
			members!: ExternalUser[];
		}

		const team = new Team({
			id: 1,
			members: [
				{ id: 1, name: 'Alice', email: 'alice@example.com' },
				{ id: 2, name: 'Bob', email: 'bob@example.com' },
			],
		});

		expect(team.id).toBe(1);
		expect(team.members).toHaveLength(2);
		expect(team.members?.[0]).toBeInstanceOf(ExternalUser);
		expect(team.members?.[1]).toBeInstanceOf(ExternalUser);
		// ¿Los miembros se instancian como ExternalUser?
	});

	test('Should handle nested external classes', () => {
		@Quick(
			{
				user: ExternalUser,
				address: ExternalAddress,
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Profile extends QModel<IProfile> {
			userId!: number;
			user!: ExternalUser;
			address!: ExternalAddress;
		}

		const profile = new Profile({
			userId: 1,
			user: {
				id: 100,
				name: 'John',
				email: 'john@example.com',
			},
			address: {
				street: '123 Main St',
				city: 'NYC',
				zipCode: '10001',
			},
		});

		expect(profile.userId).toBe(1);
		expect(profile.user).toBeInstanceOf(ExternalUser);
		expect(profile.address).toBeInstanceOf(ExternalAddress);
	});

	test('Should handle external class with dot notation', () => {
		// Usando dot notation para propiedades de la clase externa
		@Quick(
			{
				user: ExternalUser,
				'user.id': Number,
				'user.name': String,
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Profile extends QModel<IProfile> {
			userId!: number;
			user!: ExternalUser;
		}

		const profile = new Profile({
			userId: 1,
			user: {
				id: 100,
				name: 'John Doe',
				email: 'john@example.com',
			},
		});

		expect(profile.userId).toBe(1);
		expect(profile.user).toBeInstanceOf(ExternalUser);
	});

	test('What happens with plain object (no class specified)?', () => {
		// Sin especificar ningún tipo
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Profile extends QModel<IProfile> {
			userId!: number;
			user!: unknown; // Sin tipo especificado
		}

		const profile = new Profile({
			userId: 1,
			user: {
				id: 100,
				name: 'John',
				email: 'john@example.com',
			},
		});

		expect(profile.userId).toBe(1);
		expect(typeof profile.user).toBe('object');
		expect(profile.user?.constructor?.name).toBe('Object');
	});
});

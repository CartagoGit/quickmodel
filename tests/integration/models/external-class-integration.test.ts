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
		@Quick({
			user: ExternalUser,
		})
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

		console.log('\n=== Single External Class ===');
		console.log('profile.user:', profile.user);
		console.log(
			'profile.user instanceof ExternalUser:',
			profile.user instanceof ExternalUser
		);
		console.log('profile.user.id:', profile.user?.id);
		console.log('profile.user.name:', profile.user?.name);

		if (profile.user instanceof ExternalUser) {
			console.log(
				'profile.user.getDisplayName():',
				profile.user.getDisplayName()
			);
		}

		// Verificar si se instancia correctamente
		expect(profile.userId).toBe(1);

		// ¿Qué pasa con la clase externa?
		// Opción 1: ¿Se instancia como ExternalUser?
		// Opción 2: ¿Se queda como objeto plano?
	});

	test('Should handle array of external classes without @Quick()', () => {
		@Quick({
			members: [ExternalUser],
		})
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

		console.log('\n=== Array of External Classes ===');
		console.log('team.members:', team.members);
		console.log('team.members.length:', team.members?.length);
		console.log('team.members[0]:', team.members?.[0]);
		console.log(
			'team.members[0] instanceof ExternalUser:',
			team.members?.[0] instanceof ExternalUser
		);

		expect(team.id).toBe(1);

		// ¿Los miembros se instancian como ExternalUser?
	});

	test('Should handle nested external classes', () => {
		@Quick({
			user: ExternalUser,
			address: ExternalAddress,
		})
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

		console.log('\n=== Nested External Classes ===');
		console.log(
			'profile.user instanceof ExternalUser:',
			profile.user instanceof ExternalUser
		);
		console.log(
			'profile.address instanceof ExternalAddress:',
			profile.address instanceof ExternalAddress
		);
		console.log('profile.user:', profile.user);
		console.log('profile.address:', profile.address);

		expect(profile.userId).toBe(1);
	});

	test('Should handle external class with dot notation', () => {
		// Usando dot notation para propiedades de la clase externa
		@Quick({
			user: ExternalUser,
			'user.id': Number,
			'user.name': String,
		})
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

		console.log('\n=== External Class with Dot Notation ===');
		console.log('profile.user:', profile.user);
		console.log(
			'profile.user instanceof ExternalUser:',
			profile.user instanceof ExternalUser
		);

		expect(profile.userId).toBe(1);
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

		console.log('\n=== Plain Object (no type) ===');
		console.log('profile.user:', profile.user);
		console.log('typeof profile.user:', typeof profile.user);
		console.log(
			'profile.user constructor:',
			profile.user?.constructor?.name
		);

		expect(profile.userId).toBe(1);
		expect(typeof profile.user).toBe('object');
	});
});

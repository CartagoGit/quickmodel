/**
 * Tests for @Quick({ }, { alias: { prop: 'alias_key' } }) feature.
 *
 * Verifies that passing `alias` in @Quick options:
 *   1. Works at runtime identically to @QAlias (input remapping + output remapping)
 *   2. Runtime: serialize() emits alias keys correctly
 *   3. Type-safe alias output via second generic QModel<T, TAliasMap>
 *
 * TDD: tests written first (RED), then implementation (GREEN).
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ─────────────────────────────────────────────────────────────────────────────
// Models bajo test
// ─────────────────────────────────────────────────────────────────────────────

interface IApiUser {
	firstName: string;
	lastName: string;
	emailAddress: string;
}

@Quick(
	{},
	{
		alias: {
			firstName: 'first_name',
			lastName: 'last_name',
			emailAddress: 'email_address',
		},
		unknownPropertyPolicy: 'keep',
	}
)
class ApiUser extends QModel<IApiUser> {
	declare firstName: string;
	declare lastName: string;
	declare emailAddress: string;
}

interface IPartialAlias {
	createdAt: Date;
	userId: string;
	nom: string;
}

@Quick(
	{ createdAt: Date },
	{
		alias: { userId: 'user_id' },
		unknownPropertyPolicy: 'keep',
	}
)
class PartialAliasModel extends QModel<IPartialAlias> {
	declare createdAt: Date;
	declare userId: string;
	declare nom: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Runtime — deserialización con claves alias en input
// ─────────────────────────────────────────────────────────────────────────────

describe('@Quick alias option — deserialización (input remapping)', () => {
	test('acepta claves alias en el constructor y las mapea a propiedades del modelo', () => {
		const usr = new ApiUser({
			first_name: 'Alice',
			last_name: 'Smith',
			email_address: 'alice@example.com',
		} as any);
		expect(usr.firstName).toBe('Alice');
		expect(usr.lastName).toBe('Smith');
		expect(usr.emailAddress).toBe('alice@example.com');
	});

	test('la clave alias original NO está expuesta en la instancia', () => {
		const usr = new ApiUser({
			first_name: 'Bob',
			last_name: 'Jones',
			email_address: 'bob@example.com',
		} as any);
		expect((usr as any).first_name).toBeUndefined();
		expect((usr as any).last_name).toBeUndefined();
	});

	test('partial alias: solo las claves con alias se remapean', () => {
		const mdl = new PartialAliasModel({
			user_id: 'u-123',
			nom: 'test',
			createdAt: new Date('2024-01-01'),
		} as any);
		expect(mdl.userId).toBe('u-123');
		expect(mdl.nom).toBe('test');
		expect(mdl.createdAt).toBeInstanceOf(Date);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Runtime — serialización con claves alias en output
// ─────────────────────────────────────────────────────────────────────────────

describe('@Quick alias option — serialización (output remapping)', () => {
	test('serialize() emite claves alias en lugar de nombres de propiedad', () => {
		const usr = new ApiUser({
			first_name: 'Dave',
			last_name: 'Jones',
			email_address: 'd@j.com',
		} as any);
		const json = usr.$qm.serialize();
		expect((json as any)['first_name']).toBe('Dave');
		expect((json as any)['last_name']).toBe('Jones');
		expect((json as any)['email_address']).toBe('d@j.com');
	});

	test('serialize() NO emite los nombres de propiedad del modelo cuando hay alias', () => {
		const usr = new ApiUser({
			first_name: 'Eve',
			last_name: 'Black',
			email_address: 'e@b.com',
		} as any);
		const json = usr.$qm.serialize();
		expect((json as any)['firstName']).toBeUndefined();
		expect((json as any)['lastName']).toBeUndefined();
	});

	test('partial alias: solo las claves con alias se remapean en output', () => {
		const mdl = new PartialAliasModel({
			user_id: 'u-456',
			nom: 'partial',
			createdAt: new Date('2024-06-01'),
		} as any);
		const json = mdl.$qm.serialize();
		expect((json as any)['user_id']).toBe('u-456');
		expect((json as any)['nom']).toBe('partial');
		expect((json as any)['userId']).toBeUndefined();
	});

	test('roundtrip completo: construir → serializar → reconstruir', () => {
		const original = new ApiUser({
			first_name: 'Frank',
			last_name: 'Castle',
			email_address: 'f@c.com',
		} as any);
		const serialized = original.$qm.serialize();
		const restored = new ApiUser(serialized as any);
		expect(restored.firstName).toBe('Frank');
		expect(restored.lastName).toBe('Castle');
		expect(restored.emailAddress).toBe('f@c.com');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Limitación de tipado — serialize() tipo no refleja claves alias
//
// Con `experimentalDecorators: true`, TypeScript no puede propagar el alias map
// al tipo de retorno del método serialize() heredado. El tipo sigue siendo
// IQSerializedInterface<T> con claves de propiedad (firstName, etc.).
// Para acceso type-safe a claves alias, cast explícito a Record<string, unknown>
// o usar IQAliasedSerializedInterface como anotación manual.
// ─────────────────────────────────────────────────────────────────────────────

describe('@Quick alias option — comportamiento de serialize() y limitación de tipado', () => {
	test('serialize() emite claves alias accesibles con cast a Record<string, unknown>', () => {
		const usr = new ApiUser({
			first_name: 'Grace',
			last_name: 'Hopper',
			email_address: 'g@h.com',
		} as any);

		// El tipo declarado de serialize() es IQSerializedInterface<IApiUser> (firstName, etc.)
		// pero el valor real en runtime usa claves alias. Cast necesario para acceso type-safe.
		const json = usr.$qm.serialize() as Record<string, unknown>;
		expect(json['first_name']).toBe('Grace');
		expect(json['last_name']).toBe('Hopper');
		expect(json['email_address']).toBe('g@h.com');
	});

	test('partial alias: solo las claves aliasadas se pueden acceder con cast', () => {
		const mdl = new PartialAliasModel({
			user_id: 'u-789',
			nom: 'typed',
			createdAt: '2024-03-01T00:00:00.000Z' as any,
		} as any);

		const json = mdl.$qm.serialize() as Record<string, unknown>;
		expect(json['user_id']).toBe('u-789');
		// `nom` no tiene alias: sigue accesible por su nombre de propiedad
		expect(json['nom']).toBe('typed');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Compatibilidad — @Quick({ alias }) y @QAlias conviven
// ─────────────────────────────────────────────────────────────────────────────

describe('@Quick alias option — compatibilidad con @QAlias', () => {
	test('@Quick sin alias option sigue funcionando exactamente igual', () => {
		@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
		class NoAlias extends QModel<{ nom: string; createdAt: Date }> {
			declare nom: string;
			declare createdAt: Date;
		}

		const inst = new NoAlias({
			nom: 'test',
			createdAt: new Date('2024-01-01'),
		});
		expect(inst.nom).toBe('test');
		expect(inst.createdAt).toBeInstanceOf(Date);

		const json = inst.$qm.serialize();
		// Sin alias, las claves son las del modelo
		expect(json.nom).toBe('test');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: Type-safe alias output — segundo genérico QModel<T, TAliasMap>
//
// El segundo genérico de QModel actúa como la fuente de verdad de tipos:
//   QModel<IUser, { firstName: 'first_name'; lastName: 'last_name' }>
//
// Con él, serialize() devuelve IQAliasedSerializedInterface<IUser, TAliasMap>
// y el IDE autocompleta las claves alias correctamente SIN ningún cast.
// ─────────────────────────────────────────────────────────────────────────────

describe('QModel segundo genérico — serialize() type-safe con alias keys', () => {
	interface ITypedUser {
		firstName: string;
		lastName: string;
		emailAddress: string;
	}

	type ITypedUserAliases = {
		firstName: 'first_name';
		lastName: 'last_name';
		emailAddress: 'email_address';
	};

	@Quick(
		{},
		{
			alias: {
				firstName: 'first_name',
				lastName: 'last_name',
				emailAddress: 'email_address',
			},
			unknownPropertyPolicy: 'keep',
		}
	)
	class TypedUser extends QModel<ITypedUser, ITypedUserAliases> {
		declare firstName: string;
		declare lastName: string;
		declare emailAddress: string;
	}

	test('serialize() devuelve tipo con claves alias SIN cast (compile-time check)', () => {
		const usr = new TypedUser({
			first_name: 'Alice',
			last_name: 'Smith',
			email_address: 'alice@example.com',
		} as any);

		// Estas líneas deben compilar SIN cast — el tipo de json es
		// IQAliasedSerializedInterface<ITypedUser, ITypedUserAliases>
		const json = usr.$qm.serialize();
		expect(json.first_name).toBe('Alice');
		expect(json.last_name).toBe('Smith');
		expect(json.email_address).toBe('alice@example.com');
	});

	test('serialize() no expone las claves originales del modelo en el tipo', () => {
		const usr = new TypedUser({
			first_name: 'Bob',
			last_name: 'Jones',
			email_address: 'b@j.com',
		} as any);
		const json = usr.$qm.serialize();
		// En runtime las claves originales no existen
		expect((json as any).firstName).toBeUndefined();
		expect((json as any).lastName).toBeUndefined();
	});

	test('QModel sin segundo genérico sigue funcionando exactamente igual', () => {
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class PlainModel extends QModel<{ val: string }> {
			declare val: string;
		}

		const inst = new PlainModel({ val: 'hello' });
		const json = inst.$qm.serialize();
		// Sin TAliasMap el tipo es IQSerializedInterface<T> — sin cambios
		expect(json.val).toBe('hello');
	});
});

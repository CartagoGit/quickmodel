import { QInterface, QModel, Quick } from '@/index';
import { QType } from '@/core/decorators/qtype.decorator';

// ============================================
// CLASES ANIDADAS PARA TESTING
// ============================================

// Clase simple sin QModel
class Address {
	constructor(
		public street: string,
		public city: string,
		public zip: string
	) {}
}

// Clase que extiende QModel (nested model)
interface IProfile {
	bio: string;
	website?: string;
	joinedAt: string;
}

@Quick({}) // Necesita @Quick() para auto-detectar Date
class Profile extends QModel<IProfile> {
	bio!: string;
	website?: string;
	joinedAt!: Date;
}

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface IUser {
	id: number;
	name: string;
	surname?: string;
	createdAt: string;
	updatedAt?: string;
	bignumber: string;
	tags: string[]; // Array from backend
	metadata: [string, any][]; // Array of pairs from backend
	symbolic: string;
	dates?: (string | undefined | null)[]; // Array of date strings
	pattern?: string; // RegExp as string from backend
	config?: Record<string, any>; // Plain object (sin clase)
	address?: {
		// Nested plain object
		street: string;
		city: string;
		zip: string;
	};
	profile?: IProfile; // Nested QModel
	addresses?: Array<{
		// Array of plain objects
		street: string;
		city: string;
		zip: string;
	}>;
}

type IUserTransform = {
	createdAt: Date;
	updatedAt?: Date;
	bignumber: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
	symbolic: symbol;
	dates?: (Date | undefined | null)[];
	pattern?: RegExp; // Transformado a RegExp
	config?: Record<string, any>; // Plain object se mantiene igual
	address?: Address; // Transformado a clase Address
	profile?: Profile; // Transformado a QModel Profile
	addresses?: Address[]; // Array transformado a clases Address
};

/**
 * REGLA SIMPLE de QuickModel:
 *
 * - Sin @QType() → la propiedad se COPIA TAL CUAL desde el backend
 * - Con @QType(Type) → la propiedad se TRANSFORMA al tipo especificado
 *
 * Funciona con AMBOS: declare y !
 */

// ✅ OPCIÓN CON @Quick() - Protege automáticamente TODAS las propiedades
@Quick({
	tags: Set,
	metadata: Map,
	symbolic: Symbol,
	dates: (arr: (string | undefined | null)[]): (Date | undefined | null)[] =>
		arr.map((date) => (typeof date === 'string' ? new Date(date) : date)),
	pattern: RegExp, // RegExp desde string
	address: Address, // Plain object → Address class
	profile: Profile, // Plain object → Profile QModel
	addresses: [Address], // Array de plain objects → Array de Address classes
})
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	// Todas las propiedades son protegidas automáticamente por @Quick()
	// Funciona con declare, !, y ?
	id!: number;
	name!: string;
	declare surname: string;

	// @Quick() detecta Date, BigInt automáticamente
	createdAt!: Date;
	updatedAt?: Date;
	bignumber!: bigint;

	// Estos los especificamos en el mapa arriba
	declare tags: Set<string>;
	metadata!: Map<string, any>;
	symbolic!: symbol;
	dates?: (Date | undefined | null)[];
	
	// Nuevos tipos de transformación
	pattern?: RegExp;
	config?: Record<string, any>; // Plain object sin transformación
	address?: Address;
	profile?: Profile;
	addresses?: Address[];

	algo: 'test' = 'test'; // Propiedad normal sin relación con QuickModel
}

const baseObj: IUser = {
	id: 1,
	name: 'Test Algo',
	surname: 'Doe',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-02T00:00:00.000Z',
	bignumber: '9007199254741991',
	tags: ['typescript', 'node', 'backend'], // Plain array
	metadata: [
		['version', '1.0'],
		['author', 'dev'],
	], // Array of pairs
	symbolic: 'my-symbol',
	dates: [
		'2024-01-10T00:00:00.000Z',
		'2024-02-15T00:00:00.000Z',
		undefined,
		null,
	],
	pattern: '^test.*$', // RegExp como string
	config: { theme: 'dark', lang: 'es' }, // Plain object
	address: {
		// Nested plain object
		street: '123 Main St',
		city: 'Madrid',
		zip: '28001',
	},
	profile: {
		// Nested QModel data
		bio: 'Developer',
		website: 'https://example.com',
		joinedAt: '2023-01-15T00:00:00.000Z',
	},
	addresses: [
		// Array of plain objects
		{ street: '456 Elm St', city: 'Barcelona', zip: '08001' },
		{ street: '789 Oak Ave', city: 'Valencia', zip: '46001' },
	],
};

const logTests = (obj: User) => {
	console.log('\n=== RESULTADOS DE LAS PRUEBAS ===');
	console.log({ obj }, '\n');
	console.log('\n=== Propiedades SIN @QType() (copiadas tal cual) ===');
	console.log('id:', obj.id, '→', typeof obj.id, obj.id === 1 ? '✅' : '❌');
	console.log(
		'name:',
		obj.name,
		'→',
		typeof obj.name,
		obj.name === 'Test Algo' ? '✅' : '❌'
	);
	console.log(
		'surname:',
		obj.surname,
		'→',
		typeof obj.surname,
		obj.surname === 'Doe' ? '✅' : '❌'
	);

	console.log('\n=== Propiedades CON @QType() (transformadas) ===');
	console.log(
		'createdAt:',
		obj.createdAt,
		'→ CreatedAt',
		obj.createdAt instanceof Date ? '✅' : '❌'
	);
	console.log(
		'updatedAt:',
		obj.updatedAt,
		'→ UpdatedAt',
		obj.updatedAt instanceof Date ? '✅' : '❌'
	);
	console.log(
		'bignumber:',
		obj.bignumber,
		'→ BigInt',
		typeof obj.bignumber === 'bigint' ? '✅' : '❌'
	);
	console.log(
		'tags:',
		obj.tags,
		'→ Set',
		obj.tags instanceof Set ? '✅' : '❌'
	);
	console.log(
		'metadata:',
		obj.metadata,
		'→ Map',
		obj.metadata instanceof Map ? '✅' : '❌'
	);
	console.log(
		'symbolic:',
		obj.symbolic,
		'→ Symbol',
		typeof obj.symbolic === 'symbol' ? '✅' : '❌'
	);
	console.log(
		'dates:',
		obj.dates,
		'→ (Date | undefined | null)[]',
		Array.isArray(obj.dates) &&
			obj.dates.every(
				(d) => d instanceof Date || d === undefined || d === null
			)
			? '✅'
			: '❌'
	);
	console.log('algo (normal):', obj.algo, obj.algo === 'test' ? '✅' : '❌');
	
	console.log('\n=== Nuevos tipos de transformación ===');
	console.log(
		'pattern:',
		obj.pattern,
		'→ RegExp',
		obj.pattern instanceof RegExp ? '✅' : '❌'
	);
	console.log(
		'config:',
		obj.config,
		'→ Plain Object',
		obj.config && typeof obj.config === 'object' && obj.config.theme === 'dark' ? '✅' : '❌'
	);
	console.log(
		'address:',
		obj.address,
		'→ Address class',
		obj.address instanceof Address && obj.address.city === 'Madrid' ? '✅' : '❌'
	);
	console.log(
		'profile:',
		obj.profile,
		'→ Profile QModel',
		obj.profile instanceof Profile && obj.profile.joinedAt instanceof Date ? '✅' : '❌'
	);
	console.log(
		'addresses:',
		obj.addresses,
		'→ Address[]',
		Array.isArray(obj.addresses) && 
		obj.addresses.length === 2 &&
		obj.addresses.every(a => a instanceof Address) ? '✅' : '❌'
	);
};

console.log('\n====================================');

const user = new User(baseObj);
logTests(user);

console.log('\n====================================');
const allCorrect =
	user.id === 1 &&
	user.name === 'Test Algo' &&
	user.surname === 'Doe' &&
	user.createdAt instanceof Date &&
	typeof user.bignumber === 'bigint' &&
	user.tags instanceof Set &&
	user.metadata instanceof Map &&
	typeof user.symbolic === 'symbol' &&
	Array.isArray(user.dates) &&
	user.dates.every((d) => d instanceof Date || d === undefined || d === null) &&
	user.pattern instanceof RegExp &&
	user.config?.theme === 'dark' &&
	user.address instanceof Address &&
	user.profile instanceof Profile &&
	Array.isArray(user.addresses) &&
	user.addresses.length === 2 &&
	user.addresses.every(a => a instanceof Address);

console.log(
	allCorrect
		? '✅ TODO CORRECTO - Ambas opciones funcionan'
		: '❌ HAY ERRORES'
);
console.log('====================================\n');


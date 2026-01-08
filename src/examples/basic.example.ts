import { QInterface, QModel, QType, Quick } from '../quick.model';

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
}

type IUserTransform = {
	createdAt: Date;
	updatedAt?: Date;
	bignumber: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
	symbolic: symbol;
	dates?: (Date | undefined | null)[];
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
})
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	// Todas las propiedades son protegidas automáticamente por @Quick()
	// Funciona con declare, !, y ?
	id!: number;
	// name!: string;
	name!: string;
	declare surname?: string;

	// @Quick() detecta Date, BigInt automáticamente
	createdAt!: Date;
	updatedAt?: Date;
	bignumber!: bigint;

	// Estos los especificamos en el mapa arriba
	declare tags: Set<string>;
	metadata!: Map<string, any>;
	symbolic!: symbol;
	dates?: (Date | undefined | null)[];

	algo: 'test' = 'test'; // Propiedad normal sin relación con QuickModel
}

const baseObj: IUser = {
	id: 1,
	name: 'Test Algo',
	// surname: 'pepote',
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
		obj.surname === 'pepote' || obj.surname === undefined ? '✅' : '❌'
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
};

console.log('\n====================================');

const user = new User(baseObj);
logTests(user);

console.log('\n====================================');
const allCorrect =
	user.id === 1 &&
	user.name === 'Test Algo' &&
	user.createdAt instanceof Date &&
	typeof user.bignumber === 'bigint' &&
	user.tags instanceof Set &&
	user.metadata instanceof Map &&
	typeof user.symbolic === 'symbol' &&
	Array.isArray(user.dates) &&
	user.dates.every((d) => d instanceof Date || d === undefined || d === null);

console.log(
	allCorrect
		? '✅ TODO CORRECTO - Ambas opciones funcionan'
		: '❌ HAY ERRORES'
);
console.log('====================================\n');

import { QInterface, QModel, QType } from '../quick.model';

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
}

type IUserTransform = {
	createdAt: Date;
	updatedAt?: Date;
	bignumber: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
	symbolic: symbol;
};

/**
 * REGLA SIMPLE de QuickModel:
 *
 * - Sin @QType() → la propiedad se COPIA TAL CUAL desde el backend
 * - Con @QType(Type) → la propiedad se TRANSFORMA al tipo especificado
 *
 * Funciona con AMBOS: declare y !
 */

// ✅ OPCIÓN 1: Con declare
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	// Sin decorador → copia tal cual
	declare id: number;
	name!: string;
	surname?: string;

	// Con @QType() → transforma
	@QType(Date) declare createdAt: Date;
	@QType(Date) declare updatedAt?: Date;
	@QType(BigInt) declare bignumber: bigint;
	@QType(Set) declare tags: Set<string>;
	@QType(Map) metadata!: Map<string, any>;
	@QType(Symbol) declare symbolic: symbol;
}

const baseObj: IUser = {
	id: 1,
	name: 'Test Algo',
	surname: undefined,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-02T00:00:00.000Z',
	bignumber: '9007199254741991',
	tags: ['typescript', 'node', 'backend'], // Plain array
	metadata: [
		['version', '1.0'],
		['author', 'dev'],
	], // Array of pairs
	symbolic: 'my-symbol',
};

const logTests = (obj: User) => {
	console.log('\n=== Propiedades SIN @QType() (copiadas tal cual) ===');
	console.log('id:', obj.id, '→', typeof obj.id, obj.id === 1 ? '✅' : '❌');
	console.log(
		'name:',
		obj.name,
		'→',
		typeof obj.name,
		obj.name === 'Test Algo' ? '✅' : '❌'
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
	user.metadata instanceof Map;

console.log(
	allCorrect
		? '✅ TODO CORRECTO - Ambas opciones funcionan'
		: '❌ HAY ERRORES'
);
console.log('====================================\n');

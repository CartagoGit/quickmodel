import { QModel, QType } from '../quick.model';

interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string;
	balance: string;
	tags: string[];
}

/**
 * ===================================
 * REGLA SIMPLE de QuickModel
 * ===================================
 * 
 * Sin @QType() → copia tal cual
 * Con @QType(Type) → transforma
 * 
 * IMPORTANTE con useDefineForClassFields:
 * - `declare`: Propiedades simples NO necesitan @QType()
 * - `!`: Propiedades simples SÍ necesitan @QType() para prevenir sobrescritura
 */

// ✅ OPCIÓN 1: Con `declare` (más simple, menos decoradores)
class UserWithDeclare extends QModel<IUser> {
	// Sin decorador → copia tal cual
	declare id: number;
	declare name: string;
	declare email: string;
	
	// Con @QType(Type) → transforma
	@QType(Date) declare createdAt: Date;
	@QType(BigInt) declare balance: bigint;
	@QType(Set) declare tags: Set<string>;
}

// ✅ OPCIÓN 2: Con `!` (necesita @QType en todas las propiedades)
class UserWithBang extends QModel<IUser> {
	// Con @QType() sin argumento → copia tal cual
	@QType() id!: number;
	@QType() name!: string;
	@QType() email!: string;
	
	// Con @QType(Type) → transforma
	@QType(Date) createdAt!: Date;
	@QType(BigInt) balance!: bigint;
	@QType(Set) tags!: Set<string>;
}

const userData = {
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
	createdAt: '2024-01-01T00:00:00.000Z',
	balance: '9007199254740991',
	tags: ['admin', 'user']
};

console.log('\n====================================');
console.log('REGLA SIMPLE: @QType = transforma, sin decorador = copia');
console.log('====================================\n');

console.log('=== OPCIÓN 1: Con declare ===');
const userDeclare = new UserWithDeclare(userData);
console.log('  Propiedades sin @QType() (copiadas):');
console.log('    id:', userDeclare.id, typeof userDeclare.id === 'number' ? '✅' : '❌');
console.log('    name:', userDeclare.name, userDeclare.name === 'John Doe' ? '✅' : '❌');
console.log('  Propiedades con @QType() (transformadas):');
console.log('    createdAt:', userDeclare.createdAt instanceof Date ? 'Date ✅' : '❌');
console.log('    balance:', typeof userDeclare.balance === 'bigint' ? 'BigInt ✅' : '❌');
console.log('    tags:', userDeclare.tags instanceof Set ? 'Set ✅' : '❌');

console.log('\n=== OPCIÓN 2: Con ! ===');
const userBang = new UserWithBang(userData);
console.log('  Propiedades con @QType() (copiadas):');
console.log('    id:', userBang.id, typeof userBang.id === 'number' ? '✅' : '❌');
console.log('    name:', userBang.name, userBang.name === 'John Doe' ? '✅' : '❌');
console.log('  Propiedades con @QType(Type) (transformadas):');
console.log('    createdAt:', userBang.createdAt instanceof Date ? 'Date ✅' : '❌');
console.log('    balance:', typeof userBang.balance === 'bigint' ? 'BigInt ✅' : '❌');
console.log('    tags:', userBang.tags instanceof Set ? 'Set ✅' : '❌');

const allCorrect = 
	userDeclare.id === 1 &&
	userDeclare.name === 'John Doe' &&
	userDeclare.createdAt instanceof Date &&
	typeof userDeclare.balance === 'bigint' &&
	userDeclare.tags instanceof Set &&
	userBang.id === 1 &&
	userBang.name === 'John Doe' &&
	userBang.createdAt instanceof Date &&
	typeof userBang.balance === 'bigint' &&
	userBang.tags instanceof Set;

console.log('\n====================================');
console.log(allCorrect ? '✅ AMBAS OPCIONES FUNCIONAN' : '❌ HAY ERRORES');
console.log('====================================\n');

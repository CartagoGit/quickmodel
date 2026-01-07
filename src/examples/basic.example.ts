import { Quick, QModel, QInterface, QType } from '../quick.model';

interface IAlgo {
	id: number;
	name: string;
	date: string;
	bignumber: string;
}

interface IAlgoTransform {
	date: Date;
	bignumber: bigint;
}

// ❌ ESTO NO FUNCIONA - @Quick() con `!` no es compatible
// Con useDefineForClassFields: true, las propiedades con `!` se
// inicializan DESPUÉS del constructor, sobrescribiendo los valores
// @Quick()
// class AlgoWithBang extends QModel<IAlgo> implements QInterface<IAlgo, IAlgoTransform> {
// 	id!: number;
// 	name!: string;
// 	date!: Date;
// 	bignumber!: bigint;
// }

// ✅ OPCIÓN 1: @Quick() con `declare` - Funciona perfectamente
@Quick()
class AlgoWithDeclare extends QModel<IAlgo> implements QInterface<IAlgo, IAlgoTransform> {
	declare id: number;
	declare name: string;
	declare date: Date;
	declare bignumber: bigint;
}

// ✅ OPCIÓN 2: @QType() con `!` - Funciona perfectamente
class AlgoWithQType extends QModel<IAlgo> implements QInterface<IAlgo, IAlgoTransform> {
	@QType() id!: number;
	@QType() name!: string;
	@QType() date!: Date;
	@QType() bignumber!: bigint;
}

const baseObj = {
	id: 1,
	name: 'Test Algo',
	date: '2024-01-01T00:00:00.000Z',
	bignumber: '9007199254741991',
}

console.log('\n=== @Quick() con declare ===');
const algoWithDeclare = new AlgoWithDeclare(baseObj);
console.log('Instance:', algoWithDeclare);
console.log('date is Date?', algoWithDeclare.date instanceof Date ? '✅' : '❌');
console.log('bignumber is BigInt?', typeof algoWithDeclare.bignumber === 'bigint' ? '✅' : '❌');

console.log('\n=== @QType() con ! ===');
const algoWithQType = new AlgoWithQType(baseObj);
console.log('Instance:', algoWithQType);
console.log('date is Date?', algoWithQType.date instanceof Date ? '✅' : '❌');
console.log('bignumber is BigInt?', typeof algoWithQType.bignumber === 'bigint' ? '✅' : '❌');

console.log('\n=== Resumen ===');
console.log('✅ @Quick() + declare: Funciona - Menos código, autodetección de tipos');
console.log('✅ @QType() + !: Funciona - Explícito, control total');
console.log('❌ @Quick() + !: NO funciona - Incompatible con useDefineForClassFields');

import { Quick, QModel, QTransform, QType } from '../quick.model';

interface IObject {
	id: number;
	name: string;
	date: string;
	bignumber: string;
	tags: string[]; // Array from backend
	metadata: [string, any][]; // Array of pairs from backend
}

interface IObjectTransforms {
	date: Date;
	bignumber: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
}

// ✅ OPCIÓN 1: @Quick() con validación automática de tipos
// implements QTransform<...> valida cada propiedad en su lugar
@Quick({ tags: Set, metadata: Map })
class QuickWithDeclare
	extends QModel<IObject>
	implements QTransform<IObject, IObjectTransforms>
{
	declare id: number; // ✅ Validado - TypeScript dará error si pones 'string'
	declare name: string;
	declare date: Date; // ✅ Autodetectado + validado
	declare bignumber: bigint; // ✅ Autodetectado + validado
	declare tags: Set<string>; // ✅ Transformado + validado
	declare metadata: Map<string, any>; // ✅ Transformado + validado
}

// ✅ OPCIÓN 2: Quick() con `!`
@Quick({ tags: Set, metadata: Map })
class QuickWithBang
	extends QModel<IObject>
	implements QTransform<IObject, IObjectTransforms>
{
	id!: number; // ✅ Validado - TypeScript dará error si pones 'string'
	name!: string;
	date!: Date; // ✅ Autodetectado + validado
	bignumber!: bigint; // ✅ Autodetectado + validado
	tags!: Set<string>; // ✅ Transformado + validado
	metadata!: Map<string, any>; // ✅ Transformado + validado
}

// ✅ OPCIÓN 3: @QType() con declare - Control total explícito
class QTypeDeclare
	extends QModel<IObject>
	implements QTransform<IObject, IObjectTransforms>
{
	@QType() declare id: number;
	@QType() declare name: string;
	@QType() declare date: Date;
	@QType() declare bignumber: bigint;
	@QType(Set) declare tags: Set<string>;
	@QType(Map) declare metadata: Map<string, any>;
}

// ✅ OPCIÓN 4: @QType() con `!` - Control total explícito
class QTypeBang
	extends QModel<IObject>
	implements QTransform<IObject, IObjectTransforms>
{
	@QType() id!: number;
	@QType() name!: string;
	@QType() date!: Date;
	@QType() bignumber!: bigint;
	@QType() tags!: Set<string>;
	@QType() metadata!: Map<string, any>;
}

const baseObj = {
	id: 1,
	name: 'Test Algo',
	date: '2024-01-01T00:00:00.000Z',
	bignumber: '9007199254741991',
	tags: ['typescript', 'node', 'backend'], // Plain array
	metadata: [
		['version', '1.0'],
		['author', 'dev'],
	], // Array of pairs
};

const logTests = (
	obj: QuickWithBang | QuickWithDeclare | QTypeDeclare | QTypeBang
) => {
	console.log('Instance:', obj);
	console.log('date is Date?', obj.date instanceof Date ? '✅' : '❌');
	console.log(
		'bignumber is BigInt?',
		typeof obj.bignumber === 'bigint' ? '✅' : '❌'
	);
	console.log('tags is Set?', obj.tags instanceof Set ? '✅' : '❌');
	console.log('metadata is Map?', obj.metadata instanceof Map ? '✅' : '❌');
};

console.log('\n====================================\n');

console.log('\n=== @Quick() con declare ===');
const quickWithDeclare = new QuickWithDeclare(baseObj);
logTests(quickWithDeclare);

console.log('\n=== @Quick() con ! ===');
const quickWithBang = new QuickWithBang(baseObj);
logTests(quickWithBang);

console.log('\n====================================\n');

console.log('=== @QType() con declare ===');
const qTypeWithDeclare = new QTypeDeclare(baseObj);
logTests(qTypeWithDeclare);

console.log('=== @QType() con ! ===');
const qTypeWithBang = new QTypeBang(baseObj);
logTests(qTypeWithBang);

const isWorking = (
	obj: QTypeBang | QTypeDeclare | QuickWithBang | QuickWithDeclare
) =>
	obj.date instanceof Date &&
	typeof obj.bignumber === 'bigint' &&
	obj.tags instanceof Set &&
	obj.metadata instanceof Map;

console.log('\n=== Resumen ===');
const quickDeclareWorks = isWorking(quickWithDeclare);
const quickBangWorks = isWorking(quickWithBang);
const qtypeDeclareWorks = isWorking(qTypeWithDeclare);
const qtypeBangWorks = isWorking(qTypeWithBang);

console.log(
	`${quickDeclareWorks ? '✅' : '❌'} OPCION 1 => @Quick() + declare: ${
		quickDeclareWorks ? 'Funciona' : 'NO funciona'
	} - Menos código, autodetección de tipos`
);
console.log(
	`${quickBangWorks ? '✅' : '❌'} OPCION 2 => @Quick() + !: ${
		quickBangWorks ? 'Funciona' : 'NO funciona'
	} - Menos código, autodetección de tipos`
);

console.log(
	`${qtypeDeclareWorks ? '✅' : '❌'} OPCION 3 => @QType() + declare: ${
		qtypeDeclareWorks ? 'Funciona' : 'NO funciona'
	} - Más código, control total explícito`
);
console.log(
	`${qtypeBangWorks ? '✅' : '❌'} OPCION 4 => @QType() + !: ${
		qtypeBangWorks ? 'Funciona' : 'NO funciona'
	} - Más código, control total explícito`
);

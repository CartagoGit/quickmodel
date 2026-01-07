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

// ✅ OPCIÓN 1: @Quick() con declare - La más simple
// @Quick() detecta automáticamente Date/BigInt
// Necesita type mapping explícito solo para Set/Map (porque no puede distinguir de Array)
@Quick({ tags: Set, metadata: Map })
class QuickWithDeclare implements QTransform<IObject, IObjectTransforms> {
	declare id: number;
	declare name: string;
	declare date: Date;
	declare bignumber: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}

// ✅ OPCIÓN 2: Quick() con `!` - Ahora debería funcionar
// Con la nueva estrategia, @Quick() crea la instancia directamente sin heredar
@Quick({ tags: Set, metadata: Map })
class QuickWithBang implements QTransform<IObject, IObjectTransforms> {
	id!: number;
	name!: string;
	date!: Date;
	bignumber!: bigint;
	tags!: Set<string>;
	metadata!: Map<string, any>;
}

// ✅ OPCIÓN 3: @QType() con declare - Autodetección inteligente
// Con @QType() sin argumentos, detecta automáticamente:
// - Date: strings ISO
// - BigInt: números de 15+ dígitos
// - Map: arrays de pares [[k,v], [k,v]]
// - Set: arrays con elementos únicos O nombres como "tags", "categories", etc.
class QTypeDeclare extends QModel<IObject> implements QTransform<IObject, IObjectTransforms> {
	@QType() declare id: number;
	@QType() declare name: string;
	@QType() declare date: Date; // Autodetectado por patrón ISO
	@QType() declare bignumber: bigint; // Autodetectado por 15+ dígitos
	@QType() declare tags: Set<string>; // Autodetectado por nombre "tags"
	@QType() declare metadata: Map<string, any>; // Autodetectado por pares
}

// ✅ OPCIÓN 4: @QType() con `!` - TypeScript emite metadata automáticamente
class QTypeBang extends QModel<IObject> implements QTransform<IObject, IObjectTransforms> {
	@QType() id!: number;
	@QType() name!: string;
	@QType() date!: Date; // Metadata emitida por TypeScript
	@QType() bignumber!: bigint;
	@QType() tags!: Set<string>; // Metadata: design:type = Set
	@QType() metadata!: Map<string, any>; // Metadata: design:type = Map
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

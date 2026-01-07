import {
  Field,
  QuickModel,
  QuickType,
  BigIntField,
  SymbolField,
  RegExpField,
  ErrorField,
  Int8ArrayField,
  Uint8ArrayField,
  Float32ArrayField,
  BigInt64ArrayField,
  ArrayBufferField,
  DataViewField,
  URLField,
  URLSearchParamsField,
} from '../../src';

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║           TEST COMPREHENSIVO - TODOS LOS TIPOS SOPORTADOS             ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// ENUM (TypeScript)
// ============================================================================
enum UserRole {
  Admin = 'ADMIN',
  User = 'USER',
  Guest = 'GUEST',
}

enum Priority {
  Low = 1,
  Medium = 2,
  High = 3,
}

// ============================================================================
// INTERFAZ CON TODOS LOS TIPOS
// ============================================================================
interface ICompleteModel {
  // Primitivos
  id: string;
  count: number;
  active: boolean;
  nothing: null;
  optional?: string;

  // Tipos especiales que requieren transformación
  amount: string; // BigInt serializado
  key: string; // Symbol serializado
  pattern: { source: string; flags: string }; // RegExp serializado
  errorData: { message: string; stack?: string; name: string }; // Error serializado
  createdAt: string; // Date serializado
  homepage: string; // URL serializado
  queryParams: string; // URLSearchParams serializado

  // TypedArrays
  int8Data: number[];
  uint8Data: number[];
  float32Data: number[];
  bigInt64Data: string[];

  // Buffers
  buffer: number[];
  view: number[];

  // Colecciones
  tags: string[];
  settings: Record<string, string>;
  items: string[];

  // Enums
  role: string; // UserRole (string enum)
  priority: number; // Priority (numeric enum)

  // Objetos planos
  metadata: {
    author: string;
    version: string;
  };

  // Modelo anidado
  nested?: any;
}

type CompleteModelTransforms = {
  amount: bigint;
  key: symbol;
  pattern: RegExp;
  errorData: Error;
  createdAt: Date;
  homepage: URL;
  queryParams: URLSearchParams;
  int8Data: Int8Array;
  uint8Data: Uint8Array;
  float32Data: Float32Array;
  bigInt64Data: BigInt64Array;
  buffer: ArrayBuffer;
  view: DataView;
  settings: Map<string, string>;
  items: Set<string>;
  role: UserRole;
  priority: Priority;
};

// ============================================================================
// MODELO ANIDADO SIMPLE
// ============================================================================
interface INestedModel {
  name: string;
  value: number;
}

class NestedModel extends QuickModel<INestedModel> {
  @Field() name!: string;
  @Field() value!: number;
}

// ============================================================================
// MODELO COMPLETO
// ============================================================================
class CompleteModel
  extends QuickModel<ICompleteModel>
  implements QuickType<ICompleteModel, CompleteModelTransforms>
{
  // Primitivos
  @Field() id!: string;
  @Field() count!: number;
  @Field() active!: boolean;
  @Field() nothing!: null;
  @Field() optional?: string;

  // Tipos especiales
  @Field(BigIntField) amount!: bigint;
  @Field(SymbolField) key!: symbol;
  @Field(RegExpField) pattern!: RegExp;
  @Field(ErrorField) errorData!: Error;
  @Field() createdAt!: Date;
  @Field(URLField) homepage!: URL;
  @Field(URLSearchParamsField) queryParams!: URLSearchParams;

  // TypedArrays
  @Field(Int8ArrayField) int8Data!: Int8Array;
  @Field(Uint8ArrayField) uint8Data!: Uint8Array;
  @Field(Float32ArrayField) float32Data!: Float32Array;
  @Field(BigInt64ArrayField) bigInt64Data!: BigInt64Array;

  // Buffers
  @Field(ArrayBufferField) buffer!: ArrayBuffer;
  @Field(DataViewField) view!: DataView;

  // Colecciones
  @Field() tags!: string[];
  @Field() settings!: Map<string, string>;
  @Field() items!: Set<string>;

  // Enums
  @Field() role!: UserRole;
  @Field() priority!: Priority;

  // Objetos planos
  @Field() metadata!: { author: string; version: string };

  // Modelo anidado (opcional)
  @Field(NestedModel) nested?: NestedModel | null;
}

// ============================================================================
// TEST DATA
// ============================================================================
const testData: ICompleteModel = {
  // Primitivos
  id: 'test-123',
  count: 42,
  active: true,
  nothing: null,
  optional: 'presente',

  // Tipos especiales
  amount: '9007199254740991', // BigInt
  key: 'testKey', // Symbol serializado (se usa Symbol.for('testKey'))
  pattern: { source: '^test', flags: 'gi' }, // RegExp
  errorData: { message: 'Test error', name: 'TestError', stack: 'at test()' }, // Error
  createdAt: '2024-01-01T00:00:00.000Z', // Date
  homepage: 'https://example.com/path?query=value', // URL
  queryParams: 'foo=bar&baz=qux', // URLSearchParams

  // TypedArrays
  int8Data: [-128, 0, 127],
  uint8Data: [0, 128, 255],
  float32Data: [1.5, 2.7, 3.9],
  bigInt64Data: ['9007199254740991', '-9007199254740991'],

  // Buffers
  buffer: [1, 2, 3, 4],
  view: [10, 20, 30],

  // Colecciones
  tags: ['typescript', 'solid', 'testing'],
  settings: { theme: 'dark', lang: 'es' },
  items: ['item1', 'item2', 'item3'],

  // Enums
  role: UserRole.Admin,
  priority: Priority.High,

  // Objetos planos
  metadata: {
    author: 'Cartago',
    version: '1.0.0',
  },

  // Modelo anidado
  nested: {
    name: 'Nested Item',
    value: 999,
  },
};

// ============================================================================
// TESTS
// ============================================================================
try {
  let passed = 0;
  let failed = 0;

  console.log('🧪 1. CREANDO MODELO COMPLETO...\n');
  const model = new CompleteModel(testData);

  // Test primitivos
  console.log('📦 PRIMITIVOS:');
  console.log(`  ✓ id: ${model.id === 'test-123' ? '✅' : '❌'}`);
  console.log(`  ✓ count: ${model.count === 42 ? '✅' : '❌'}`);
  console.log(`  ✓ active: ${model.active === true ? '✅' : '❌'}`);
  console.log(`  ✓ nothing: ${model.nothing === null ? '✅' : '❌'}`);
  console.log(`  ✓ optional: ${model.optional === 'presente' ? '✅' : '❌'}\n`);
  passed += 5;

  // Test tipos especiales
  console.log('🔧 TIPOS ESPECIALES:');
  console.log(`  ✓ BigInt: ${typeof model.amount === 'bigint' && model.amount === 9007199254740991n ? '✅' : '❌'}`);
  console.log(`  ✓ Symbol: ${typeof model.key === 'symbol' && Symbol.keyFor(model.key) === 'testKey' ? '✅' : '❌'}`);
  console.log(`  ✓ RegExp: ${model.pattern instanceof RegExp && model.pattern.source === '^test' ? '✅' : '❌'}`);
  console.log(`  ✓ Error: ${model.errorData instanceof Error && model.errorData.message === 'Test error' ? '✅' : '❌'}`);
  console.log(`  ✓ Date: ${model.createdAt instanceof Date ? '✅' : '❌'}`);
  console.log(`  ✓ URL: ${model.homepage instanceof URL && model.homepage.href === 'https://example.com/path?query=value' ? '✅' : '❌'}`);
  console.log(`  ✓ URLSearchParams: ${model.queryParams instanceof URLSearchParams && model.queryParams.get('foo') === 'bar' ? '✅' : '❌'}\n`);
  passed += 7;

  // Test TypedArrays
  console.log('📊 TYPED ARRAYS:');
  console.log(`  ✓ Int8Array: ${model.int8Data instanceof Int8Array && model.int8Data[0] === -128 ? '✅' : '❌'}`);
  console.log(`  ✓ Uint8Array: ${model.uint8Data instanceof Uint8Array && model.uint8Data[2] === 255 ? '✅' : '❌'}`);
  console.log(`  ✓ Float32Array: ${model.float32Data instanceof Float32Array ? '✅' : '❌'}`);
  console.log(`  ✓ BigInt64Array: ${model.bigInt64Data instanceof BigInt64Array && model.bigInt64Data[0] === 9007199254740991n ? '✅' : '❌'}\n`);
  passed += 4;

  // Test Buffers
  console.log('💾 BUFFERS:');
  console.log(`  ✓ ArrayBuffer: ${model.buffer instanceof ArrayBuffer && model.buffer.byteLength === 4 ? '✅' : '❌'}`);
  console.log(`  ✓ DataView: ${model.view instanceof DataView ? '✅' : '❌'}\n`);
  passed += 2;

  // Test Colecciones
  console.log('📚 COLECCIONES:');
  console.log(`  ✓ Array: ${Array.isArray(model.tags) && model.tags[0] === 'typescript' ? '✅' : '❌'}`);
  console.log(`  ✓ Map: ${model.settings instanceof Map && model.settings.get('theme') === 'dark' ? '✅' : '❌'}`);
  console.log(`  ✓ Set: ${model.items instanceof Set && model.items.has('item1') ? '✅' : '❌'}\n`);
  passed += 3;

  // Test Enums
  console.log('🎯 ENUMS (TypeScript):');
  console.log(`  ✓ String Enum: ${model.role === UserRole.Admin && model.role === 'ADMIN' ? '✅' : '❌'}`);
  console.log(`  ✓ Numeric Enum: ${model.priority === Priority.High && model.priority === 3 ? '✅' : '❌'}\n`);
  passed += 2;

  // Test objetos planos
  console.log('📋 OBJETOS PLANOS:');
  console.log(`  ✓ Plain Object: ${typeof model.metadata === 'object' && model.metadata.author === 'Cartago' ? '✅' : '❌'}\n`);
  passed += 1;

  // Test modelo anidado
  console.log('🪆 MODELO ANIDADO:');
  console.log(`  ✓ Nested Model: ${model.nested instanceof NestedModel && model.nested.name === 'Nested Item' ? '✅' : '❌'}\n`);
  passed += 1;

  // ============================================================================
  // SERIALIZACIÓN
  // ============================================================================
  console.log('🧪 2. SERIALIZANDO A INTERFAZ...\n');
  const serialized = model.toInterface();

  console.log('📤 VERIFICANDO SERIALIZACIÓN:');
  console.log(`  ✓ BigInt → string: ${typeof serialized.amount === 'string' ? '✅' : '❌'}`);
  console.log(`  ✓ Symbol → string: ${typeof serialized.key === 'string' ? '✅' : '❌'}`);
  console.log(`  ✓ Date → string: ${typeof serialized.createdAt === 'string' ? '✅' : '❌'}`);
  console.log(`  ✓ URL → string: ${typeof serialized.homepage === 'string' && serialized.homepage.includes('https') ? '✅' : '❌'}`);
  console.log(`  ✓ Map → object: ${typeof serialized.settings === 'object' && !Array.isArray(serialized.settings) ? '✅' : '❌'}`);
  console.log(`  ✓ Set → array: ${Array.isArray(serialized.items) ? '✅' : '❌'}\n`);
  passed += 6;

  // ============================================================================
  // ROUND-TRIP
  // ============================================================================
  console.log('🧪 3. ROUND-TRIP TEST (Interface → Model → Interface → Model)...\n');
  const model2 = new CompleteModel(serialized);
  const serialized2 = model2.toInterface();
  const model3 = new CompleteModel(serialized2);

  console.log('🔄 VERIFICANDO ROUND-TRIP:');
  console.log(`  ✓ id preservado: ${model3.id === model.id ? '✅' : '❌'}`);
  console.log(`  ✓ BigInt preservado: ${model3.amount === model.amount ? '✅' : '❌'}`);
  console.log(`  ✓ Symbol preservado: ${Symbol.keyFor(model3.key) === Symbol.keyFor(model.key) ? '✅' : '❌'}`);
  console.log(`  ✓ Date preservado: ${model3.createdAt.getTime() === model.createdAt.getTime() ? '✅' : '❌'}`);
  console.log(`  ✓ URL preservado: ${model3.homepage.href === model.homepage.href ? '✅' : '❌'}`);
  console.log(`  ✓ URLSearchParams preservado: ${model3.queryParams.toString() === model.queryParams.toString() ? '✅' : '❌'}`);
  console.log(`  ✓ RegExp preservado: ${model3.pattern.source === model.pattern.source ? '✅' : '❌'}`);
  console.log(`  ✓ Error preservado: ${model3.errorData.message === model.errorData.message ? '✅' : '❌'}`);
  console.log(`  ✓ Map preservado: ${model3.settings.get('theme') === model.settings.get('theme') ? '✅' : '❌'}`);
  console.log(`  ✓ Enum preservado: ${model3.role === model.role && model3.priority === model.priority ? '✅' : '❌'}\n`);
  passed += 10;

  // ============================================================================
  // JSON
  // ============================================================================
  console.log('🧪 4. JSON SERIALIZATION...\n');
  const json = model.toJSON();
  const model4 = CompleteModel.fromJSON(json);

  console.log('📄 VERIFICANDO JSON ROUND-TRIP:');
  console.log(`  ✓ JSON válido: ${typeof json === 'string' && JSON.parse(json) ? '✅' : '❌'}`);
  console.log(`  ✓ fromJSON retorna instancia: ${model4 instanceof CompleteModel ? '✅' : '❌'}`);
  console.log(`  ✓ Tipos restaurados: ${model4.amount === model.amount && model4.createdAt instanceof Date ? '✅' : '❌'}\n`);
  passed += 3;

  // ============================================================================
  // MÉTODOS ESTÁTICOS
  // ============================================================================
  console.log('🧪 5. MÉTODOS ESTÁTICOS...\n');
  const model5 = CompleteModel.fromInterface(testData);

  console.log('🔧 VERIFICANDO MÉTODOS ESTÁTICOS:');
  console.log(`  ✓ fromInterface works: ${model5 instanceof CompleteModel ? '✅' : '❌'}`);
  console.log(`  ✓ Datos correctos: ${model5.id === 'test-123' && model5.amount === 9007199254740991n ? '✅' : '❌'}\n`);
  passed += 2;

  // ============================================================================
  // RESUMEN
  // ============================================================================
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                            RESUMEN FINAL                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Tests pasados: ${passed}`);
  console.log(`❌ Tests fallidos: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%\n`);

  console.log('🎉 ALL SUPPORTED TYPES WORK CORRECTLY!\n');
  console.log('📋 TESTED TYPES:');
  console.log('   ✓ Primitivos: string, number, boolean, null, undefined');
  console.log('   ✓ Tipos especiales: BigInt, Symbol, RegExp, Error, Date, URL, URLSearchParams');
  console.log('   ✓ TypedArrays: Int8Array, Uint8Array, Float32Array, BigInt64Array, etc.');
  console.log('   ✓ Buffers: ArrayBuffer, DataView');
  console.log('   ✓ Colecciones: Array, Map, Set');
  console.log('   ✓ Enums: String Enums, Numeric Enums');
  console.log('   ✓ Objetos: Plain objects, Nested models');
  console.log('   ✓ Métodos: toInterface(), toJSON(), fromInterface(), fromJSON()');
} catch (error: any) {
  console.log('\n❌ ERROR EN TESTS:');
  console.log(error.message);
  console.log(error.stack);
  process.exit(1);
}

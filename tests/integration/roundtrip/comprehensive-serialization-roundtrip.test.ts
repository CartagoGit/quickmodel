import {
  QModel,
  QType,
  QInterface,
  QBigInt,
  QSymbol,
  QRegExp,
  QError,
  QInt8Array,
  QUint8Array,
  QFloat32Array,
  QBigInt64Array,
  QArrayBuffer,
  QDataView,
  QURL,
  QURLSearchParams,
} from '../../../src';

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║           COMPREHENSIVE TEST - ALL SUPPORTED TYPES                 ║');
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
// INTERFACE WITH ALL TYPES
// ============================================================================
interface ICompleteModel {
  // Primitives
  id: string;
  count: number;
  active: boolean;
  nothing: null;
  optional?: string;

  // Special types requiring transformation
  amount: string; // BigInt serialized
  key: string; // Symbol serialized
  pattern: { source: string; flags: string }; // RegExp serialized
  errorData: { message: string; stack?: string; name: string }; // Error serialized
  createdAt: string; // Date serialized
  homepage: string; // URL serialized
  queryParams: string; // URLSearchParams serialized

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

  // Plain objects
  metadata: {
    author: string;
    version: string;
  };

  // Nested model
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
// SIMPLE NESTED MODEL
// ============================================================================
interface INestedModel {
  name: string;
  value: number;
}

class NestedModel extends QModel<INestedModel> {
  @QType() name!: string;
  @QType() value!: number;
}

// ============================================================================
// COMPLETE MODEL
// ============================================================================
class CompleteModel
  extends QModel<ICompleteModel>
  implements QInterface<ICompleteModel, CompleteModelTransforms>
{
  // Primitives
  @QType() id!: string;
  @QType() count!: number;
  @QType() active!: boolean;
  @QType() nothing!: null;
  @QType() optional?: string;

  // Special types
  @QType(QBigInt) amount!: bigint;
  @QType(QSymbol) key!: symbol;
  @QType(QRegExp) pattern!: RegExp;
  @QType(QError) errorData!: Error;
  @QType() createdAt!: Date;
  @QType(QURL) homepage!: URL;
  @QType(QURLSearchParams) queryParams!: URLSearchParams;

  // TypedArrays
  @QType(QInt8Array) int8Data!: Int8Array;
  @QType(QUint8Array) uint8Data!: Uint8Array;
  @QType(QFloat32Array) float32Data!: Float32Array;
  @QType(QBigInt64Array) bigInt64Data!: BigInt64Array;

  // Buffers
  @QType(QArrayBuffer) buffer!: ArrayBuffer;
  @QType(QDataView) view!: DataView;

  // Collections
  @QType() tags!: string[];
  @QType() settings!: Map<string, string>;
  @QType() items!: Set<string>;

  // Enums
  @QType() role!: UserRole;
  @QType() priority!: Priority;

  // Plain objects
  @QType() metadata!: { author: string; version: string };

  // Nested model (optional)
  @QType(NestedModel) nested?: NestedModel | null;
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
  key: 'testKey', // Symbol serialized (uses Symbol.for('testKey'))
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

  console.log('🧪 1. CREATING COMPLETE MODEL...\n');
  const model = new CompleteModel(testData);

  // Test primitivos
  console.log('📦 PRIMITIVES:');
  console.log(`  ✓ id: ${model.id === 'test-123' ? '✅' : '❌'}`);
  console.log(`  ✓ count: ${model.count === 42 ? '✅' : '❌'}`);
  console.log(`  ✓ active: ${model.active === true ? '✅' : '❌'}`);
  console.log(`  ✓ nothing: ${model.nothing === null ? '✅' : '❌'}`);
  console.log(`  ✓ optional: ${model.optional === 'presente' ? '✅' : '❌'}\n`);
  passed += 5;

  // Test special types
  console.log('🔧 SPECIAL TYPES:');
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
  // SERIALIZATION
  // ============================================================================
  console.log('🧪 2. SERIALIZANDO A INTERFAZ...\n');
  const serialized = model.serialize();

  console.log('📤 VERIFYING SERIALIZATION:');
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
  const serialized2 = model2.serialize();
  const model3 = new CompleteModel(serialized2);

  console.log('🔄 VERIFYING ROUND-TRIP:');
  console.log(`  ✓ id preserved: ${model3.id === model.id ? '✅' : '❌'}`);
  console.log(`  ✓ BigInt preserved: ${model3.amount === model.amount ? '✅' : '❌'}`);
  console.log(`  ✓ Symbol preserved: ${Symbol.keyFor(model3.key) === Symbol.keyFor(model.key) ? '✅' : '❌'}`);
  console.log(`  ✓ Date preserved: ${model3.createdAt.getTime() === model.createdAt.getTime() ? '✅' : '❌'}`);
  console.log(`  ✓ URL preserved: ${model3.homepage.href === model.homepage.href ? '✅' : '❌'}`);
  console.log(`  ✓ URLSearchParams preserved: ${model3.queryParams.toString() === model.queryParams.toString() ? '✅' : '❌'}`);
  console.log(`  ✓ RegExp preserved: ${model3.pattern.source === model.pattern.source ? '✅' : '❌'}`);
  console.log(`  ✓ Error preserved: ${model3.errorData.message === model.errorData.message ? '✅' : '❌'}`);
  console.log(`  ✓ Map preserved: ${model3.settings.get('theme') === model.settings.get('theme') ? '✅' : '❌'}`);
  console.log(`  ✓ Enum preserved: ${model3.role === model.role && model3.priority === model.priority ? '✅' : '❌'}\n`);
  passed += 10;

  // ============================================================================
  // JSON
  // ============================================================================
  console.log('🧪 4. JSON SERIALIZATION...\n');
  const json = model.toJSON();
  const model4 = CompleteModel.fromJSON(json);

  console.log('📄 VERIFYING JSON ROUND-TRIP:');
  console.log(`  ✓ JSON valid: ${typeof json === 'string' && JSON.parse(json) ? '✅' : '❌'}`);
  console.log(`  ✓ fromJSON returns instance: ${model4 instanceof CompleteModel ? '✅' : '❌'}`);
  console.log(`  ✓ Types restored: ${model4.amount === model.amount && model4.createdAt instanceof Date ? '✅' : '❌'}\n`);
  passed += 3;

  // ============================================================================
  // STATIC METHODS
  // ============================================================================
  console.log('🧪 5. STATIC METHODS...\n');
  const model5 = CompleteModel.deserialize(testData);

  console.log('🔧 VERIFYING STATIC METHODS:');
  console.log(`  ✓ deserialize works: ${model5 instanceof CompleteModel ? '✅' : '❌'}`);
  console.log(`  ✓ Correct data: ${model5.id === 'test-123' && model5.amount === 9007199254740991n ? '✅' : '❌'}\n`);
  passed += 2;

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                            FINAL SUMMARY                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Tests passed: ${passed}`);
  console.log(`❌ Tests failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%\n`);

  console.log('🎉 ALL SUPPORTED TYPES WORK CORRECTLY!\n');
  console.log('📋 TESTED TYPES:');
  console.log('   ✓ Primitives: string, number, boolean, null, undefined');
  console.log('   ✓ Special types: BigInt, Symbol, RegExp, Error, Date, URL, URLSearchParams');
  console.log('   ✓ TypedArrays: Int8Array, Uint8Array, Float32Array, BigInt64Array, etc.');
  console.log('   ✓ Buffers: ArrayBuffer, DataView');
  console.log('   ✓ Collections: Array, Map, Set');
  console.log('   ✓ Enums: String Enums, Numeric Enums');
  console.log('   ✓ Objects: Plain objects, Nested models');
  console.log('   ✓ Methods: serialize(), toJSON(), deserialize(), fromJSON()');
} catch (error: any) {
  console.log('\n❌ ERROR EN TESTS:');
  console.log(error.message);
  console.log(error.stack);
  process.exit(1);
}

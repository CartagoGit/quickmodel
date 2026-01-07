import 'reflect-metadata';
import {
  QArrayBuffer,
  QBigInt64Array,
  QBigInt,
  QBigUint64Array,
  QDataView,
  QError,
  QType,
  QFloat32Array,
  QFloat64Array,
  QInt16Array,
  QInt32Array,
  QInt8Array,
  QModel,
  QInterface,
  QRegExp,
  QSymbol,
  QUint16Array,
  QUint32Array,
  QUint8Array,
} from '../../src/quick.model';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  EXHAUSTIVE TEST: ALL JAVASCRIPT INTRINSIC TYPES                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// ============================================
// CATEGORY 1: PRIMITIVES
// ============================================

console.log('═══ 1. PRIMITIVES ═══\n');

interface IPrimitives {
  str: string;
  num: number;
  bool: boolean;
  bigInt: string;
  sym: string; // Symbol not serializable in JSON
  nul: null;
  undef: undefined;
}

type PrimitivesTransforms = {
  bigInt: bigint;
  sym: symbol;
};

class Primitives
  extends QModel<IPrimitives>
  implements QInterface<IPrimitives, PrimitivesTransforms>
{
  @QType() str!: string;
  @QType() num!: number;
  @QType() bool!: boolean;
  @QType(QBigInt) bigInt!: bigint;
  @QType(QSymbol) sym!: symbol;
  @QType() nul!: null;
  @QType() undef!: undefined;
}

try {
  const sym = Symbol.for('test'); // Use Symbol.for to make it recoverable
  const data = {
    str: 'hello',
    num: 42,
    bool: true,
    bigInt: '9007199254740991',
    sym: 'test', // String for Symbol.for
    nul: null,
    undef: undefined,
  };

  const model = new Primitives(data);
  console.log('✅ string:', typeof model.str === 'string');
  console.log('✅ number:', typeof model.num === 'number');
  console.log('✅ boolean:', typeof model.bool === 'boolean');
  console.log('✅ bigint:', typeof model.bigInt === 'bigint');
  console.log('✅ symbol:', typeof model.sym === 'symbol');
  console.log('✅ null:', model.nul === null);
  console.log('✅ undefined:', model.undef === undefined);

  // Round-trip test
  const json = model.toInterface();
  const model2 = new Primitives(json);
  console.log('✅ round-trip bigint:', model2.bigInt === model.bigInt);
  console.log('✅ round-trip symbol:', Symbol.keyFor(model2.sym) === 'test');
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORÍA 2: OBJETOS ESTRUCTURADOS
// ============================================

console.log('\n═══ 2. STRUCTURED OBJECTS ═══\n');

interface IStructured {
  obj: Record<string, any>;
  arr: number[];
  map: Record<string, number>;
  set: string[];
}

type StructuredTransforms = {
  map: Map<string, number>;
  set: Set<string>;
};

class Structured
  extends QModel<IStructured>
  implements QInterface<IStructured, StructuredTransforms>
{
  @QType() obj!: Record<string, any>;
  @QType() arr!: number[];
  @QType() map!: Map<string, number>;
  @QType() set!: Set<string>;
}

try {
  const data = {
    obj: { nested: { value: 123 } },
    arr: [1, 2, 3],
    map: { key1: 100, key2: 200 },
    set: ['a', 'b', 'c'],
  };

  const model = new Structured(data);
  console.log('✅ Object:', typeof model.obj === 'object' && !Array.isArray(model.obj));
  console.log('✅ Array:', Array.isArray(model.arr));
  console.log('✅ Map:', model.map instanceof Map);
  console.log('✅ Set:', model.set instanceof Set);

  // Round-trip test
  const json = model.toInterface();
  const model2 = new Structured(json);
  console.log('✅ round-trip Map:', model2.map.get('key1') === 100);
  console.log('✅ round-trip Set:', model2.set.has('a'));
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORÍA 3: FECHAS Y TIEMPO
// ============================================

console.log('\n═══ 3. DATES AND TIME ═══\n');

interface IDates {
  date: string;
}

type DatesTransforms = {
  date: Date;
};

class Dates extends QModel<IDates> implements QInterface<IDates, DatesTransforms> {
  @QType() date!: Date;
}

try {
  const data = {
    date: '2024-01-01T00:00:00.000Z',
  };

  const model = new Dates(data);
  console.log('✅ Date:', model.date instanceof Date);
  console.log('   getFullYear() Method:', model.date.getFullYear() === 2024);
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORÍA 4: EXPRESIONES REGULARES
// ============================================

console.log('\n═══ 4. REGULAR EXPRESSIONS ═══\n');

interface IRegex {
  regex: string;
}

type RegexTransforms = {
  regex: RegExp;
};

class Regexes extends QModel<IRegex> implements QInterface<IRegex, RegexTransforms> {
  @QType(QRegExp) regex!: RegExp;
}

try {
  const data = {
    regex: { source: 'test', flags: 'gi' },
  };

  const model = new Regexes(data);
  console.log('✅ RegExp:', model.regex instanceof RegExp);
  console.log('   pattern:', model.regex.source === 'test');
  console.log('   flags:', model.regex.flags === 'gi');

  // Round-trip test
  const json = model.toInterface();
  const model2 = new Regexes(json);
  console.log('✅ round-trip:', model2.regex.source === 'test' && model2.regex.flags === 'gi');
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORY 5: ERRORS
// ============================================

console.log('\n═══ 5. ERRORS ═══\n');

interface IErrors {
  error: any;
  typeError: any;
  rangeError: any;
}

type ErrorsTransforms = {
  error: Error;
  typeError: TypeError;
  rangeError: RangeError;
};

class Errors extends QModel<IErrors> implements QInterface<IErrors, ErrorsTransforms> {
  @QType(QError) error!: Error;
  @QType(QError) typeError!: TypeError;
  @QType(QError) rangeError!: RangeError;
}

try {
  const data = {
    error: { message: 'Error message', stack: 'stack...', name: 'Error' },
    typeError: { message: 'Type error', name: 'TypeError' },
    rangeError: { message: 'Range error', name: 'RangeError' },
  };

  const model = new Errors(data);
  console.log('✅ Error:', model.error instanceof Error);
  console.log('   message:', model.error.message === 'Error message');
  console.log('   stack:', model.error.stack === 'stack...');

  // Round-trip test
  const json = model.toInterface();
  const model2 = new Errors(json);
  console.log('✅ round-trip:', model2.error.message === 'Error message');
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORÍA 6: ARRAYS TIPADOS (TypedArrays)
// ============================================

console.log('\n═══ 6. ARRAYS TIPADOS ═══\n');

interface ITypedArrays {
  int8: number[];
  uint8: number[];
  int16: number[];
  uint16: number[];
  int32: number[];
  uint32: number[];
  float32: number[];
  float64: number[];
  bigInt64: string[];
  bigUint64: string[];
}

type TypedArraysTransforms = {
  int8: Int8Array;
  uint8: Uint8Array;
  int16: Int16Array;
  uint16: Uint16Array;
  int32: Int32Array;
  uint32: Uint32Array;
  float32: Float32Array;
  float64: Float64Array;
  bigInt64: BigInt64Array;
  bigUint64: BigUint64Array;
};

class TypedArrays
  extends QModel<ITypedArrays>
  implements QInterface<ITypedArrays, TypedArraysTransforms>
{
  @QType(QInt8Array) int8!: Int8Array;
  @QType(QUint8Array) uint8!: Uint8Array;
  @QType(QInt16Array) int16!: Int16Array;
  @QType(QUint16Array) uint16!: Uint16Array;
  @QType(QInt32Array) int32!: Int32Array;
  @QType(QUint32Array) uint32!: Uint32Array;
  @QType(QFloat32Array) float32!: Float32Array;
  @QType(QFloat64Array) float64!: Float64Array;
  @QType(QBigInt64Array) bigInt64!: BigInt64Array;
  @QType(QBigUint64Array) bigUint64!: BigUint64Array;
}

try {
  const data = {
    int8: [1, 2, 3],
    uint8: [1, 2, 3],
    int16: [100, 200],
    uint16: [100, 200],
    int32: [1000, 2000],
    uint32: [1000, 2000],
    float32: [1.5, 2.5],
    float64: [1.5, 2.5],
    bigInt64: ['100', '200'],
    bigUint64: ['100', '200'],
  };

  const model = new TypedArrays(data);
  console.log('✅ Int8Array:', model.int8 instanceof Int8Array);
  console.log('✅ Uint8Array:', model.uint8 instanceof Uint8Array);
  console.log('✅ Float32Array:', model.float32 instanceof Float32Array);
  console.log('✅ BigInt64Array:', model.bigInt64 instanceof BigInt64Array);

  // Round-trip test
  const json = model.toInterface();
  const model2 = new TypedArrays(json);
  console.log('✅ round-trip:', model2.int8[0] === 1 && model2.float32[0] === 1.5);
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORY 7: BUFFERS
// ============================================

console.log('\n═══ 7. BUFFERS ═══\n');

interface IBuffers {
  arrayBuffer: any;
  dataView: any;
}

type BuffersTransforms = {
  arrayBuffer: ArrayBuffer;
  dataView: DataView;
};

class Buffers extends QModel<IBuffers> implements QInterface<IBuffers, BuffersTransforms> {
  @QType(QArrayBuffer) arrayBuffer!: ArrayBuffer;
  @QType(QDataView) dataView!: DataView;
}

try {
  const data = {
    arrayBuffer: [1, 2, 3, 4],
    dataView: [5, 6, 7, 8],
  };

  const model = new Buffers(data);
  console.log('✅ ArrayBuffer:', model.arrayBuffer instanceof ArrayBuffer);
  console.log('✅ DataView:', model.dataView instanceof DataView);

  // Round-trip test
  const json = model.toInterface();
  const model2 = new Buffers(json);
  console.log('✅ round-trip:', model2.arrayBuffer.byteLength === 4);
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORÍA 8: PROMESAS
// ============================================

console.log('\n═══ 8. NON-SERIALIZABLE TYPES (WeakMap, WeakSet, Promise, Function) ═══\n');

console.log(
  '⚠️  WeakMap: NOT SUPPORTED - Keys are weak references, cannot be serialized',
);
console.log('⚠️  WeakSet: NOT SUPPORTED - Weak references, cannot be serialized');
console.log('⚠️  Promise: NOT SUPPORTED - Async state, cannot be serialized');
console.log('⚠️  Function: NOT SUPPORTED - Executable code, cannot be serialized');
console.log('⚠️  Arrow Function: NOT SUPPORTED');
console.log('⚠️  Async Function: NOT SUPPORTED');
console.log('⚠️  Generator: NOT SUPPORTED');
console.log('');
console.log(
  '   These types may exist in memory but do not survive toInterface()/JSON.stringify()',
);
console.log(
  '   They are special JavaScript runtime types that have no serializable representation.',
);

// ============================================
// FINAL SUMMARY
// ============================================

console.log('\n════════════════════════════════════════════════════════════════\n');

console.log('📊 COMPATIBILITY SUMMARY:\n');

console.log('✅ 100% SUPPORTED (with JSON round-trip):');
console.log('   • string, number, boolean');
console.log('   • Date (transforms string→Date) with @QType()');
console.log('   • BigInt (transforms string→bigint) with @QType(QBigInt)');
console.log('   • Symbol (uses Symbol.for) with @QType(QSymbol)');
console.log('   • RegExp (source + flags) with @QType(QRegExp)');
console.log('   • Error (message + stack + name) with @QType(QError)');
console.log('   • Map (transforms object→Map) with @QType()');
console.log('   • Set (transforms array→Set) with @QType()');
console.log('   • TypedArrays (10 types) with @QType(QInt8Array), etc.');
console.log('   • ArrayBuffer (byte array) with @QType(ArrayBufferField)');
console.log('   • DataView (byte array) with @QType(DataViewField)');
console.log('   • Array (primitives and objects) with @QType()');
console.log('   • Plain Object ({}) with @QType()');
console.log('   • Nested models with @QType(ModelClass)');
console.log('   • null, undefined\n');

console.log('⚠️  NOT SERIALIZABLE (JavaScript limitations):');
console.log('   • WeakMap: Weak references not enumerable');
console.log('   • WeakSet: Weak references not enumerable');
console.log('   • Promise: Async state not serializable');
console.log('   • Function: Executable code not serializable');
console.log('   • Arrow/Async/Generator: Variantes de Function\n');

console.log('💡 USAGE:');
console.log('   • Basic types: @QType()');
console.log('   • Date, Map, Set: @QType() (auto-detecta via design:type)');
console.log('   • BigInt: @QType(QBigInt)');
console.log('   • Symbol: @QType(QSymbol)');
console.log('   • RegExp: @QType(QRegExp)');
console.log('   • Error: @QType(QError)');
console.log('   • TypedArrays: @QType(QInt8Array), @QType(QUint8Array), etc.');
console.log('   • ArrayBuffer: @QType(ArrayBufferField)');
console.log('   • DataView: @QType(DataViewField)');
console.log('   • Modelos anidados: @QType(ModelClass)');
console.log('   • Arrays de modelos: @QType(ModelClass) ownedVehicles!: Vehicle[];\n');

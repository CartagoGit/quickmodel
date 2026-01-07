import 'reflect-metadata';
import {
  ArrayBufferField,
  BigInt64ArrayField,
  BigIntField,
  BigUint64ArrayField,
  DataViewField,
  ErrorField,
  Field,
  Float32ArrayField,
  Float64ArrayField,
  Int16ArrayField,
  Int32ArrayField,
  Int8ArrayField,
  QuickModel,
  QuickType,
  RegExpField,
  SymbolField,
  Uint16ArrayField,
  Uint32ArrayField,
  Uint8ArrayField,
} from '../../src/quick.model';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  TEST EXHAUSTIVO: TODOS LOS TIPOS INTRÍNSECOS DE JAVASCRIPT   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// ============================================
// CATEGORÍA 1: PRIMITIVOS
// ============================================

console.log('═══ 1. PRIMITIVOS ═══\n');

interface IPrimitives {
  str: string;
  num: number;
  bool: boolean;
  bigInt: string;
  sym: string; // Symbol no es serializable en JSON
  nul: null;
  undef: undefined;
}

type PrimitivesTransforms = {
  bigInt: bigint;
  sym: symbol;
};

class Primitives
  extends QuickModel<IPrimitives>
  implements QuickType<IPrimitives, PrimitivesTransforms>
{
  @Field() str!: string;
  @Field() num!: number;
  @Field() bool!: boolean;
  @Field(BigIntField) bigInt!: bigint;
  @Field(SymbolField) sym!: symbol;
  @Field() nul!: null;
  @Field() undef!: undefined;
}

try {
  const sym = Symbol.for('test'); // Usar Symbol.for para que sea recuperable
  const data = {
    str: 'hello',
    num: 42,
    bool: true,
    bigInt: '9007199254740991',
    sym: 'test', // String para Symbol.for
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

console.log('\n═══ 2. OBJETOS ESTRUCTURADOS ═══\n');

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
  extends QuickModel<IStructured>
  implements QuickType<IStructured, StructuredTransforms>
{
  @Field() obj!: Record<string, any>;
  @Field() arr!: number[];
  @Field() map!: Map<string, number>;
  @Field() set!: Set<string>;
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

console.log('\n═══ 3. FECHAS Y TIEMPO ═══\n');

interface IDates {
  date: string;
}

type DatesTransforms = {
  date: Date;
};

class Dates extends QuickModel<IDates> implements QuickType<IDates, DatesTransforms> {
  @Field() date!: Date;
}

try {
  const data = {
    date: '2024-01-01T00:00:00.000Z',
  };

  const model = new Dates(data);
  console.log('✅ Date:', model.date instanceof Date);
  console.log('   Método getFullYear():', model.date.getFullYear() === 2024);
} catch (error: any) {
  console.log('❌ Error:', error.message);
}

// ============================================
// CATEGORÍA 4: EXPRESIONES REGULARES
// ============================================

console.log('\n═══ 4. EXPRESIONES REGULARES ═══\n');

interface IRegex {
  regex: string;
}

type RegexTransforms = {
  regex: RegExp;
};

class Regexes extends QuickModel<IRegex> implements QuickType<IRegex, RegexTransforms> {
  @Field(RegExpField) regex!: RegExp;
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
// CATEGORÍA 5: ERRORES
// ============================================

console.log('\n═══ 5. ERRORES ═══\n');

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

class Errors extends QuickModel<IErrors> implements QuickType<IErrors, ErrorsTransforms> {
  @Field(ErrorField) error!: Error;
  @Field(ErrorField) typeError!: TypeError;
  @Field(ErrorField) rangeError!: RangeError;
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
  extends QuickModel<ITypedArrays>
  implements QuickType<ITypedArrays, TypedArraysTransforms>
{
  @Field(Int8ArrayField) int8!: Int8Array;
  @Field(Uint8ArrayField) uint8!: Uint8Array;
  @Field(Int16ArrayField) int16!: Int16Array;
  @Field(Uint16ArrayField) uint16!: Uint16Array;
  @Field(Int32ArrayField) int32!: Int32Array;
  @Field(Uint32ArrayField) uint32!: Uint32Array;
  @Field(Float32ArrayField) float32!: Float32Array;
  @Field(Float64ArrayField) float64!: Float64Array;
  @Field(BigInt64ArrayField) bigInt64!: BigInt64Array;
  @Field(BigUint64ArrayField) bigUint64!: BigUint64Array;
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
// CATEGORÍA 7: BUFFERS
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

class Buffers extends QuickModel<IBuffers> implements QuickType<IBuffers, BuffersTransforms> {
  @Field(ArrayBufferField) arrayBuffer!: ArrayBuffer;
  @Field(DataViewField) dataView!: DataView;
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
  '   Son tipos especiales del runtime de JavaScript que no tienen representación serializable.',
);

// ============================================
// RESUMEN FINAL
// ============================================

console.log('\n════════════════════════════════════════════════════════════════\n');

console.log('📊 RESUMEN DE COMPATIBILIDAD:\n');

console.log('✅ SOPORTADOS AL 100% (con round-trip JSON):');
console.log('   • string, number, boolean');
console.log('   • Date (transforma string→Date) con @Field()');
console.log('   • BigInt (transforma string→bigint) con @Field(BigIntField)');
console.log('   • Symbol (usa Symbol.for) con @Field(SymbolField)');
console.log('   • RegExp (source + flags) con @Field(RegExpField)');
console.log('   • Error (message + stack + name) con @Field(ErrorField)');
console.log('   • Map (transforma object→Map) con @Field()');
console.log('   • Set (transforma array→Set) con @Field()');
console.log('   • TypedArrays (10 tipos) con @Field(Int8ArrayField), etc.');
console.log('   • ArrayBuffer (array de bytes) con @Field(ArrayBufferField)');
console.log('   • DataView (array de bytes) con @Field(DataViewField)');
console.log('   • Array (primitivos y objetos) con @Field()');
console.log('   • Object plano ({}) con @Field()');
console.log('   • Modelos anidados con @Field(ModelClass)');
console.log('   • null, undefined\n');

console.log('⚠️  NO SERIALIZABLES (limitaciones de JavaScript):');
console.log('   • WeakMap: Referencias débiles no enumerables');
console.log('   • WeakSet: Referencias débiles no enumerables');
console.log('   • Promise: Estado asíncrono no serializable');
console.log('   • Function: Código ejecutable no serializable');
console.log('   • Arrow/Async/Generator: Variantes de Function\n');

console.log('💡 USO:');
console.log('   • Tipos básicos: @Field()');
console.log('   • Date, Map, Set: @Field() (auto-detecta via design:type)');
console.log('   • BigInt: @Field(BigIntField)');
console.log('   • Symbol: @Field(SymbolField)');
console.log('   • RegExp: @Field(RegExpField)');
console.log('   • Error: @Field(ErrorField)');
console.log('   • TypedArrays: @Field(Int8ArrayField), @Field(Uint8ArrayField), etc.');
console.log('   • ArrayBuffer: @Field(ArrayBufferField)');
console.log('   • DataView: @Field(DataViewField)');
console.log('   • Modelos anidados: @Field(ModelClass)');
console.log('   • Arrays de modelos: @Field(ModelClass) ownedVehicles!: Vehicle[];\n');

/**
 * @QType() Decorator - Ejemplo 2: Tipos Complejos
 * 
 * Demuestra el uso de @QType() con tipos complejos como
 * Date, BigInt, RegExp, Symbol, Map, Set, Buffer, TypedArrays.
 */

import { QModel, QType, QInterface } from '../../../quick.model';

// ============================================
// 1. MODELO CON TIPOS DE FECHA Y REGEX
// ============================================

interface IEvent {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  pattern: RegExp;
}

class Event extends QModel<IEvent> implements QInterface<IEvent> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare startDate: Date;

  @QType()
  declare endDate: Date;

  @QType()
  declare pattern: RegExp;
}

const event = new Event({
  id: 'evt-001',
  name: 'Tech Conference 2024',
  startDate: new Date('2024-06-01T09:00:00Z'),
  endDate: new Date('2024-06-03T18:00:00Z'),
  pattern: /^TC-\d{4}$/
});

console.log('\n=== EJEMPLO 1: Date y RegExp ===\n');
console.log('Evento:', event);
console.log('Inicio:', event.startDate.toISOString());
console.log('Fin:', event.endDate.toISOString());
console.log('Duración (días):', (event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24));
console.log('Pattern test "TC-2024":', event.pattern.test('TC-2024') ? '✅' : '❌');
console.log('Pattern test "TC-ABC":', event.pattern.test('TC-ABC') ? '❌' : '✅');

// ============================================
// 2. MODELO CON BIGINT Y SYMBOL
// ============================================

interface ITransaction {
  id: string;
  amount: bigint;
  fee: bigint;
  uniqueId: Symbol;
  timestamp: Date;
}

class Transaction extends QModel<ITransaction> implements QInterface<ITransaction> {
  @QType()
  declare id: string;

  @QType()
  declare amount: bigint;

  @QType()
  declare fee: bigint;

  @QType()
  declare uniqueId: Symbol;

  @QType()
  declare timestamp: Date;
}

const transaction = new Transaction({
  id: 'tx-001',
  amount: 1000000000000000n,  // 1 PetaByte en bytes
  fee: 5000000000000n,         // 5 TeraByte en bytes
  uniqueId: Symbol('unique-transaction'),
  timestamp: new Date()
});

console.log('\n=== EJEMPLO 2: BigInt y Symbol ===\n');
console.log('Transacción:', transaction);
console.log('Monto:', transaction.amount.toString(), 'bytes');
console.log('Fee:', transaction.fee.toString(), 'bytes');
console.log('Total:', (transaction.amount + transaction.fee).toString(), 'bytes');
console.log('UniqueId es Symbol?:', typeof transaction.uniqueId === 'symbol' ? '✅' : '❌');

// Serializar y deserializar
const txData = transaction.toInterface();
const restoredTx = new Transaction(txData);
console.log('\nDespués de serializar/deserializar:');
console.log('amount es bigint?:', typeof restoredTx.amount === 'bigint' ? '✅' : '❌');
console.log('fee es bigint?:', typeof restoredTx.fee === 'bigint' ? '✅' : '❌');
console.log('Valores preservados?:', restoredTx.amount === transaction.amount ? '✅' : '❌');

// ============================================
// 3. MODELO CON MAP Y SET
// ============================================

interface ICache {
  id: string;
  data: Map<string, any>;
  tags: Set<string>;
  createdAt: Date;
}

class Cache extends QModel<ICache> implements QInterface<ICache> {
  @QType()
  declare id: string;

  @QType()
  declare data: Map<string, any>;

  @QType()
  declare tags: Set<string>;

  @QType()
  declare createdAt: Date;
}

const cache = new Cache({
  id: 'cache-001',
  data: new Map([
    ['user:1', { name: 'Alice', age: 30 }],
    ['user:2', { name: 'Bob', age: 25 }],
    ['config', { theme: 'dark', lang: 'es' }]
  ]),
  tags: new Set(['production', 'optimized', 'encrypted']),
  createdAt: new Date()
});

console.log('\n=== EJEMPLO 3: Map y Set ===\n');
console.log('Cache:', cache);
console.log('data es Map?:', cache.data instanceof Map ? '✅' : '❌');
console.log('tags es Set?:', cache.tags instanceof Set ? '✅' : '❌');
console.log('\nContenido del Map:');
cache.data.forEach((value, key) => {
  console.log(`  ${key}:`, value);
});
console.log('\nTags:', Array.from(cache.tags));

// Serializar y deserializar
const cacheData = cache.toInterface();
const restoredCache = new Cache(cacheData);
console.log('\nDespués de serializar/deserializar:');
console.log('data es Map?:', restoredCache.data instanceof Map ? '✅' : '❌');
console.log('tags es Set?:', restoredCache.tags instanceof Set ? '✅' : '❌');
console.log('data.size:', restoredCache.data.size);
console.log('tags.size:', restoredCache.tags.size);

// ============================================
// 4. MODELO CON BUFFER Y TYPEDARRAYS
// ============================================

interface IBinaryData {
  id: string;
  buffer: Buffer;
  uint8Array: Uint8Array;
  int32Array: Int32Array;
  float64Array: Float64Array;
}

class BinaryData extends QModel<IBinaryData> implements QInterface<IBinaryData> {
  @QType()
  declare id: string;

  @QType()
  declare buffer: Buffer;

  @QType()
  declare uint8Array: Uint8Array;

  @QType()
  declare int32Array: Int32Array;

  @QType()
  declare float64Array: Float64Array;
}

const binaryData = new BinaryData({
  id: 'bin-001',
  buffer: Buffer.from('Hello QuickModel!', 'utf-8'),
  uint8Array: new Uint8Array([1, 2, 3, 4, 5]),
  int32Array: new Int32Array([-100, -50, 0, 50, 100]),
  float64Array: new Float64Array([3.14, 2.71, 1.41, 1.73])
});

console.log('\n=== EJEMPLO 4: Buffer y TypedArrays ===\n');
console.log('BinaryData:', binaryData);
console.log('buffer es Buffer?:', Buffer.isBuffer(binaryData.buffer) ? '✅' : '❌');
console.log('buffer contenido:', binaryData.buffer.toString('utf-8'));
console.log('uint8Array es Uint8Array?:', binaryData.uint8Array instanceof Uint8Array ? '✅' : '❌');
console.log('uint8Array:', Array.from(binaryData.uint8Array));
console.log('int32Array es Int32Array?:', binaryData.int32Array instanceof Int32Array ? '✅' : '❌');
console.log('int32Array:', Array.from(binaryData.int32Array));
console.log('float64Array es Float64Array?:', binaryData.float64Array instanceof Float64Array ? '✅' : '❌');
console.log('float64Array:', Array.from(binaryData.float64Array));

// Clonar preserva tipos binarios
const clonedBinary = binaryData.clone();
console.log('\nBinaryData clonada:');
console.log('buffer es Buffer?:', Buffer.isBuffer(clonedBinary.buffer) ? '✅' : '❌');
console.log('uint8Array es Uint8Array?:', clonedBinary.uint8Array instanceof Uint8Array ? '✅' : '❌');
console.log('int32Array es Int32Array?:', clonedBinary.int32Array instanceof Int32Array ? '✅' : '❌');
console.log('float64Array es Float64Array?:', clonedBinary.float64Array instanceof Float64Array ? '✅' : '❌');

export { Event, Transaction, Cache, BinaryData};

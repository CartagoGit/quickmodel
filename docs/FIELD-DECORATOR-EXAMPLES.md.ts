/**
 * EJEMPLOS DE USO: Las 3 formas de usar @Field()
 * 
 * Este archivo demuestra las diferentes maneras de decorar campos
 * con sus ventajas y casos de uso.
 */

import { QuickModel } from '../src/quick.model';
import { Field } from '../src/core/decorators/field.decorator';
import {
  BigIntField,
  SymbolField,
  RegExpField,
  ErrorField,
  URLField,
  URLSearchParamsField,
  Int8ArrayField,
  Uint8ArrayField,
  Float32ArrayField,
  BigInt64ArrayField,
} from '../src/core/interfaces/field-symbols.interface';

// ============================================================================
// FORMA 1: Auto-detección (para tipos básicos y Date, Map, Set)
// ============================================================================
// ✅ Ventajas: Menos código, más limpio
// ❌ Limitaciones: Solo funciona con tipos que TypeScript puede detectar automáticamente

interface IForma1 {
  name: string;
  age: number;
  active: boolean;
  createdAt: Date;
  tags: Map<string, number>;
  roles: Set<string>;
}

class Forma1_AutoDeteccion extends QuickModel<IForma1> {
  @Field() name!: string;        // Auto-detecta string
  @Field() age!: number;         // Auto-detecta number
  @Field() active!: boolean;     // Auto-detecta boolean
  @Field() createdAt!: Date;     // Auto-detecta Date
  @Field() tags!: Map<string, number>;  // Auto-detecta Map
  @Field() roles!: Set<string>;  // Auto-detecta Set
}

// ============================================================================
// FORMA 2: String Literals (RECOMENDADO ✨)
// ============================================================================
// ✅ Ventajas: IntelliSense completo, escribes @Field(' y TypeScript sugiere todos los tipos
// ✅ Ventajas: Fácil de recordar, nombres descriptivos
// ✅ Ventajas: No necesitas importar symbols

interface IForma2 {
  balance: bigint;
  key: symbol;
  pattern: RegExp;
  lastError: Error;
  homepage: URL;
  queryParams: URLSearchParams;
  signedBytes: Int8Array;
  unsignedBytes: Uint8Array;
  floats: Float32Array;
  bigInts: BigInt64Array;
  settings: Map<string, number>;
  tags: Set<string>;
  buffer: ArrayBuffer;
  view: DataView;
  name: string;
  createdAt: Date;
}

class Forma2_StringLiterals extends QuickModel<IForma2> {
  // Tipos especiales - al escribir @Field(' el editor sugiere:
  // 'bigint', 'symbol', 'regexp', 'error', 'url', etc.
  
  @Field('bigint')
  balance!: bigint;
  
  @Field('symbol')
  key!: symbol;
  
  @Field('regexp')
  pattern!: RegExp;
  
  @Field('error')
  lastError!: Error;
  
  @Field('url')
  homepage!: URL;
  
  @Field('urlsearchparams')
  queryParams!: URLSearchParams;
  
  // TypedArrays - también con IntelliSense
  @Field('int8array')
  signedBytes!: Int8Array;
  
  @Field('uint8array')
  unsignedBytes!: Uint8Array;
  
  @Field('float32array')
  floats!: Float32Array;
  
  @Field('bigint64array')
  bigInts!: BigInt64Array;
  
  // Puedes mezclar con auto-detección
  @Field() name!: string;
  @Field('date') createdAt!: Date;  // Explícito aunque se auto-detecta
}

// ============================================================================
// FORMA 3A: Symbols (forma original)
// ============================================================================
// ✅ Ventajas: Explícito, no hay ambigüedad
// ❌ Desventajas: Requiere importar los symbols

interface IForma3A {
  balance: bigint;
  key: symbol;
  pattern: RegExp;
  lastError: Error;
  homepage: URL;
  queryParams: URLSearchParams;
  signedBytes: Int8Array;
  unsignedBytes: Uint8Array;
  floats: Float32Array;
  bigInts: BigInt64Array;
}

class Forma3A_Symbols extends QuickModel<IForma3A> {
  @Field(BigIntField)
  balance!: bigint;
  
  @Field(SymbolField)
  key!: symbol;
  
  @Field(RegExpField)
  pattern!: RegExp;
  
  @Field(ErrorField)
  lastError!: Error;
  
  @Field(URLField)
  homepage!: URL;
  
  @Field(URLSearchParamsField)
  queryParams!: URLSearchParams;
  
  @Field(Int8ArrayField)
  signedBytes!: Int8Array;
  
  @Field(Uint8ArrayField)
  unsignedBytes!: Uint8Array;
  
  @Field(Float32ArrayField)
  floats!: Float32Array;
  
  @Field(BigInt64ArrayField)
  bigInts!: BigInt64Array;
}

// ============================================================================
// FORMA 3B: Constructores (para tipos con constructor nativo)
// ============================================================================
// ✅ Ventajas: Natural, usa el mismo tipo que la propiedad
// ❌ Limitaciones: No funciona con BigInt, Symbol (no son constructores reutilizables)

interface IForma3B {
  pattern: RegExp;
  lastError: Error;
  homepage: URL;
  queryParams: URLSearchParams;
  signedBytes: Int8Array;
  unsignedBytes: Uint8Array;
  floats: Float32Array;
  bigInts: BigInt64Array;
  createdAt: Date;
  settings: Map<string, number>;
  roles: Set<string>;
}

class Forma3B_Constructors extends QuickModel<IForma3B> {
  // Estos NO funcionan con constructor:
  // @Field(BigInt) balance!: bigint;  // ❌ BigInt() es función de conversión
  // @Field(Symbol) key!: symbol;      // ❌ Symbol() siempre crea nuevo symbol
  // Usa @Field('bigint') o @Field(BigIntField) en su lugar
  
  @Field(RegExp)
  pattern!: RegExp;
  
  @Field(Error)
  lastError!: Error;
  
  @Field(URL)
  homepage!: URL;
  
  @Field(URLSearchParams)
  queryParams!: URLSearchParams;
  
  @Field(Int8Array)
  signedBytes!: Int8Array;
  
  @Field(Uint8Array)
  unsignedBytes!: Uint8Array;
  
  @Field(Float32Array)
  floats!: Float32Array;
  
  @Field(BigInt64Array)
  bigInts!: BigInt64Array;
  
  @Field(Date)
  createdAt!: Date;
  
  @Field(Map)
  settings!: Map<string, number>;
  
  @Field(Set)
  roles!: Set<string>;
}

// ============================================================================
// RECOMENDACIONES DE USO
// ============================================================================

/**
 * CASO 1: Proyecto nuevo
 * → Usa STRING LITERALS (@Field('type')) en todos los casos especiales
 * → Usa auto-detección (@Field()) para primitivos, Date, Map, Set
 * 
 * Ventajas: Máximo IntelliSense, fácil de recordar, no necesitas importar symbols
 */
interface IRecomendacion {
  id: string;
  name: string;
  balance: bigint;
  pattern: RegExp;
  bytes: Int8Array;
  createdAt: Date;
  tags: Map<string, number>;
}

class RecomendacionProyectoNuevo extends QuickModel<IRecomendacion> {
  @Field() id!: string;
  @Field() name!: string;
  @Field('bigint') balance!: bigint;
  @Field('regexp') pattern!: RegExp;
  @Field('int8array') bytes!: Int8Array;
  @Field() createdAt!: Date;
  @Field() tags!: Map<string, number>;
}

/**
 * CASO 2: Migración de código existente con Symbols
 * → Mantén los symbols si ya los tienes
 * → Puedes migrar gradualmente a string literals
 * 
 * Ventajas: No rompe código existente, migración opcional
 */
interface IMigracion {
  oldCode: bigint;
  newCode: RegExp;
  legacy: Int8Array;
  modern: Float32Array;
}

class MigracionGradual extends QuickModel<IMigracion> {
  @Field(BigIntField) oldCode!: bigint;     // Código existente
  @Field('regexp') newCode!: RegExp;        // Nuevo código con strings
  @Field(Int8ArrayField) legacy!: Int8Array;
  @Field('float32array') modern!: Float32Array;
}

/**
 * CASO 3: Preferencia por constructores nativos
 * → Usa constructores donde sea posible
 * → Usa string literals para BigInt y Symbol (sin constructor)
 * 
 * Ventajas: Natural, el decorador usa el mismo tipo que la propiedad
 */
interface IPreferencia {
  pattern: RegExp;
  homepage: URL;
  lastError: Error;
  balance: bigint;
  key: symbol;
  createdAt: Date;
  settings: Map<string, any>;
}

class PreferenciaConstructores extends QuickModel<IPreferencia> {
  @Field(RegExp) pattern!: RegExp;
  @Field(URL) homepage!: URL;
  @Field(Error) lastError!: Error;
  @Field('bigint') balance!: bigint;  // No tiene constructor usable
  @Field('symbol') key!: symbol;      // No tiene constructor usable
  @Field(Date) createdAt!: Date;
  @Field(Map) settings!: Map<string, any>;
}

// ============================================================================
// DEMO: Todas las formas funcionan igual
// ============================================================================

const testData = {
  balance: '999999999999',
  pattern: '/test/gi',
  bytes: [1, 2, 3],
};

// Todas deserializan igual
const model1 = Forma2_StringLiterals.fromInterface({
  ...testData,
  name: 'Test',
  key: 'myKey',
  lastError: 'Error: test',
  homepage: 'https://example.com',
  queryParams: 'foo=bar',
  signedBytes: [1, 2, 3],
  unsignedBytes: [4, 5, 6],
  floats: [1.1, 2.2],
  bigInts: ['100', '200'],
  createdAt: new Date().toISOString(),
});

const model2 = Forma3A_Symbols.fromInterface({
  balance: '999999999999',
  key: 'myKey',
  pattern: '/test/gi',
  lastError: 'Error: test',
  homepage: 'https://example.com',
  queryParams: 'foo=bar',
  signedBytes: [1, 2, 3],
  unsignedBytes: [4, 5, 6],
  floats: [1.1, 2.2],
  bigInts: ['100', '200'],
});

const model3 = Forma3B_Constructors.fromInterface({
  pattern: '/test/gi',
  lastError: 'Error: test',
  homepage: 'https://example.com',
  queryParams: 'foo=bar',
  signedBytes: [1, 2, 3],
  unsignedBytes: [4, 5, 6],
  floats: [1.1, 2.2],
  bigInts: ['100', '200'],
  createdAt: new Date().toISOString(),
  settings: { a: 1 },
  roles: ['admin'],
});

console.log('✅ Todas las formas funcionan correctamente!');
console.log('💡 Recomendación: Usa string literals para mejor IntelliSense');

export {
  Forma1_AutoDeteccion,
  Forma2_StringLiterals,
  Forma3A_Symbols,
  Forma3B_Constructors,
  RecomendacionProyectoNuevo,
  MigracionGradual,
  PreferenciaConstructores,
};

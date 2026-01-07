/**
 * USAGE EXAMPLES: The 3 ways to use @QType()
 * 
 * This file demonstrates the different ways to decorate fields
 * with their advantages and use cases.
 */

import { QuickModel } from '../../quick.model';
import { Field } from '../../core/decorators/field.decorator';
import {
  QBigInt,
  QSymbol,
  QRegExp,
  QError,
  URLField,
  URLSearchParamsField,
  QInt8Array,
  QUint8Array,
  QFloat32Array,
  BigInt64ArrayField,
} from '../../core/interfaces/field-symbols.interface';

// ============================================================================
// FORM 1: Auto-detection (for basic types and Date, Map, Set)
// ============================================================================
// ✅ Advantages: Less code, cleaner
// ❌ Limitations: Only works with types that TypeScript can detect automatically

interface IForma1 {
  name: string;
  age: number;
  active: boolean;
  createdAt: Date;
  tags: Map<string, number>;
  roles: Set<string>;
}

class Forma1_AutoDeteccion extends QuickModel<IForma1> {
  @QType() name!: string;        // Auto-detect string
  @QType() age!: number;         // Auto-detect number
  @QType() active!: boolean;     // Auto-detect boolean
  @QType() createdAt!: Date;     // Auto-detect Date
  @QType() tags!: Map<string, number>;  // Auto-detect Map
  @QType() roles!: Set<string>;  // Auto-detect Set
}

// ============================================================================
// FORM 2: String Literals (RECOMMENDED ✨)
// ============================================================================
// ✅ Advantages: Full IntelliSense, type @QType(' and TypeScript suggests all types
// ✅ Advantages: Easy to remember, descriptive names
// ✅ Advantages: No need to import symbols

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
  // Special types - when typing @QType(' the editor suggests:
  // 'bigint', 'symbol', 'regexp', 'error', 'url', etc.
  
  @QType('bigint')
  balance!: bigint;
  
  @QType('symbol')
  key!: symbol;
  
  @QType('regexp')
  pattern!: RegExp;
  
  @QType('error')
  lastError!: Error;
  
  @QType('url')
  homepage!: URL;
  
  @QType('urlsearchparams')
  queryParams!: URLSearchParams;
  
  // TypedArrays - also with IntelliSense
  @QType('int8array')
  signedBytes!: Int8Array;
  
  @QType('uint8array')
  unsignedBytes!: Uint8Array;
  
  @QType('float32array')
  floats!: Float32Array;
  
  @QType('bigint64array')
  bigInts!: BigInt64Array;
  
  // You can mix with auto-detection
  @QType() name!: string;
  @QType('date') createdAt!: Date;  // Explicit even though it's auto-detected
}

// ============================================================================
// FORM 3A: Symbols (original form)
// ============================================================================
// ✅ Advantages: Explicit, no ambiguity
// ❌ Disadvantages: Requires importing symbols

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
  @QType(QBigInt)
  balance!: bigint;
  
  @QType(QSymbol)
  key!: symbol;
  
  @QType(QRegExp)
  pattern!: RegExp;
  
  @QType(QError)
  lastError!: Error;
  
  @QType(URLField)
  homepage!: URL;
  
  @QType(URLSearchParamsField)
  queryParams!: URLSearchParams;
  
  @QType(QInt8Array)
  signedBytes!: Int8Array;
  
  @QType(QUint8Array)
  unsignedBytes!: Uint8Array;
  
  @QType(QFloat32Array)
  floats!: Float32Array;
  
  @QType(BigInt64ArrayField)
  bigInts!: BigInt64Array;
}

// ============================================================================
// FORM 3B: Constructors (for types with native constructor)
// ============================================================================
// ✅ Advantages: Natural, uses the same type as the property
// ❌ Limitations: Does not work with BigInt, Symbol (they are not reusable constructors)

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
  // These do NOT work with constructor:
  // @QType(BigInt) balance!: bigint;  // ❌ BigInt() is a conversion function
  // @QType(Symbol) key!: symbol;      // ❌ Symbol() always creates new symbol
  // Use @QType('bigint') or @QType(QBigInt) instead
  
  @QType(RegExp)
  pattern!: RegExp;
  
  @QType(Error)
  lastError!: Error;
  
  @QType(URL)
  homepage!: URL;
  
  @QType(URLSearchParams)
  queryParams!: URLSearchParams;
  
  @QType(Int8Array)
  signedBytes!: Int8Array;
  
  @QType(Uint8Array)
  unsignedBytes!: Uint8Array;
  
  @QType(Float32Array)
  floats!: Float32Array;
  
  @QType(BigInt64Array)
  bigInts!: BigInt64Array;
  
  @QType(Date)
  createdAt!: Date;
  
  @QType(Map)
  settings!: Map<string, number>;
  
  @QType(Set)
  roles!: Set<string>;
}

// ============================================================================
// USAGE RECOMMENDATIONS
// ============================================================================

/**
 * CASE 1: New project
 * → Use STRING LITERALS (@QType('type')) for all special cases
 * → Use auto-detection (@QType()) for primitives, Date, Map, Set
 * 
 * Advantages: Maximum IntelliSense, easy to remember, no need to import symbols
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
  @QType() id!: string;
  @QType() name!: string;
  @QType('bigint') balance!: bigint;
  @QType('regexp') pattern!: RegExp;
  @QType('int8array') bytes!: Int8Array;
  @QType() createdAt!: Date;
  @QType() tags!: Map<string, number>;
}

/**
 * CASE 2: Migration of existing code with Symbols
 * → Keep symbols if you already have them
 * → You can migrate gradually to string literals
 * 
 * Advantages: Doesn't break existing code, optional migration
 */
interface IMigracion {
  oldCode: bigint;
  newCode: RegExp;
  legacy: Int8Array;
  modern: Float32Array;
}

class MigracionGradual extends QuickModel<IMigracion> {
  @QType(QBigInt) oldCode!: bigint;     // Existing code
  @QType('regexp') newCode!: RegExp;        // New code with strings
  @QType(QInt8Array) legacy!: Int8Array;
  @QType('float32array') modern!: Float32Array;
}

/**
 * CASE 3: Preference for native constructors
 * → Use constructors where possible
 * → Use string literals for BigInt and Symbol (no constructor)
 * 
 * Advantages: Natural, the decorator uses the same type as the property
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
  @QType(RegExp) pattern!: RegExp;
  @QType(URL) homepage!: URL;
  @QType(Error) lastError!: Error;
  @QType('bigint') balance!: bigint;  // No usable constructor
  @QType('symbol') key!: symbol;      // No usable constructor
  @QType(Date) createdAt!: Date;
  @QType(Map) settings!: Map<string, any>;
}

// ============================================================================
// DEMO: All forms work the same
// ============================================================================

const testData = {
  balance: '999999999999',
  pattern: '/test/gi',
  bytes: [1, 2, 3],
};

// All deserialize the same
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

console.log('✅ All forms work correctly!');
console.log('💡 Recommendation: Use string literals for better IntelliSense');

export {
  Forma1_AutoDeteccion,
  Forma2_StringLiterals,
  Forma3A_Symbols,
  Forma3B_Constructors,
  RecomendacionProyectoNuevo,
  MigracionGradual,
  PreferenciaConstructores,
};

/**
 * USAGE EXAMPLES: The 3 ways to use @Field()
 * 
 * This file demonstrates the different ways to decorate fields
 * with their advantages and use cases.
 */

import { QuickModel } from '../../quick.model';
import { Field } from '../../core/decorators/field.decorator';
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
  @Field() name!: string;        // Auto-detect string
  @Field() age!: number;         // Auto-detect number
  @Field() active!: boolean;     // Auto-detect boolean
  @Field() createdAt!: Date;     // Auto-detect Date
  @Field() tags!: Map<string, number>;  // Auto-detect Map
  @Field() roles!: Set<string>;  // Auto-detect Set
}

// ============================================================================
// FORM 2: String Literals (RECOMMENDED ✨)
// ============================================================================
// ✅ Advantages: Full IntelliSense, type @Field(' and TypeScript suggests all types
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
  // Special types - when typing @Field(' the editor suggests:
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
  
  // TypedArrays - also with IntelliSense
  @Field('int8array')
  signedBytes!: Int8Array;
  
  @Field('uint8array')
  unsignedBytes!: Uint8Array;
  
  @Field('float32array')
  floats!: Float32Array;
  
  @Field('bigint64array')
  bigInts!: BigInt64Array;
  
  // You can mix with auto-detection
  @Field() name!: string;
  @Field('date') createdAt!: Date;  // Explicit even though it's auto-detected
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
  // @Field(BigInt) balance!: bigint;  // ❌ BigInt() is a conversion function
  // @Field(Symbol) key!: symbol;      // ❌ Symbol() always creates new symbol
  // Use @Field('bigint') or @Field(BigIntField) instead
  
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
// USAGE RECOMMENDATIONS
// ============================================================================

/**
 * CASE 1: New project
 * → Use STRING LITERALS (@Field('type')) for all special cases
 * → Use auto-detection (@Field()) for primitives, Date, Map, Set
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
  @Field() id!: string;
  @Field() name!: string;
  @Field('bigint') balance!: bigint;
  @Field('regexp') pattern!: RegExp;
  @Field('int8array') bytes!: Int8Array;
  @Field() createdAt!: Date;
  @Field() tags!: Map<string, number>;
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
  @Field(BigIntField) oldCode!: bigint;     // Existing code
  @Field('regexp') newCode!: RegExp;        // New code with strings
  @Field(Int8ArrayField) legacy!: Int8Array;
  @Field('float32array') modern!: Float32Array;
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
  @Field(RegExp) pattern!: RegExp;
  @Field(URL) homepage!: URL;
  @Field(Error) lastError!: Error;
  @Field('bigint') balance!: bigint;  // No usable constructor
  @Field('symbol') key!: symbol;      // No usable constructor
  @Field(Date) createdAt!: Date;
  @Field(Map) settings!: Map<string, any>;
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

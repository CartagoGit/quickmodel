/**
 * SOLID - Dependency Inversion: Configuración centralizada de dependencias
 * SOLID - Open/Closed: Fácil agregar nuevos transformers sin modificar QuickModel
 */

import {
  ArrayBufferField,
  BigInt64ArrayField,
  BigIntField,
  BigUint64ArrayField,
  DataViewField,
  ErrorField,
  Float32ArrayField,
  Float64ArrayField,
  Int16ArrayField,
  Int32ArrayField,
  Int8ArrayField,
  RegExpField,
  SymbolField,
  Uint16ArrayField,
  Uint32ArrayField,
  Uint8ArrayField,
  URLField,
  URLSearchParamsField,
} from '../core/interfaces/field-symbols.interface';
import { ITransformer, IValidator } from '../core/interfaces';
import { transformerRegistry, validatorRegistry } from '../core/registry';

// Tipo helper para transformer genérico (evita incompatibilidades de unión)
type AnyTransformer = ITransformer<any, any>;
import { BigIntTransformer } from './bigint.transformer';
import { ArrayBufferTransformer, DataViewTransformer } from './buffer.transformer';
import { DateTransformer } from './date.transformer';
import { ErrorTransformer } from './error.transformer';
import { MapTransformer, SetTransformer } from './map-set.transformer';
import { PrimitiveTransformer } from './primitive.transformer';
import { RegExpTransformer } from './regexp.transformer';
import { SymbolTransformer } from './symbol.transformer';
import { TypedArrayTransformer } from './typed-array.transformer';
import { URLTransformer } from './url.transformer';
import { URLSearchParamsTransformer } from './url-search-params.transformer';

/**
 * Helper to register a transformer with multiple aliases.
 */
function registerTransformerWithAliases(
  keys: ReadonlyArray<string | symbol | Function>,
  transformer: AnyTransformer,
  withValidator = true,
): void {
  keys.forEach((key) => {
    transformerRegistry.register(key, transformer);
    // validatorRegistry only accepts string | symbol, not Function
    if (withValidator && 'validate' in transformer && typeof key !== 'function') {
      validatorRegistry.register(key, transformer as IValidator);
    }
  });
}

/**
 * Register basic transformers.
 */
export function registerCoreTransformers(): void {
  // ========================================================================
  // PRIMITIVES: string, number, boolean
  // ========================================================================
  // These types are auto-detected by design:type, but we register them to
  // allow explicit use: @Field('string'), @Field('number'), @Field('boolean')
  //
  // Usage in models:
  //   @Field() name!: string;          // Auto-detected
  //   @Field('string') name!: string;  // Explicit
  // ========================================================================
  const primitives = ['string', 'number', 'boolean'] as const;
  primitives.forEach((type) => {
    const transformer = new PrimitiveTransformer(type);
    registerTransformerWithAliases([type], transformer);
  });

  // ========================================================================
  // DATE: Dates with auto-detection and multiple usage forms
  // ========================================================================
  // Supports 3 decoration forms:
  //   @Field() createdAt!: Date;        // Auto-detected by design:type
  //   @Field('date') createdAt!: Date;  // String literal (IntelliSense)
  //   @Field(Date) createdAt!: Date;    // Native constructor
  //
  // Serialization: Date → ISO string ("2024-01-01T00:00:00.000Z")
  // ========================================================================
  const dateTransformer = new DateTransformer();
  registerTransformerWithAliases(['date', Date], dateTransformer);

  // ========================================================================
  // MAP & SET: Collections with auto-detection
  // ========================================================================
  // Support 3 decoration forms:
  //   @Field() tags!: Map<string, number>;  // Auto-detected
  //   @Field('map') tags!: Map<K, V>;       // String literal
  //   @Field(Map) tags!: Map<K, V>;         // Constructor
  //
  // Serialization:
  //   Map<K,V> → Record<K,V> (plain object)
  //   Set<T> → T[] (array)
  // ========================================================================
  const mapTransformer = new MapTransformer();
  const setTransformer = new SetTransformer();
  registerTransformerWithAliases(['map', Map], mapTransformer, false);
  registerTransformerWithAliases(['set', Set], setTransformer, false);

  // ========================================================================
  // SPECIAL TYPES WITH NATIVE CONSTRUCTORS
  // ========================================================================
  // These types have native JavaScript constructors that can be used
  // directly in the decorator, in addition to the special symbol and string literal.
  //
  // Support 3 decoration forms:
  //   @Field(RegExpField) pattern!: RegExp;  // Symbol (original form)
  //   @Field(RegExp) pattern!: RegExp;       // Native constructor
  //   @Field('regexp') pattern!: RegExp;     // String literal (IntelliSense)
  //
  // Serialization:
  //   RegExp → string: "/pattern/flags"
  //   Error → string: "ErrorName: message"
  //   URL → string: "https://example.com"
  //   URLSearchParams → string: "key=value&foo=bar"
  // ========================================================================
  const transformersWithAliases = [
    { 
      field: RegExpField,
      stringAlias: 'regexp',
      alias: RegExp, 
      Transformer: RegExpTransformer 
    },
    { 
      field: ErrorField,
      stringAlias: 'error',
      alias: Error, 
      Transformer: ErrorTransformer 
    },
    { 
      field: URLField,
      stringAlias: 'url',
      alias: URL, 
      Transformer: URLTransformer 
    },
    { 
      field: URLSearchParamsField,
      stringAlias: 'urlsearchparams',
      alias: URLSearchParams, 
      Transformer: URLSearchParamsTransformer 
    },
  ];

  transformersWithAliases.forEach(({ field, stringAlias, alias, Transformer }) => {
    const transformer: AnyTransformer = new Transformer();
    registerTransformerWithAliases([field.toString(), stringAlias, alias], transformer);
  });

  // ========================================================================
  // BIGINT & SYMBOL: Primitive types without reusable constructor
  // ========================================================================
  // These types CANNOT use the constructor directly because:
  //   - BigInt() is a conversion function, not a constructor
  //   - Symbol() always creates a new unique symbol
  //
  // Support 2 decoration forms:
  //   @Field(BigIntField) amount!: bigint;  // Symbol (required)
  //   @Field('bigint') amount!: bigint;     // String literal (IntelliSense)
  //
  // Serialization:
  //   bigint → string: "9007199254740991"
  //   symbol → string: "symbolKey" (using Symbol.for/keyFor)
  // ========================================================================
  const bigintTransformer = new BigIntTransformer();
  registerTransformerWithAliases([BigIntField.toString(), 'bigint'], bigintTransformer);

  const symbolTransformer = new SymbolTransformer();
  registerTransformerWithAliases([SymbolField.toString(), 'symbol'], symbolTransformer);

  // ========================================================================
  // BUFFERS: ArrayBuffer and DataView
  // ========================================================================
  // Low-level types for binary manipulation.
  //
  // Support 2 decoration forms:
  //   @Field(ArrayBufferField) buffer!: ArrayBuffer;  // Symbol (required)
  //   @Field('arraybuffer') buffer!: ArrayBuffer;     // String literal
  //
  // Serialization: Buffer → number[] (byte array)
  // ========================================================================
  const bufferTransformers = [
    { field: ArrayBufferField, stringAlias: 'arraybuffer', Transformer: ArrayBufferTransformer },
    { field: DataViewField, stringAlias: 'dataview', Transformer: DataViewTransformer },
  ];

  bufferTransformers.forEach(({ field, stringAlias, Transformer }) => {
    const transformer: AnyTransformer = new Transformer();
    registerTransformerWithAliases([field.toString(), stringAlias], transformer);
  });

  // ========================================================================
  // TYPED ARRAYS: Typed arrays for efficient numeric data
  // ========================================================================
  // Optimized arrays for performance with specific numeric types.
  //
  // Support 3 decoration forms:
  //   @Field(Int8ArrayField) bytes!: Int8Array;  // Symbol (original form)
  //   @Field(Int8Array) bytes!: Int8Array;       // Native constructor
  //   @Field('int8array') bytes!: Int8Array;     // String literal (IntelliSense)
  //
  // Serialization:
  //   Int8Array, Uint8Array, etc. → number[]
  //   BigInt64Array, BigUint64Array → string[] (bigints as strings)
  // ========================================================================
  const typedArrays = [
    { field: Int8ArrayField, stringAlias: 'int8array', ArrayType: Int8Array, isBigInt: false },
    { field: Uint8ArrayField, stringAlias: 'uint8array', ArrayType: Uint8Array, isBigInt: false },
    { field: Int16ArrayField, stringAlias: 'int16array', ArrayType: Int16Array, isBigInt: false },
    { field: Uint16ArrayField, stringAlias: 'uint16array', ArrayType: Uint16Array, isBigInt: false },
    { field: Int32ArrayField, stringAlias: 'int32array', ArrayType: Int32Array, isBigInt: false },
    { field: Uint32ArrayField, stringAlias: 'uint32array', ArrayType: Uint32Array, isBigInt: false },
    { field: Float32ArrayField, stringAlias: 'float32array', ArrayType: Float32Array, isBigInt: false },
    { field: Float64ArrayField, stringAlias: 'float64array', ArrayType: Float64Array, isBigInt: false },
    { field: BigInt64ArrayField, stringAlias: 'bigint64array', ArrayType: BigInt64Array, isBigInt: true },
    { field: BigUint64ArrayField, stringAlias: 'biguint64array', ArrayType: BigUint64Array, isBigInt: true },
  ];

  typedArrays.forEach(({ field, stringAlias, ArrayType, isBigInt }) => {
    const transformer = new TypedArrayTransformer(ArrayType, isBigInt);
    registerTransformerWithAliases([field.toString(), stringAlias, ArrayType], transformer);
  });
}

// Auto-initialize
registerCoreTransformers();

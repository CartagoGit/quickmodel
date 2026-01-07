/**
 * SOLID - Dependency Inversion: Centralized dependency configuration
 * SOLID - Open/Closed: Easy to add new transformers without modifying QModel
 */

import {
  QArrayBuffer,
  QBigInt64Array,
  QBigInt,
  QBigUint64Array,
  QDataView,
  QError,
  QFloat32Array,
  QFloat64Array,
  QInt16Array,
  QInt32Array,
  QInt8Array,
  QRegExp,
  QSymbol,
  QUint16Array,
  QUint32Array,
  QUint8Array,
  QURL,
  QURLSearchParams,
} from '../core/interfaces/field-symbols.interface';
import { ITransformer, IValidator } from '../core/interfaces';
import { transformerRegistry, validatorRegistry } from '../core/registry';

// Helper type for generic transformer (avoids union incompatibilities)
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
  // allow explicit use: @QType('string'), @QType('number'), @QType('boolean')
  //
  // Usage in models:
  //   @QType() name!: string;          // Auto-detected
  //   @QType('string') name!: string;  // Explicit
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
  //   @QType() createdAt!: Date;        // Auto-detected by design:type
  //   @QType('date') createdAt!: Date;  // String literal (IntelliSense)
  //   @QType(Date) createdAt!: Date;    // Native constructor
  //
  // Serialization: Date → ISO string ("2024-01-01T00:00:00.000Z")
  // ========================================================================
  const dateTransformer = new DateTransformer();
  registerTransformerWithAliases(['date', Date], dateTransformer);

  // ========================================================================
  // MAP & SET: Collections with auto-detection
  // ========================================================================
  // Support 3 decoration forms:
  //   @QType() tags!: Map<string, number>;  // Auto-detected
  //   @QType('map') tags!: Map<K, V>;       // String literal
  //   @QType(Map) tags!: Map<K, V>;         // Constructor
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
  //   @QType(QRegExp) pattern!: RegExp;  // Symbol (original form)
  //   @QType(RegExp) pattern!: RegExp;       // Native constructor
  //   @QType('regexp') pattern!: RegExp;     // String literal (IntelliSense)
  //
  // Serialization:
  //   RegExp → string: "/pattern/flags"
  //   Error → string: "ErrorName: message"
  //   URL → string: "https://example.com"
  //   URLSearchParams → string: "key=value&foo=bar"
  // ========================================================================
  const transformersWithAliases = [
    { 
      field: QRegExp,
      stringAlias: 'regexp',
      alias: RegExp, 
      Transformer: RegExpTransformer 
    },
    { 
      field: QError,
      stringAlias: 'error',
      alias: Error, 
      Transformer: ErrorTransformer 
    },
    { 
      field: QURL,
      stringAlias: 'url',
      alias: URL, 
      Transformer: URLTransformer 
    },
    { 
      field: QURLSearchParams,
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
  //   @QType(QBigInt) amount!: bigint;  // Symbol (required)
  //   @QType('bigint') amount!: bigint;     // String literal (IntelliSense)
  //
  // Serialization:
  //   bigint → string: "9007199254740991"
  //   symbol → string: "symbolKey" (using Symbol.for/keyFor)
  // ========================================================================
  const bigintTransformer = new BigIntTransformer();
  registerTransformerWithAliases([QBigInt.toString(), 'bigint'], bigintTransformer);

  const symbolTransformer = new SymbolTransformer();
  registerTransformerWithAliases([QSymbol.toString(), 'symbol'], symbolTransformer);

  // ========================================================================
  // BUFFERS: ArrayBuffer and DataView
  // ========================================================================
  // Low-level types for binary manipulation.
  //
  // Support 2 decoration forms:
  //   @QType(QArrayBuffer) buffer!: ArrayBuffer;  // Symbol (required)
  //   @QType('arraybuffer') buffer!: ArrayBuffer;     // String literal
  //
  // Serialization: Buffer → number[] (byte array)
  // ========================================================================
  const bufferTransformers = [
    { field: QArrayBuffer, stringAlias: 'arraybuffer', Transformer: ArrayBufferTransformer },
    { field: QDataView, stringAlias: 'dataview', Transformer: DataViewTransformer },
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
  //   @QType(QInt8Array) bytes!: Int8Array;  // Symbol (original form)
  //   @QType(Int8Array) bytes!: Int8Array;       // Native constructor
  //   @QType('int8array') bytes!: Int8Array;     // String literal (IntelliSense)
  //
  // Serialization:
  //   Int8Array, Uint8Array, etc. → number[]
  //   BigInt64Array, BigUint64Array → string[] (bigints as strings)
  // ========================================================================
  const typedArrays = [
    { field: QInt8Array, stringAlias: 'int8array', ArrayType: Int8Array, isBigInt: false },
    { field: QUint8Array, stringAlias: 'uint8array', ArrayType: Uint8Array, isBigInt: false },
    { field: QInt16Array, stringAlias: 'int16array', ArrayType: Int16Array, isBigInt: false },
    { field: QUint16Array, stringAlias: 'uint16array', ArrayType: Uint16Array, isBigInt: false },
    { field: QInt32Array, stringAlias: 'int32array', ArrayType: Int32Array, isBigInt: false },
    { field: QUint32Array, stringAlias: 'uint32array', ArrayType: Uint32Array, isBigInt: false },
    { field: QFloat32Array, stringAlias: 'float32array', ArrayType: Float32Array, isBigInt: false },
    { field: QFloat64Array, stringAlias: 'float64array', ArrayType: Float64Array, isBigInt: false },
    { field: QBigInt64Array, stringAlias: 'bigint64array', ArrayType: BigInt64Array, isBigInt: true },
    { field: QBigUint64Array, stringAlias: 'biguint64array', ArrayType: BigUint64Array, isBigInt: true },
  ];

  typedArrays.forEach(({ field, stringAlias, ArrayType, isBigInt }) => {
    const transformer = new TypedArrayTransformer(ArrayType, isBigInt);
    registerTransformerWithAliases([field.toString(), stringAlias, ArrayType], transformer);
  });
}

// Auto-initialize
registerCoreTransformers();

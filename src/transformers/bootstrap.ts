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
 * Helper para registrar un transformer con múltiples aliases
 */
function registerTransformerWithAliases(
  keys: Array<string | symbol | Function>,
  transformer: ITransformer<any, any>,
  withValidator = true,
): void {
  keys.forEach((key) => {
    transformerRegistry.register(key, transformer);
    // validatorRegistry solo acepta string | symbol, no Function
    if (withValidator && 'validate' in transformer && typeof key !== 'function') {
      validatorRegistry.register(key as string | symbol, transformer as IValidator);
    }
  });
}

/**
 * Registrar transformers básicos
 */
export function registerCoreTransformers(): void {
  // ========================================================================
  // PRIMITIVOS: string, number, boolean
  // ========================================================================
  // Estos tipos se auto-detectan por design:type, pero los registramos para
  // permitir uso explícito: @Field('string'), @Field('number'), @Field('boolean')
  //
  // Uso en modelos:
  //   @Field() name!: string;          // Auto-detectado
  //   @Field('string') name!: string;  // Explícito
  // ========================================================================
  const primitives = ['string', 'number', 'boolean'] as const;
  primitives.forEach((type) => {
    const transformer = new PrimitiveTransformer(type);
    registerTransformerWithAliases([type], transformer);
  });

  // ========================================================================
  // DATE: Fechas con auto-detección y múltiples formas de uso
  // ========================================================================
  // Soporta 3 formas de decorar:
  //   @Field() createdAt!: Date;        // Auto-detectado por design:type
  //   @Field('date') createdAt!: Date;  // String literal (IntelliSense)
  //   @Field(Date) createdAt!: Date;    // Constructor nativo
  //
  // Serialización: Date → ISO string ("2024-01-01T00:00:00.000Z")
  // ========================================================================
  const dateTransformer = new DateTransformer();
  registerTransformerWithAliases(['date', Date], dateTransformer);

  // ========================================================================
  // MAP & SET: Colecciones con auto-detección
  // ========================================================================
  // Soportan 3 formas de decorar:
  //   @Field() tags!: Map<string, number>;  // Auto-detectado
  //   @Field('map') tags!: Map<K, V>;       // String literal
  //   @Field(Map) tags!: Map<K, V>;         // Constructor
  //
  // Serialización:
  //   Map<K,V> → Record<K,V> (objeto plano)
  //   Set<T> → T[] (array)
  // ========================================================================
  const mapTransformer = new MapTransformer();
  const setTransformer = new SetTransformer();
  registerTransformerWithAliases(['map', Map], mapTransformer, false);
  registerTransformerWithAliases(['set', Set], setTransformer, false);

  // ========================================================================
  // TIPOS ESPECIALES CON CONSTRUCTORES NATIVOS
  // ========================================================================
  // Estos tipos tienen constructores nativos de JavaScript que pueden usarse
  // directamente en el decorador, además del symbol especial y string literal.
  //
  // Soportan 3 formas de decorar:
  //   @Field(RegExpField) pattern!: RegExp;  // Symbol (forma original)
  //   @Field(RegExp) pattern!: RegExp;       // Constructor nativo
  //   @Field('regexp') pattern!: RegExp;     // String literal (IntelliSense)
  //
  // Serialización:
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
    const transformer = new Transformer();
    registerTransformerWithAliases([field.toString(), stringAlias, alias], transformer);
  });

  // ========================================================================
  // BIGINT & SYMBOL: Tipos primitivos sin constructor reutilizable
  // ========================================================================
  // Estos tipos NO pueden usar el constructor directamente porque:
  //   - BigInt() es una función de conversión, no un constructor
  //   - Symbol() siempre crea un nuevo symbol único
  //
  // Soportan 2 formas de decorar:
  //   @Field(BigIntField) amount!: bigint;  // Symbol (requerido)
  //   @Field('bigint') amount!: bigint;     // String literal (IntelliSense)
  //
  // Serialización:
  //   bigint → string: "9007199254740991"
  //   symbol → string: "symbolKey" (usando Symbol.for/keyFor)
  // ========================================================================
  const bigintTransformer = new BigIntTransformer();
  registerTransformerWithAliases([BigIntField.toString(), 'bigint'], bigintTransformer);

  const symbolTransformer = new SymbolTransformer();
  registerTransformerWithAliases([SymbolField.toString(), 'symbol'], symbolTransformer);

  // ========================================================================
  // BUFFERS: ArrayBuffer y DataView
  // ========================================================================
  // Tipos de bajo nivel para manipulación binaria.
  //
  // Soportan 2 formas de decorar:
  //   @Field(ArrayBufferField) buffer!: ArrayBuffer;  // Symbol (requerido)
  //   @Field('arraybuffer') buffer!: ArrayBuffer;     // String literal
  //
  // Serialización: Buffer → number[] (array de bytes)
  // ========================================================================
  const bufferTransformers = [
    { field: ArrayBufferField, stringAlias: 'arraybuffer', Transformer: ArrayBufferTransformer },
    { field: DataViewField, stringAlias: 'dataview', Transformer: DataViewTransformer },
  ];

  bufferTransformers.forEach(({ field, stringAlias, Transformer }) => {
    const transformer = new Transformer();
    registerTransformerWithAliases([field.toString(), stringAlias], transformer);
  });

  // ========================================================================
  // TYPED ARRAYS: Arrays tipados para datos numéricos eficientes
  // ========================================================================
  // Arrays optimizados para rendimiento con tipos numéricos específicos.
  //
  // Soportan 3 formas de decorar:
  //   @Field(Int8ArrayField) bytes!: Int8Array;  // Symbol (forma original)
  //   @Field(Int8Array) bytes!: Int8Array;       // Constructor nativo
  //   @Field('int8array') bytes!: Int8Array;     // String literal (IntelliSense)
  //
  // Serialización:
  //   Int8Array, Uint8Array, etc. → number[]
  //   BigInt64Array, BigUint64Array → string[] (bigints como strings)
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

// Auto-inicializar
registerCoreTransformers();

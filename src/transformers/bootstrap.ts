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
  // Primitivos
  const primitives = ['string', 'number', 'boolean'] as const;
  primitives.forEach((type) => {
    const transformer = new PrimitiveTransformer(type);
    registerTransformerWithAliases([type], transformer);
  });

  // Date (con alias para el constructor Date)
  const dateTransformer = new DateTransformer();
  registerTransformerWithAliases(['date', Date], dateTransformer);

  // Map & Set (con alias para los constructores)
  const mapTransformer = new MapTransformer();
  const setTransformer = new SetTransformer();
  registerTransformerWithAliases(['map', Map], mapTransformer, false);
  registerTransformerWithAliases(['set', Set], setTransformer, false);

  // Transformers con symbol field + alias al constructor nativo
  const transformersWithAliases = [
    { 
      field: RegExpField, 
      alias: RegExp, 
      Transformer: RegExpTransformer 
    },
    { 
      field: ErrorField, 
      alias: Error, 
      Transformer: ErrorTransformer 
    },
    { 
      field: URLField, 
      alias: URL, 
      Transformer: URLTransformer 
    },
    { 
      field: URLSearchParamsField, 
      alias: URLSearchParams, 
      Transformer: URLSearchParamsTransformer 
    },
  ];

  transformersWithAliases.forEach(({ field, alias, Transformer }) => {
    const transformer = new Transformer();
    registerTransformerWithAliases([field.toString(), alias], transformer);
  });

  // Transformers solo con symbol (sin constructor nativo usable)
  // BigIntField tiene alias 'bigint' para el serializer
  const bigintTransformer = new BigIntTransformer();
  registerTransformerWithAliases([BigIntField.toString(), 'bigint'], bigintTransformer);

  // SymbolField tiene alias 'symbol' para el serializer  
  const symbolTransformer = new SymbolTransformer();
  registerTransformerWithAliases([SymbolField.toString(), 'symbol'], symbolTransformer);

  const bufferTransformers = [
    { field: ArrayBufferField, Transformer: ArrayBufferTransformer },
    { field: DataViewField, Transformer: DataViewTransformer },
  ];

  bufferTransformers.forEach(({ field, Transformer }) => {
    const transformer = new Transformer();
    registerTransformerWithAliases([field.toString()], transformer);
  });

  // TypedArrays (con alias al constructor)
  const typedArrays = [
    { field: Int8ArrayField, ArrayType: Int8Array, isBigInt: false },
    { field: Uint8ArrayField, ArrayType: Uint8Array, isBigInt: false },
    { field: Int16ArrayField, ArrayType: Int16Array, isBigInt: false },
    { field: Uint16ArrayField, ArrayType: Uint16Array, isBigInt: false },
    { field: Int32ArrayField, ArrayType: Int32Array, isBigInt: false },
    { field: Uint32ArrayField, ArrayType: Uint32Array, isBigInt: false },
    { field: Float32ArrayField, ArrayType: Float32Array, isBigInt: false },
    { field: Float64ArrayField, ArrayType: Float64Array, isBigInt: false },
    { field: BigInt64ArrayField, ArrayType: BigInt64Array, isBigInt: true },
    { field: BigUint64ArrayField, ArrayType: BigUint64Array, isBigInt: true },
  ];

  typedArrays.forEach(({ field, ArrayType, isBigInt }) => {
    const transformer = new TypedArrayTransformer(ArrayType, isBigInt);
    registerTransformerWithAliases([field.toString(), ArrayType], transformer);
  });
}

// Auto-inicializar
registerCoreTransformers();

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
} from '../core/interfaces/field-symbols.interface';
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

// Registrar transformers básicos
export function registerCoreTransformers(): void {
  // Primitivos
  const stringTransformer = new PrimitiveTransformer('string');
  const numberTransformer = new PrimitiveTransformer('number');
  const booleanTransformer = new PrimitiveTransformer('boolean');

  transformerRegistry.register('string', stringTransformer);
  transformerRegistry.register('number', numberTransformer);
  transformerRegistry.register('boolean', booleanTransformer);

  validatorRegistry.register('string', stringTransformer);
  validatorRegistry.register('number', numberTransformer);
  validatorRegistry.register('boolean', booleanTransformer);

  // Date
  const dateTransformer = new DateTransformer();
  transformerRegistry.register('date', dateTransformer);
  transformerRegistry.register(Date, dateTransformer);
  validatorRegistry.register('date', dateTransformer);

  // Map & Set
  const mapTransformer = new MapTransformer();
  const setTransformer = new SetTransformer();
  transformerRegistry.register('map', mapTransformer);
  transformerRegistry.register('set', setTransformer);
  transformerRegistry.register(Map, mapTransformer);
  transformerRegistry.register(Set, setTransformer);

  // BigInt
  const bigIntTransformer = new BigIntTransformer();
  transformerRegistry.register(BigIntField.toString(), bigIntTransformer);
  validatorRegistry.register(BigIntField.toString(), bigIntTransformer);

  // Symbol
  const symbolTransformer = new SymbolTransformer();
  transformerRegistry.register(SymbolField.toString(), symbolTransformer);
  validatorRegistry.register(SymbolField.toString(), symbolTransformer);

  // RegExp
  const regexpTransformer = new RegExpTransformer();
  transformerRegistry.register(RegExpField.toString(), regexpTransformer);
  validatorRegistry.register(RegExpField.toString(), regexpTransformer);

  // Error
  const errorTransformer = new ErrorTransformer();
  transformerRegistry.register(ErrorField.toString(), errorTransformer);
  validatorRegistry.register(ErrorField.toString(), errorTransformer);

  // ArrayBuffer & DataView
  const arrayBufferTransformer = new ArrayBufferTransformer();
  const dataViewTransformer = new DataViewTransformer();
  transformerRegistry.register(ArrayBufferField.toString(), arrayBufferTransformer);
  transformerRegistry.register(DataViewField.toString(), dataViewTransformer);
  validatorRegistry.register(ArrayBufferField.toString(), arrayBufferTransformer);
  validatorRegistry.register(DataViewField.toString(), dataViewTransformer);

  // TypedArrays
  const int8ArrayTransformer = new TypedArrayTransformer(Int8Array);
  const uint8ArrayTransformer = new TypedArrayTransformer(Uint8Array);
  const int16ArrayTransformer = new TypedArrayTransformer(Int16Array);
  const uint16ArrayTransformer = new TypedArrayTransformer(Uint16Array);
  const int32ArrayTransformer = new TypedArrayTransformer(Int32Array);
  const uint32ArrayTransformer = new TypedArrayTransformer(Uint32Array);
  const float32ArrayTransformer = new TypedArrayTransformer(Float32Array);
  const float64ArrayTransformer = new TypedArrayTransformer(Float64Array);
  const bigInt64ArrayTransformer = new TypedArrayTransformer(BigInt64Array, true);
  const bigUint64ArrayTransformer = new TypedArrayTransformer(BigUint64Array, true);

  transformerRegistry.register(Int8ArrayField.toString(), int8ArrayTransformer);
  transformerRegistry.register(Uint8ArrayField.toString(), uint8ArrayTransformer);
  transformerRegistry.register(Int16ArrayField.toString(), int16ArrayTransformer);
  transformerRegistry.register(Uint16ArrayField.toString(), uint16ArrayTransformer);
  transformerRegistry.register(Int32ArrayField.toString(), int32ArrayTransformer);
  transformerRegistry.register(Uint32ArrayField.toString(), uint32ArrayTransformer);
  transformerRegistry.register(Float32ArrayField.toString(), float32ArrayTransformer);
  transformerRegistry.register(Float64ArrayField.toString(), float64ArrayTransformer);
  transformerRegistry.register(BigInt64ArrayField.toString(), bigInt64ArrayTransformer);
  transformerRegistry.register(BigUint64ArrayField.toString(), bigUint64ArrayTransformer);

  validatorRegistry.register(Int8ArrayField.toString(), int8ArrayTransformer);
  validatorRegistry.register(Uint8ArrayField.toString(), uint8ArrayTransformer);
  validatorRegistry.register(Int16ArrayField.toString(), int16ArrayTransformer);
  validatorRegistry.register(Uint16ArrayField.toString(), uint16ArrayTransformer);
  validatorRegistry.register(Int32ArrayField.toString(), int32ArrayTransformer);
  validatorRegistry.register(Uint32ArrayField.toString(), uint32ArrayTransformer);
  validatorRegistry.register(Float32ArrayField.toString(), float32ArrayTransformer);
  validatorRegistry.register(Float64ArrayField.toString(), float64ArrayTransformer);
  validatorRegistry.register(BigInt64ArrayField.toString(), bigInt64ArrayTransformer);
  validatorRegistry.register(BigUint64ArrayField.toString(), bigUint64ArrayTransformer);
}

// Auto-inicializar
registerCoreTransformers();

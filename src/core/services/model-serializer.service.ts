/**
 * SOLID - Single Responsibility: Solo se encarga de serializar modelos
 * SOLID - Dependency Inversion: Depende de ITransformerRegistry (abstracción)
 */

import { ISerializer, ITransformerRegistry } from '../interfaces';

export class ModelSerializer<TModel = any, TInterface = any> implements ISerializer<
  TModel,
  TInterface
> {
  constructor(private readonly transformerRegistry: ITransformerRegistry) {}

  serialize(model: TModel): TInterface {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(model as Record<string, unknown>)) {
      if (value === undefined || value === null) {
        result[key] = value;
        continue;
      }

      result[key] = this.serializeValue(value);
    }

    return result as TInterface;
  }

  serializeToJson(model: TModel): string {
    return JSON.stringify(this.serialize(model));
  }

  private serializeValue(value: unknown): unknown {
    // Date
    if (value instanceof Date) {
      const transformer = this.transformerRegistry.get(Date) || this.transformerRegistry.get('date');
      return transformer ? transformer.toInterface(value) : value.toISOString();
    }

    // URL
    if (value instanceof URL) {
      const transformer = this.transformerRegistry.get(URL) || this.transformerRegistry.get(Symbol('URL').toString());
      return transformer ? transformer.toInterface(value) : value.href;
    }

    // URLSearchParams
    if (value instanceof URLSearchParams) {
      const transformer = this.transformerRegistry.get(URLSearchParams) || this.transformerRegistry.get(Symbol('URLSearchParams').toString());
      return transformer ? transformer.toInterface(value) : value.toString();
    }

    // BigInt
    if (typeof value === 'bigint') {
      const transformer = this.transformerRegistry.get('bigint');
      return transformer ? transformer.toInterface(value) : value.toString();
    }

    // Symbol
    if (typeof value === 'symbol') {
      const transformer = this.transformerRegistry.get('symbol');
      return transformer
        ? transformer.toInterface(value)
        : Symbol.keyFor(value) || value.toString();
    }

    // RegExp
    if (value instanceof RegExp) {
      const transformer = this.transformerRegistry.get(RegExp) || this.transformerRegistry.get(Symbol('RegExp').toString());
      return transformer
        ? transformer.toInterface(value)
        : { source: value.source, flags: value.flags };
    }

    // Error
    if (value instanceof Error) {
      const transformer = this.transformerRegistry.get(Error) || this.transformerRegistry.get(Symbol('Error').toString());
      return transformer
        ? transformer.toInterface(value)
        : { message: value.message, stack: value.stack, name: value.name };
    }

    // TypedArrays
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      // Determinar qué constructor usar para buscar el transformer
      let transformer;
      if (value instanceof Int8Array) transformer = this.transformerRegistry.get(Int8Array);
      else if (value instanceof Uint8Array) transformer = this.transformerRegistry.get(Uint8Array);
      else if (value instanceof Int16Array) transformer = this.transformerRegistry.get(Int16Array);
      else if (value instanceof Uint16Array) transformer = this.transformerRegistry.get(Uint16Array);
      else if (value instanceof Int32Array) transformer = this.transformerRegistry.get(Int32Array);
      else if (value instanceof Uint32Array) transformer = this.transformerRegistry.get(Uint32Array);
      else if (value instanceof Float32Array) transformer = this.transformerRegistry.get(Float32Array);
      else if (value instanceof Float64Array) transformer = this.transformerRegistry.get(Float64Array);
      else if (value instanceof BigInt64Array) transformer = this.transformerRegistry.get(BigInt64Array);
      else if (value instanceof BigUint64Array) transformer = this.transformerRegistry.get(BigUint64Array);

      if (transformer) {
        return transformer.toInterface(value);
      }

      // Fallback: convertir a array
      // Para BigInt64Array y BigUint64Array, convertir bigints a strings
      if (value instanceof BigInt64Array || value instanceof BigUint64Array) {
        return Array.from(value, (v: bigint) => v.toString());
      }
      return Array.from(value as any);
    }

    // ArrayBuffer
    if (value instanceof ArrayBuffer) {
      const transformer = this.transformerRegistry.get(ArrayBuffer) || this.transformerRegistry.get(Symbol('ArrayBuffer').toString());
      return transformer ? transformer.toInterface(value) : Array.from(new Uint8Array(value));
    }

    // DataView
    if (value instanceof DataView) {
      const transformer = this.transformerRegistry.get(DataView) || this.transformerRegistry.get(Symbol('DataView').toString());
      return transformer ? transformer.toInterface(value) : Array.from(new Uint8Array(value.buffer));
    }

    // Modelo anidado
    if (typeof value === 'object' && typeof (value as any).toInterface === 'function') {
      return (value as any).toInterface();
    }

    // Array
    if (Array.isArray(value)) {
      if (value.length > 0 && value[0]?.toInterface) {
        return value.map((item) => item.toInterface());
      }
      return value;
    }

    // Map
    if (value instanceof Map) {
      const transformer = this.transformerRegistry.get('map');
      return transformer ? transformer.toInterface(value) : Object.fromEntries(value);
    }

    // Set
    if (value instanceof Set) {
      const transformer = this.transformerRegistry.get('set');
      return transformer ? transformer.toInterface(value) : Array.from(value);
    }

    // Primitivo
    return value;
  }
}

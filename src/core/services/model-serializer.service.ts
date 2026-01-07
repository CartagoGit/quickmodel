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
    const result: any = {};

    for (const [key, value] of Object.entries(model as any)) {
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

  private serializeValue(value: any): any {
    // Date
    if (value instanceof Date) {
      const transformer = this.transformerRegistry.get('date');
      return transformer ? transformer.toInterface(value) : value.toISOString();
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
      const transformer = this.transformerRegistry.get('regexp');
      return transformer
        ? transformer.toInterface(value)
        : { source: value.source, flags: value.flags };
    }

    // Error
    if (value instanceof Error) {
      const transformer = this.transformerRegistry.get('error');
      return transformer
        ? transformer.toInterface(value)
        : { message: value.message, stack: value.stack, name: value.name };
    }

    // TypedArrays
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      return Array.from(value as any);
    }

    // ArrayBuffer
    if (value instanceof ArrayBuffer) {
      const transformer = this.transformerRegistry.get('arraybuffer');
      return transformer ? transformer.toInterface(value) : Array.from(new Uint8Array(value));
    }

    // DataView
    if (value instanceof DataView) {
      const transformer = this.transformerRegistry.get('dataview');
      return transformer
        ? transformer.toInterface(value)
        : Array.from(new Uint8Array(value.buffer));
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

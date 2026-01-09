/**
 * Service for generating mock data for models.
 * Uses faker to generate realistic random data.
 */

import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { QTYPES_METADATA_KEY } from '../decorators/qtype.decorator';
import { QUICK_TYPE_MAP_KEY } from '../constants/metadata-keys';

export type MockType = 'empty' | 'random' | 'minimal' | 'full' | 'sample';

export class MockGenerator {
  /**
   * Creates a new MockGenerator instance.
   */
  constructor() {}

  /**
   * Generates a mock based on reflect metadata.
   */
  generate<T>(
    modelClass: new (data: any) => T,
    type: MockType = 'random',
    overrides: Partial<any> = {}
  ): any {
    const instance = Object.create(modelClass.prototype);
    const mock: Record<string, unknown> = {};

    // Obtener todas las propiedades con metadata
    const properties = this.getDecoratedProperties(instance);

    for (const key of properties) {
      // If override exists, use it
      if (key in overrides) {
        mock[key] = overrides[key];
        continue;
      }

      const fieldType = Reflect.getMetadata('fieldType', modelClass.prototype, key);
      const designType = Reflect.getMetadata('design:type', modelClass.prototype, key);
      const arrayElementClass = Reflect.getMetadata('arrayElementClass', modelClass.prototype, key);

      mock[key] = this.generateValue(type, fieldType, designType, arrayElementClass);
    }

    return { ...mock, ...overrides };
  }

  /**
   * Generates an array of mocks.
   */
  generateArray<T>(
    modelClass: new (data: any) => T,
    count: number,
    type: MockType = 'random',
    overrides?: (index: number) => Partial<any>
  ): any[] {
    return Array.from({ length: count }, (_, index) => {
      const itemOverrides = overrides ? overrides(index) : {};
      return this.generate(modelClass, type, itemOverrides);
    });
  }

  private getDecoratedProperties(instance: Record<string, unknown>): string[] {
    const properties: Set<string> = new Set();

    // Traverse the prototype chain
    let current = instance;
    while (current && current !== Object.prototype) {
      // Get the list of properties registered by @QType()
      const registeredFields = Reflect.getMetadata(QTYPES_METADATA_KEY, current) as string[] | undefined;
      
      if (registeredFields) {
        for (const field of registeredFields) {
          properties.add(field);
        }
      }

      current = Object.getPrototypeOf(current);
    }

    // Also check for @Quick() typeMap - if no fields registered, use typeMap keys
    if (properties.size === 0) {
      const typeMap = Reflect.getMetadata(QUICK_TYPE_MAP_KEY, instance.constructor) as Record<string, any> | undefined;
      if (typeMap) {
        for (const key of Object.keys(typeMap)) {
          properties.add(key);
        }
      }
    }

    return Array.from(properties);
  }

  private generateValue(
    type: MockType,
    fieldType: any,
    designType: Function | undefined,
    arrayElementClass: any
  ): unknown {
    // Array de modelos
    if (arrayElementClass && designType === Array) {
      const length = type === 'minimal' ? 1 : type === 'empty' ? 0 : faker.number.int({ min: 1, max: 3 });
      return this.generateArray(arrayElementClass, length, type);
    }

    // Nested model
    if (arrayElementClass && !fieldType) {
      return this.generate(arrayElementClass, type);
    }

    // By fieldType (special types)
    if (fieldType) {
      return this.generateByFieldType(type, fieldType);
    }

    // By designType (auto-detection)
    if (designType) {
      return this.generateByDesignType(type, designType);
    }

    return this.getDefaultValue(type, 'string');
  }

  private generateByFieldType(type: MockType, fieldType: symbol | string | Function): unknown {
    const typeStr = typeof fieldType === 'symbol' 
      ? fieldType.toString() 
      : typeof fieldType === 'string'
      ? fieldType
      : fieldType.name;

    // Normalize to lowercase for comparison


    // Primitives (must come first - exact match with QType metadata)
    if (typeStr === 'string' || typeStr === 'String') {
      return this.getDefaultValue(type, 'string');
    }
    if (typeStr === 'number' || typeStr === 'Number') {
      return this.getDefaultValue(type, 'number');
    }
    if (typeStr === 'boolean' || typeStr === 'Boolean') {
      return this.getDefaultValue(type, 'boolean');
    }

    // Collections (exact match with QType metadata)
    if (typeStr === 'set' || typeStr === 'Set') {
      return this.getDefaultValue(type, 'set');
    }
    if (typeStr === 'map' || typeStr === 'Map') {
      return this.getDefaultValue(type, 'map');
    }

    // Special types (exact match with QType metadata)
    if (typeStr === 'date' || typeStr === 'Date') {
      return this.getDefaultValue(type, 'date');
    }
    if (typeStr === 'bigint' || typeStr === 'BigInt') {
      return this.getDefaultValue(type, 'bigint');
    }
    if (typeStr === 'symbol' || typeStr === 'Symbol') {
      return this.getDefaultValue(type, 'symbol');
    }
    if (typeStr === 'regexp' || typeStr === 'RegExp') {
      return this.getDefaultValue(type, 'regexp');
    }
    if (typeStr === 'error' || typeStr === 'Error') {
      return this.getDefaultValue(type, 'error');
    }

    // Web APIs (exact match with QType metadata)
    if (typeStr === 'url' || typeStr === 'URL') {
      return this.getDefaultValue(type, 'url');
    }
    if (typeStr === 'urlsearchparams' || typeStr === 'URLSearchParams') {
      return this.getDefaultValue(type, 'urlsearchparams');
    }

    // Binary types
    if (typeStr === 'arraybuffer' || typeStr === 'ArrayBuffer') {
      return this.getDefaultValue(type, 'arraybuffer');
    }
    if (typeStr === 'dataview' || typeStr === 'DataView') {
      return this.getDefaultValue(type, 'dataview');
    }

    // TypedArrays (exact match with QType metadata)
    if (typeStr === 'int8array' || typeStr === 'Int8Array') {
      return this.getDefaultValue(type, 'int8array');
    }
    if (typeStr === 'uint8array' || typeStr === 'Uint8Array') {
      return this.getDefaultValue(type, 'uint8array');
    }
    if (typeStr === 'int16array' || typeStr === 'Int16Array') {
      return this.getDefaultValue(type, 'int16array');
    }
    if (typeStr === 'uint16array' || typeStr === 'Uint16Array') {
      return this.getDefaultValue(type, 'uint16array');
    }
    if (typeStr === 'int32array' || typeStr === 'Int32Array') {
      return this.getDefaultValue(type, 'int32array');
    }
    if (typeStr === 'uint32array' || typeStr === 'Uint32Array') {
      return this.getDefaultValue(type, 'uint32array');
    }
    if (typeStr === 'float32array' || typeStr === 'Float32Array') {
      return this.getDefaultValue(type, 'float32array');
    }
    if (typeStr === 'float64array' || typeStr === 'Float64Array') {
      return this.getDefaultValue(type, 'float64array');
    }
    if (typeStr === 'bigint64array' || typeStr === 'BigInt64Array') {
      return this.getDefaultValue(type, 'bigint64array');
    }
    if (typeStr === 'biguint64array' || typeStr === 'BigUint64Array') {
      return this.getDefaultValue(type, 'biguint64array');
    }

    // Fallback: If no match, default to string
    return this.getDefaultValue(type, 'string');
  }

  private generateByDesignType(type: MockType, designType: Function): unknown {
    const typeName = designType.name;

    if (typeName === 'String') return this.getDefaultValue(type, 'string');
    if (typeName === 'Number') return this.getDefaultValue(type, 'number');
    if (typeName === 'Boolean') return this.getDefaultValue(type, 'boolean');
    if (typeName === 'Date') return this.getDefaultValue(type, 'date');
    if (typeName === 'Array') return this.getDefaultValue(type, 'array');
    if (typeName === 'Object') return this.getDefaultValue(type, 'object');
    if (typeName === 'Map') return this.getDefaultValue(type, 'map');
    if (typeName === 'Set') return this.getDefaultValue(type, 'set');

    return this.getDefaultValue(type, 'string');
  }

  private getDefaultValue(type: MockType, jsType: string): unknown {
    if (type === 'empty') {
      return this.getEmptyValue(jsType);
    }

    if (type === 'minimal' || type === 'sample') {
      return this.getSampleValue(jsType);
    }

    return this.getRandomValue(jsType);
  }

  private getEmptyValue(jsType: string): unknown {
    switch (jsType) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'bigint': return '0'; // Serialized format for transformers
      case 'symbol': return Symbol();
      case 'date': return new Date(0).toISOString(); // Serialized format
      case 'regexp': return /(?:)/.toString(); // Serialized format
      case 'error': return new Error();
      case 'url': return 'http://localhost'; // Serialized format
      case 'urlsearchparams': return new URLSearchParams();
      case 'array': return [];
      case 'object': return {};
      case 'map': return new Map();
      case 'set': return new Set();
      case 'int8array': return new Int8Array(0);
      case 'uint8array': return new Uint8Array(0);
      case 'int16array': return new Int16Array(0);
      case 'uint16array': return new Uint16Array(0);
      case 'int32array': return new Int32Array(0);
      case 'uint32array': return new Uint32Array(0);
      case 'float32array': return new Float32Array(0);
      case 'float64array': return new Float64Array(0);
      case 'bigint64array': return new BigInt64Array(0);
      case 'biguint64array': return new BigUint64Array(0);
      case 'arraybuffer': return new ArrayBuffer(0);
      case 'dataview': return new DataView(new ArrayBuffer(0));
      default: return null;
    }
  }

  private getSampleValue(jsType: string): unknown {
    switch (jsType) {
      case 'string': return 'sample';
      case 'number': return 42;
      case 'boolean': return true;
      case 'bigint': return '123'; // Serialized format for transformers
      case 'symbol': return Symbol('sample');
      case 'date': return new Date('2024-01-01').toISOString(); // Serialized format
      case 'regexp': return '/test/gi'; // Serialized format
      case 'error': return new Error('Sample error');
      case 'url': return 'https://example.com'; // Serialized format
      case 'urlsearchparams': return new URLSearchParams('key=value');
      case 'array': return ['sample'];
      case 'object': return { sample: true };
      case 'map': return new Map([['key', 'value']]);
      case 'set': return new Set(['sample']);
      case 'int8array': return new Int8Array([1, 2, 3]);
      case 'uint8array': return new Uint8Array([1, 2, 3]);
      case 'int16array': return new Int16Array([1, 2, 3]);
      case 'uint16array': return new Uint16Array([1, 2, 3]);
      case 'int32array': return new Int32Array([1, 2, 3]);
      case 'uint32array': return new Uint32Array([1, 2, 3]);
      case 'float32array': return new Float32Array([1.0, 2.0, 3.0]);
      case 'float64array': return new Float64Array([1.0, 2.0, 3.0]);
      case 'bigint64array': return new BigInt64Array([1n, 2n, 3n]);
      case 'biguint64array': return new BigUint64Array([1n, 2n, 3n]);
      case 'arraybuffer': return new Uint8Array([1, 2, 3]).buffer;
      case 'dataview': return new DataView(new Uint8Array([1, 2, 3]).buffer);
      default: return null;
    }
  }

  private getRandomValue(jsType: string): unknown {
    switch (jsType) {
      case 'string': return faker.lorem.word();
      case 'number': return faker.number.int({ min: 1, max: 1000 });
      case 'boolean': return faker.datatype.boolean();
      case 'bigint': return String(faker.number.int({ min: 1, max: 999999 })); // Serialized format
      case 'symbol': return Symbol(faker.lorem.word());
      case 'date': return faker.date.recent().toISOString(); // Serialized format
      case 'regexp': {
        const patterns = ['\\w+', '\\d+', '[a-z]+', '.*'];
        const flags = ['', 'i', 'g', 'gi', 'm'];
        const pattern = faker.helpers.arrayElement(patterns);
        const flag = faker.helpers.arrayElement(flags);
        return `/${pattern}/${flag}`; // Serialized format
      }
      case 'error': return new Error(faker.lorem.sentence());
      case 'url': return faker.internet.url(); // Already string
      case 'urlsearchparams': {
        const params = new URLSearchParams();
        params.set(faker.lorem.word(), faker.lorem.word());
        return params;
      }
      case 'array': return Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.lorem.word());
      case 'object': return { [faker.lorem.word()]: faker.lorem.word() };
      case 'map': {
        const map = new Map();
        map.set(faker.lorem.word(), faker.lorem.word());
        return map;
      }
      case 'set': return new Set([faker.lorem.word(), faker.lorem.word()]);
      case 'int8array': return new Int8Array(Array.from({ length: 3 }, () => faker.number.int({ min: -128, max: 127 })));
      case 'uint8array': return new Uint8Array(Array.from({ length: 3 }, () => faker.number.int({ min: 0, max: 255 })));
      case 'int16array': return new Int16Array(Array.from({ length: 3 }, () => faker.number.int({ min: -32768, max: 32767 })));
      case 'uint16array': return new Uint16Array(Array.from({ length: 3 }, () => faker.number.int({ min: 0, max: 65535 })));
      case 'int32array': return new Int32Array(Array.from({ length: 3 }, () => faker.number.int({ min: -2147483648, max: 2147483647 })));
      case 'uint32array': return new Uint32Array(Array.from({ length: 3 }, () => faker.number.int({ min: 0, max: 4294967295 })));
      case 'float32array': return new Float32Array(Array.from({ length: 3 }, () => faker.number.float()));
      case 'float64array': return new Float64Array(Array.from({ length: 3 }, () => faker.number.float()));
      case 'bigint64array': return new BigInt64Array(Array.from({ length: 3 }, () => BigInt(faker.number.int())));
      case 'biguint64array': return new BigUint64Array(Array.from({ length: 3 }, () => BigInt(faker.number.int({ min: 0 }))));
      case 'arraybuffer': {
        const arr = new Uint8Array(Array.from({ length: 8 }, () => faker.number.int({ min: 0, max: 255 })));
        return arr.buffer;
      }
      case 'dataview': {
        const arr = new Uint8Array(Array.from({ length: 8 }, () => faker.number.int({ min: 0, max: 255 })));
        return new DataView(arr.buffer);
      }
      default: return null;
    }
  }
}

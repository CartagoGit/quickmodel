/**
 * Service for generating mock data for models.
 * Uses faker to generate realistic random data.
 */

import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { FIELDS_METADATA_KEY } from '../decorators/qtype.decorator';

const QUICK_TYPE_MAP_KEY = '__quickTypeMap__';

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

      const fieldType = Reflect.getMetadata('fieldType', instance, key);
      const designType = Reflect.getMetadata('design:type', instance, key);
      const arrayElementClass = Reflect.getMetadata('arrayElementClass', instance, key);

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
      const registeredFields = Reflect.getMetadata(FIELDS_METADATA_KEY, current) as string[] | undefined;
      
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

    // RegExp (must go before Symbol because Symbol(RegExp) contains both words)
    if (typeStr.includes('RegExp') || typeStr === 'regexp') {
      return this.getDefaultValue(type, 'regexp');
    }

    // Error (must go before Symbol)
    if (typeStr.includes('Error') || typeStr === 'error') {
      return this.getDefaultValue(type, 'error');
    }

    // BigInt (must go before Symbol)
    if (typeStr.includes('BigInt') || typeStr === 'bigint') {
      return this.getDefaultValue(type, 'bigint');
    }

    // Symbol (must go after types that use Symbol() as wrapper)
    if (typeStr === 'Symbol' || typeStr === 'symbol') {
      return this.getDefaultValue(type, 'symbol');
    }

    // URL
    if (typeStr.includes('URL') || typeStr === 'url') {
      return this.getDefaultValue(type, 'url');
    }

    // URLSearchParams
    if (typeStr.includes('URLSearchParams') || typeStr === 'urlsearchparams') {
      return this.getDefaultValue(type, 'urlsearchparams');
    }

    // TypedArrays
    if (typeStr.includes('Int8Array') || typeStr === 'int8array') {
      return this.getDefaultValue(type, 'int8array');
    }
    if (typeStr.includes('Uint8Array') || typeStr === 'uint8array') {
      return this.getDefaultValue(type, 'uint8array');
    }
    if (typeStr.includes('Float32Array') || typeStr === 'float32array') {
      return this.getDefaultValue(type, 'float32array');
    }
    if (typeStr.includes('BigInt64Array') || typeStr === 'bigint64array') {
      return this.getDefaultValue(type, 'bigint64array');
    }

    // ArrayBuffer
    if (typeStr.includes('ArrayBuffer') || typeStr === 'arraybuffer') {
      return this.getDefaultValue(type, 'arraybuffer');
    }

    // DataView
    if (typeStr.includes('DataView') || typeStr === 'dataview') {
      return this.getDefaultValue(type, 'dataview');
    }

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
      case 'float32array': return new Float32Array(0);
      case 'bigint64array': return new BigInt64Array(0);
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
      case 'float32array': return new Float32Array([1.0, 2.0, 3.0]);
      case 'bigint64array': return new BigInt64Array([1n, 2n, 3n]);
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
      case 'float32array': return new Float32Array(Array.from({ length: 3 }, () => faker.number.float()));
      case 'bigint64array': return new BigInt64Array(Array.from({ length: 3 }, () => BigInt(faker.number.int())));
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

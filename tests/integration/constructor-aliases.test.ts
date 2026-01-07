/**
 * Test to verify that constructor aliases work correctly
 * 
 * This allows using multiple forms:
 * - @QType(RegExp) same as @QType(QRegExp) same as @QType('regexp')
 * - @QType(Error) same as @QType(QError) same as @QType('error')
 * - @QType(URL) same as @QType(QURL) same as @QType('url')
 * - @QType(Int8Array) same as @QType(QInt8Array) same as @QType('int8array')
 * etc.
 */

import { describe, expect, test } from 'bun:test';
import { QType } from '../../src/core/decorators/qtype.decorator';
import { QModel } from '../../src/quick.model';
import {
  QRegExp,
  QError,
  QURL,
  QURLSearchParams,
  QInt8Array,
  QUint8Array,
} from '../../src/core/interfaces/qtype-symbols.interface';

// ============================================================================
// Models using native constructors as aliases
// ============================================================================

interface IModelWithConstructors {
  pattern: RegExp;
  error: Error;
  url: URL;
  params: URLSearchParams;
  bytes1: Int8Array;
  bytes2: Uint8Array;
}

interface IModelWithConstructorsSerialized {
  pattern: string;
  error: string;
  url: string;
  params: string;
  bytes1: number[];
  bytes2: number[];
}

class ModelWithConstructors extends QModel<IModelWithConstructors> {
  @QType(RegExp)
  pattern!: RegExp;

  @QType(Error)
  error!: Error;

  @QType(URL)
  url!: URL;

  @QType(URLSearchParams)
  params!: URLSearchParams;

  @QType(Int8Array)
  bytes1!: Int8Array;

  @QType(Uint8Array)
  bytes2!: Uint8Array;
}

// ============================================================================
// Modelos usando symbols (forma tradicional)
// ============================================================================

interface IModelWithSymbols {
  pattern: RegExp;
  error: Error;
  url: URL;
  params: URLSearchParams;
  bytes1: Int8Array;
  bytes2: Uint8Array;
}

interface IModelWithSymbolsSerialized {
  pattern: string;
  error: string;
  url: string;
  params: string;
  bytes1: number[];
  bytes2: number[];
}

class ModelWithSymbols extends QModel<IModelWithSymbols> {
  @QType(QRegExp)
  pattern!: RegExp;

  @QType(QError)
  error!: Error;

  @QType(QURL)
  url!: URL;

  @QType(QURLSearchParams)
  params!: URLSearchParams;

  @QType(QInt8Array)
  bytes1!: Int8Array;

  @QType(QUint8Array)
  bytes2!: Uint8Array;
}

// ============================================================================
// Tests
// ============================================================================

describe('Constructor Aliases', () => {
  const testData = {
    pattern: /test/gi,
    error: new Error('Test error'),
    url: new URL('https://example.com/path?query=value'),
    params: new URLSearchParams('key1=value1&key2=value2'),
    bytes1: new Int8Array([1, 2, -3, -4]),
    bytes2: new Uint8Array([10, 20, 30, 40]),
  };

  describe('Usando constructores nativos (@QType(RegExp), @QType(Error), etc.)', () => {
    test('Should serialize correctly', () => {
      const model = new ModelWithConstructors(testData);

      const serialized = model.toInterface();

      expect(serialized.pattern).toBe('/test/gi');
      expect(serialized.error).toBe('Error: Test error');
      expect(serialized.url).toBe('https://example.com/path?query=value');
      expect(serialized.params).toBe('key1=value1&key2=value2');
      expect(serialized.bytes1).toEqual([1, 2, -3, -4]);
      expect(serialized.bytes2).toEqual([10, 20, 30, 40]);
    });

    test('Should deserialize correctly', () => {
      const data = {
        pattern: '/test/gi',
        error: 'Error: Test error',
        url: 'https://example.com/path?query=value',
        params: 'key1=value1&key2=value2',
        bytes1: [1, 2, -3, -4],
        bytes2: [10, 20, 30, 40],
      };

      const model = ModelWithConstructors.fromInterface(data);

      expect(model.pattern).toBeInstanceOf(RegExp);
      expect(model.pattern.source).toBe('test');
      expect(model.pattern.flags).toBe('gi');

      expect(model.error).toBeInstanceOf(Error);
      expect(model.error.message).toBe('Test error');

      expect(model.url).toBeInstanceOf(URL);
      expect(model.url.href).toBe('https://example.com/path?query=value');

      expect(model.params).toBeInstanceOf(URLSearchParams);
      expect(model.params.get('key1')).toBe('value1');
      expect(model.params.get('key2')).toBe('value2');

      expect(model.bytes1).toBeInstanceOf(Int8Array);
      expect(Array.from(model.bytes1)).toEqual([1, 2, -3, -4]);

      expect(model.bytes2).toBeInstanceOf(Uint8Array);
      expect(Array.from(model.bytes2)).toEqual([10, 20, 30, 40]);
    });

    test('Should perform round-trip correctly', () => {
      const original = new ModelWithConstructors(testData);

      const serialized = original.toInterface();
      const restored = ModelWithConstructors.fromInterface(serialized);

      expect(restored.pattern.toString()).toBe(original.pattern.toString());
      expect(restored.error.message).toBe(original.error.message);
      expect(restored.url.href).toBe(original.url.href);
      expect(restored.params.toString()).toBe(original.params.toString());
      expect(Array.from(restored.bytes1)).toEqual(Array.from(original.bytes1));
      expect(Array.from(restored.bytes2)).toEqual(Array.from(original.bytes2));
    });
  });

  describe('Usando symbols (@QType(QRegExp), @QType(QError), etc.)', () => {
    test('Should serialize correctly', () => {
      const model = new ModelWithSymbols(testData);

      const serialized = model.toInterface();

      expect(serialized.pattern).toBe('/test/gi');
      expect(serialized.error).toBe('Error: Test error');
      expect(serialized.url).toBe('https://example.com/path?query=value');
      expect(serialized.params).toBe('key1=value1&key2=value2');
      expect(serialized.bytes1).toEqual([1, 2, -3, -4]);
      expect(serialized.bytes2).toEqual([10, 20, 30, 40]);
    });

    test('Should deserialize correctly', () => {
      const data = {
        pattern: '/test/gi',
        error: 'Error: Test error',
        url: 'https://example.com/path?query=value',
        params: 'key1=value1&key2=value2',
        bytes1: [1, 2, -3, -4],
        bytes2: [10, 20, 30, 40],
      };

      const model = ModelWithSymbols.fromInterface(data);

      expect(model.pattern).toBeInstanceOf(RegExp);
      expect(model.pattern.source).toBe('test');
      expect(model.pattern.flags).toBe('gi');

      expect(model.error).toBeInstanceOf(Error);
      expect(model.error.message).toBe('Test error');

      expect(model.url).toBeInstanceOf(URL);
      expect(model.url.href).toBe('https://example.com/path?query=value');

      expect(model.params).toBeInstanceOf(URLSearchParams);
      expect(model.params.get('key1')).toBe('value1');
      expect(model.params.get('key2')).toBe('value2');

      expect(model.bytes1).toBeInstanceOf(Int8Array);
      expect(Array.from(model.bytes1)).toEqual([1, 2, -3, -4]);

      expect(model.bytes2).toBeInstanceOf(Uint8Array);
      expect(Array.from(model.bytes2)).toEqual([10, 20, 30, 40]);
    });

    test('Should perform round-trip correctly', () => {
      const original = new ModelWithSymbols(testData);

      const serialized = original.toInterface();
      const restored = ModelWithSymbols.fromInterface(serialized);

      expect(restored.pattern.toString()).toBe(original.pattern.toString());
      expect(restored.error.message).toBe(original.error.message);
      expect(restored.url.href).toBe(original.url.href);
      expect(restored.params.toString()).toBe(original.params.toString());
      expect(Array.from(restored.bytes1)).toEqual(Array.from(original.bytes1));
      expect(Array.from(restored.bytes2)).toEqual(Array.from(original.bytes2));
    });
  });

  describe('Both approaches should produce the same result', () => {
    test('Serialization should be identical', () => {
      const model1 = new ModelWithConstructors(testData);
      const model2 = new ModelWithSymbols(testData);

      const serialized1 = model1.toInterface();
      const serialized2 = model2.toInterface();

      expect(serialized1).toEqual(serialized2);
    });

    test('Deserialization should be identical', () => {
      const data = {
        pattern: '/test/gi',
        error: 'Error: Test error',
        url: 'https://example.com/path?query=value',
        params: 'key1=value1&key2=value2',
        bytes1: [1, 2, -3, -4],
        bytes2: [10, 20, 30, 40],
      };

      const model1 = ModelWithConstructors.fromInterface(data);
      const model2 = ModelWithSymbols.fromInterface(data);

      expect(model1.pattern.toString()).toBe(model2.pattern.toString());
      expect(model1.error.message).toBe(model2.error.message);
      expect(model1.url.href).toBe(model2.url.href);
      expect(model1.params.toString()).toBe(model2.params.toString());
      expect(Array.from(model1.bytes1)).toEqual(Array.from(model2.bytes1));
      expect(Array.from(model1.bytes2)).toEqual(Array.from(model2.bytes2));
    });
  });
});

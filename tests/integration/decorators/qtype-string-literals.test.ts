/**
 * Test to verify that string literals work correctly with IntelliSense
 * 
 * This allows using type-safe string literals instead of symbols:
 * @QType('bigint') amount!: bigint;
 * @QType('regexp') pattern!: RegExp;
 * @QType('int8array') bytes!: Int8Array;
 * etc.
 * 
 * Benefits: Shorter syntax, IntelliSense support, no imports needed
 */

import { describe, expect, test } from 'bun:test';
import { QType } from '@/core/decorators/qtype.decorator';
import { QModel } from '@/index';

// ============================================================================
// Model using string literals
// ============================================================================

interface IModelWithStringLiterals {
  name: string;
  count: number;
  active: boolean;
  amount: bigint;
  key: symbol;
  pattern: RegExp;
  error: Error;
  createdAt: Date;
  homepage: URL;
  params: URLSearchParams;
  bytes1: Int8Array;
  bytes2: Uint8Array;
  floats: Float32Array;
  bigInts: BigInt64Array;
  settings: Map<string, number>;
  tags: Set<string>;
  buffer: ArrayBuffer;
  view: DataView;
}

interface IModelWithStringLiteralsSerialized {
  name: string;
  count: number;
  active: boolean;
  amount: string | { __type: 'bigint'; value: string };
  key: string | { __type: 'symbol'; description: string };
  pattern: string | { __type: 'regexp'; source: string; flags: string };
  error: string;
  createdAt: string;
  homepage: string;
  params: string;
  bytes1: number[];
  bytes2: number[];
  floats: number[];
  bigInts: string[];
  settings: [string, number][];
  tags: string[];
  buffer: number[];
  view: number[];
}

class ModelWithStringLiterals extends QModel<IModelWithStringLiterals> {
  // Primitives (auto-detected, but can be explicit)
  @QType('string')
  name!: string;

  @QType('number')
  count!: number;

  @QType('boolean')
  active!: boolean;

  // Tipos especiales con string literals
  @QType('bigint')
  amount!: bigint;

  @QType('symbol')
  key!: symbol;

  @QType('regexp')
  pattern!: RegExp;

  @QType('error')
  error!: Error;

  @QType('date')
  createdAt!: Date;

  @QType('url')
  homepage!: URL;

  @QType('urlsearchparams')
  params!: URLSearchParams;

  // TypedArrays
  @QType('int8array')
  bytes1!: Int8Array;

  @QType('uint8array')
  bytes2!: Uint8Array;

  @QType('float32array')
  floats!: Float32Array;

  @QType('bigint64array')
  bigInts!: BigInt64Array;

  // Colecciones
  @QType('map')
  settings!: Map<string, number>;

  @QType('set')
  tags!: Set<string>;

  // Buffers
  @QType('arraybuffer')
  buffer!: ArrayBuffer;

  @QType('dataview')
  view!: DataView;
}

// ============================================================================
// Tests
// ============================================================================

describe('String Literals (@QType("type"))', () => {
  const testData = {
    name: 'Test',
    count: 42,
    active: true,
    amount: '123456789',
    key: 'testKey',
    pattern: '/test/gi',
    error: 'Error: Test error',
    createdAt: '2024-01-01T00:00:00.000Z',
    homepage: 'https://example.com',
    params: 'foo=bar&baz=qux',
    bytes1: [-1, 0, 1],
    bytes2: [10, 20, 30],
    floats: [1.5, 2.5, 3.5],
    bigInts: ['100', '200', '300'],
    settings: { theme: 1, volume: 2 },
    tags: ['tag1', 'tag2', 'tag3'],
    buffer: [1, 2, 3, 4],
    view: [5, 6, 7, 8],
  };

  test('Should deserialize correctly using string literals', () => {
    const model = ModelWithStringLiterals.deserialize(testData);

    // Primitivos
    expect(model.name).toBe('Test');
    expect(model.count).toBe(42);
    expect(model.active).toBe(true);

    // Tipos especiales
    expect(model.amount).toBe(123456789n);
    expect(typeof model.key).toBe('symbol');
    expect(Symbol.keyFor(model.key)).toBe('testKey');
    expect(model.pattern).toBeInstanceOf(RegExp);
    expect(model.pattern.source).toBe('test');
    expect(model.error).toBeInstanceOf(Error);
    expect(model.error.message).toBe('Test error');
    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.homepage).toBeInstanceOf(URL);
    expect(model.homepage.href).toBe('https://example.com/');
    expect(model.params).toBeInstanceOf(URLSearchParams);
    expect(model.params.get('foo')).toBe('bar');

    // TypedArrays
    expect(model.bytes1).toBeInstanceOf(Int8Array);
    expect(Array.from(model.bytes1)).toEqual([-1, 0, 1]);
    expect(model.bytes2).toBeInstanceOf(Uint8Array);
    expect(Array.from(model.bytes2)).toEqual([10, 20, 30]);
    expect(model.floats).toBeInstanceOf(Float32Array);
    expect(model.bigInts).toBeInstanceOf(BigInt64Array);
    expect(Array.from(model.bigInts)).toEqual([100n, 200n, 300n]);

    // Colecciones
    expect(model.settings).toBeInstanceOf(Map);
    expect(model.settings.get('theme')).toBe(1);
    expect(model.tags).toBeInstanceOf(Set);
    expect(model.tags.has('tag1')).toBe(true);

    // Buffers
    expect(model.buffer).toBeInstanceOf(ArrayBuffer);
    expect(model.view).toBeInstanceOf(DataView);
  });

  test('Should serialize correctly', () => {
    const model = ModelWithStringLiterals.deserialize(testData);
    const serialized = model.serialize();
    expect(serialized.name).toBe('Test');
    expect(serialized.count).toBe(42);
    expect(serialized.active).toBe(true);
    expect(serialized.amount).toMatchObject({ __type: 'bigint', value: '123456789' });
    expect(serialized.key).toMatchObject({ __type: 'symbol', description: 'testKey' });
    expect(serialized.pattern).toMatchObject({ __type: 'regexp', source: 'test', flags: 'gi' });
    expect(serialized.error).toBe('Error: Test error');
    expect(serialized.homepage).toBe('https://example.com/');
    expect(serialized.params).toBe('foo=bar&baz=qux');
    expect(serialized.bytes1).toEqual([-1, 0, 1]);
    expect(serialized.bytes2).toEqual([10, 20, 30]);
    expect(serialized.bigInts).toEqual(['100', '200', '300']);
  });

  test('Should perform round-trip correctly', () => {
    const model1 = ModelWithStringLiterals.deserialize(testData);
    const serialized = model1.serialize();
    const model2 = ModelWithStringLiterals.deserialize(serialized);

    expect(model2.name).toBe(model1.name);
    expect(model2.amount).toBe(model1.amount);
    expect(model2.pattern.toString()).toBe(model1.pattern.toString());
    expect(model2.createdAt.getTime()).toBe(model1.createdAt.getTime());
    expect(model2.homepage.href).toBe(model1.homepage.href);
    expect(Array.from(model2.bytes1)).toEqual(Array.from(model1.bytes1));
    expect(Array.from(model2.bigInts)).toEqual(Array.from(model1.bigInts));
  });

  test('Should work with JSON', () => {
    const model1 = ModelWithStringLiterals.deserialize(testData);
    const json = model1.toJSON();
    const model2 = ModelWithStringLiterals.fromJSON(json);

    expect(model2.name).toBe(model1.name);
    expect(model2.amount).toBe(model1.amount);
    expect(model2.pattern.toString()).toBe(model1.pattern.toString());
    expect(model2.createdAt.getTime()).toBe(model1.createdAt.getTime());
  });
});

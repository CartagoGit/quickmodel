/**
 * Test to verify that the type system works correctly
 * and that serialize() returns the correct serialized type
 * 
 * Tests type transformations:
 * - RegExp → string
 * - Error → string
 * - BigInt → string
 * - Date → string
 * - Set → array
 */

import { describe, expect, test } from 'bun:test';
import { QType, QModel, QRegExp, QError, QBigInt } from '../../src';

interface ITypeSafeModel {
  pattern: RegExp;
  error: Error;
  amount: bigint;
  createdAt: Date;
  tags: Set<string>;
}

class TypeSafeModel extends QModel<ITypeSafeModel> {
  @QType(QRegExp)
  pattern!: RegExp;

  @QType(QError)
  error!: Error;

  @QType(QBigInt)
  amount!: bigint;

  @QType()
  createdAt!: Date;

  @QType()
  tags!: Set<string>;
}

describe('Type Safety', () => {
  test('serialize() should return correct serialized types', () => {
    const model = new TypeSafeModel({
      pattern: /test/gi,
      error: new Error('Test error'),
      amount: 123n,
      createdAt: new Date('2024-01-01'),
      tags: new Set(['tag1', 'tag2']),
    });

    const serialized = model.serialize();

    // TypeScript sabe que estos son objetos con __type o strings
    expect(typeof serialized.pattern).toBe('object'); // Ahora es { __type: 'regexp', source, flags }
    expect(serialized.pattern).toHaveProperty('__type', 'regexp');
    expect(typeof serialized.error).toBe('string');
    expect(typeof serialized.amount).toBe('object'); // Ahora es { __type: 'bigint', value }
    expect(serialized.amount).toHaveProperty('__type', 'bigint');
    expect(typeof serialized.createdAt).toBe('string');
    expect(typeof serialized.tags).toBe('object'); // Ahora es { __type: 'Set', values }
    expect(serialized.tags).toHaveProperty('__type', 'Set');

    // Los valores serializados son correctos
    expect(serialized.pattern).toEqual({ __type: 'regexp', source: 'test', flags: 'gi' });
    expect(serialized.error).toBe('Error: Test error');
    expect(serialized.amount).toEqual({ __type: 'bigint', value: '123' });
    expect(serialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(serialized.tags).toEqual({ __type: 'Set', values: ['tag1', 'tag2'] });
  });

  test('deserialize() should accept serialized data', () => {
    const serializedData = {
      pattern: '/test/gi',
      error: 'Error: Test error',
      amount: '123',
      createdAt: '2024-01-01T00:00:00.000Z',
      tags: ['tag1', 'tag2'],
    };

    const model = TypeSafeModel.deserialize(serializedData);

    // Types are restored correctly
    expect(model.pattern).toBeInstanceOf(RegExp);
    expect(model.error).toBeInstanceOf(Error);
    expect(typeof model.amount).toBe('bigint');
    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.tags).toBeInstanceOf(Set);
  });

  test('deserialize() should also accept original data', () => {
    const originalData = {
      pattern: /test/gi,
      error: new Error('Test error'),
      amount: 123n,
      createdAt: new Date('2024-01-01'),
      tags: new Set(['tag1', 'tag2']),
    };

    const model = TypeSafeModel.deserialize(originalData);

    expect(model.pattern).toBeInstanceOf(RegExp);
    expect(model.error).toBeInstanceOf(Error);
    expect(typeof model.amount).toBe('bigint');
    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.tags).toBeInstanceOf(Set);
  });

  test('Round-trip mantiene la integridad de datos', () => {
    const original = new TypeSafeModel({
      pattern: /test/gi,
      error: new Error('Test error'),
      amount: 999n,
      createdAt: new Date('2024-01-01'),
      tags: new Set(['a', 'b', 'c']),
    });

    // Serialize
    const serialized = original.serialize();
    
    // Deserialize
    const restored = TypeSafeModel.deserialize(serialized);

    // Verify integrity
    expect(restored.pattern.source).toBe('test');
    expect(restored.pattern.flags).toBe('gi');
    expect(restored.error.message).toBe('Test error');
    expect(restored.amount).toBe(999n);
    expect(restored.createdAt.getTime()).toBe(new Date('2024-01-01').getTime());
    expect(Array.from(restored.tags)).toEqual(['a', 'b', 'c']);
  });
});

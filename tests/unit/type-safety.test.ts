/**
 * Test to verify that the type system works correctly
 * y que toInterface() retorna el tipo serializado correcto
 */

import { describe, expect, test } from 'bun:test';
import { Field, QuickModel, RegExpField, ErrorField, BigIntField } from '../../src';

interface ITypeSafeModel {
  pattern: RegExp;
  error: Error;
  amount: bigint;
  createdAt: Date;
  tags: Set<string>;
}

class TypeSafeModel extends QuickModel<ITypeSafeModel> {
  @Field(RegExpField)
  pattern!: RegExp;

  @Field(ErrorField)
  error!: Error;

  @Field(BigIntField)
  amount!: bigint;

  @Field()
  createdAt!: Date;

  @Field()
  tags!: Set<string>;
}

describe('Type Safety', () => {
  test('toInterface() should return correct serialized types', () => {
    const model = new TypeSafeModel({
      pattern: /test/gi,
      error: new Error('Test error'),
      amount: 123n,
      createdAt: new Date('2024-01-01'),
      tags: new Set(['tag1', 'tag2']),
    });

    const serialized = model.toInterface();

    // TypeScript sabe que estos son strings, no los tipos originales
    expect(typeof serialized.pattern).toBe('string');
    expect(typeof serialized.error).toBe('string');
    expect(typeof serialized.amount).toBe('string');
    expect(typeof serialized.createdAt).toBe('string');
    expect(Array.isArray(serialized.tags)).toBe(true);

    // Los valores serializados son correctos
    expect(serialized.pattern).toBe('/test/gi');
    expect(serialized.error).toBe('Error: Test error');
    expect(serialized.amount).toBe('123');
    expect(serialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(serialized.tags).toEqual(['tag1', 'tag2']);
  });

  test('fromInterface() should accept serialized data', () => {
    const serializedData = {
      pattern: '/test/gi',
      error: 'Error: Test error',
      amount: '123',
      createdAt: '2024-01-01T00:00:00.000Z',
      tags: ['tag1', 'tag2'],
    };

    const model = TypeSafeModel.fromInterface(serializedData);

    // Types are restored correctly
    expect(model.pattern).toBeInstanceOf(RegExp);
    expect(model.error).toBeInstanceOf(Error);
    expect(typeof model.amount).toBe('bigint');
    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.tags).toBeInstanceOf(Set);
  });

  test('fromInterface() should also accept original data', () => {
    const originalData = {
      pattern: /test/gi,
      error: new Error('Test error'),
      amount: 123n,
      createdAt: new Date('2024-01-01'),
      tags: new Set(['tag1', 'tag2']),
    };

    const model = TypeSafeModel.fromInterface(originalData);

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
    const serialized = original.toInterface();
    
    // Deserialize
    const restored = TypeSafeModel.fromInterface(serialized);

    // Verify integrity
    expect(restored.pattern.source).toBe('test');
    expect(restored.pattern.flags).toBe('gi');
    expect(restored.error.message).toBe('Test error');
    expect(restored.amount).toBe(999n);
    expect(restored.createdAt.getTime()).toBe(new Date('2024-01-01').getTime());
    expect(Array.from(restored.tags)).toEqual(['a', 'b', 'c']);
  });
});

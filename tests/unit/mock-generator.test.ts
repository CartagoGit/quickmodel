/**
 * Test to verify that the mock generation system works correctly.
 * 
 * Tests cover:
 * - Empty mock generation
 * - Random mock generation  
 * - Array mock generation
 * - Custom mock building
 */

import { describe, expect, test } from 'bun:test';
import { QType, QModel, QBigInt, QRegExp } from '../../src';

interface ITestModel {
  name: string;
  age: number;
  active: boolean;
  amount: bigint;
  pattern: RegExp;
  createdAt: Date;
}

class TestModel extends QModel<ITestModel> {
  @QType() name!: string;
  @QType() age!: number;
  @QType() active!: boolean;
  @QType(QBigInt) amount!: bigint;
  @QType(QRegExp) pattern!: RegExp;
  @QType() createdAt!: Date;
}

describe('Mock Generator', () => {
  describe('Mock methods for instances', () => {
    test('empty() should create instance with empty values', () => {
      const instance = TestModel.mock().empty() as TestModel;

      expect(instance).toBeInstanceOf(TestModel);
      expect(instance.name).toBe('');
      expect(instance.age).toBe(0);
      expect(instance.active).toBe(false);
      expect(instance.amount).toBe(0n);
      expect(instance.pattern).toBeInstanceOf(RegExp);
      expect(instance.createdAt).toBeInstanceOf(Date);
    });

    test('random() should create instance with random values', () => {
      const instance = TestModel.mock().random() as TestModel;

      expect(instance).toBeInstanceOf(TestModel);
      expect(typeof instance.name).toBe('string');
      expect(instance.name).not.toBe('');
      expect(typeof instance.age).toBe('number');
      expect(instance.age).toBeGreaterThan(0);
      expect(typeof instance.active).toBe('boolean');
      expect(typeof instance.amount).toBe('bigint');
      expect(instance.pattern).toBeInstanceOf(RegExp);
      expect(instance.createdAt).toBeInstanceOf(Date);
    });

    test('sample() should create instance with predictable values', () => {
      const instance = TestModel.mock().sample() as TestModel;

      expect(instance).toBeInstanceOf(TestModel);
      expect(instance.name).toBe('sample');
      expect(instance.age).toBe(42);
      expect(instance.active).toBe(true);
      expect(instance.amount).toBe(123n);
      expect(instance.pattern.toString()).toBe('/test/gi');
      expect(instance.createdAt).toBeInstanceOf(Date);
    });

    test('empty() should accept overrides', () => {
      const instance = TestModel.mock().empty({ name: 'Override', age: 99 }) as TestModel;

      expect(instance.name).toBe('Override');
      expect(instance.age).toBe(99);
      expect(instance.active).toBe(false); // No override
    });
  });

  describe('array()', () => {
    test('should create array of mocks', () => {
      const mocks = TestModel.mock().array(5) as TestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(5);
      expect(mocks[0]).toBeInstanceOf(TestModel);
      expect(mocks[4]).toBeInstanceOf(TestModel);
    });

    test('should return empty array when count is 0', () => {
      const mocks = TestModel.mock().array(0) as TestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(0);
    });

    test('should throw error when count is negative', () => {
      expect(() => TestModel.mock().array(-1)).toThrow('Count must be non-negative');
      expect(() => TestModel.mock().array(-5)).toThrow('Count must be non-negative');
    });

    test('should accept specific type', () => {
      const mocks = TestModel.mock().array(3, 'sample') as TestModel[];

      expect(mocks).toHaveLength(3);
      expect(mocks[0]!.name).toBe('sample');
      expect(mocks[1]!.name).toBe('sample');
      expect(mocks[2]!.name).toBe('sample');
    });

    test('should accept overrides function by index', () => {
      const mocks = TestModel.mock().array(3, 'sample', (i: number) => ({ name: `User${i}` })) as TestModel[];

      expect(mocks[0]!.name).toBe('User0');
      expect(mocks[1]!.name).toBe('User1');
      expect(mocks[2]!.name).toBe('User2');
    });
  });

  describe('Methods for interfaces (plain objects)', () => {
    test('interfaceEmpty() should create plain object with empty values', () => {
      const data = TestModel.mock().interfaceEmpty() as ITestModel;

      expect(data).not.toBeInstanceOf(TestModel);
      expect(typeof data).toBe('object');
      expect(data.name).toBe('');
      expect(data.age).toBe(0);
      expect(data.active).toBe(false);
    });

    test('interfaceRandom() should create random plain object', () => {
      const data = TestModel.mock().interfaceRandom() as ITestModel;

      expect(data).not.toBeInstanceOf(TestModel);
      expect(typeof data.name).toBe('string');
      expect(data.name).not.toBe('');
    });

    test('interfaceSample() should create plain object with predictable values', () => {
      const data = TestModel.mock().interfaceSample() as ITestModel;
      expect(data.name).toBe('sample');
      expect(data.age).toBe(42);
    });

    test('interfaceArray() should create array of plain objects', () => {
      const mocks = TestModel.mock().interfaceArray(5) as ITestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(5);
      expect(mocks[0]).not.toBeInstanceOf(TestModel);
      expect(typeof mocks[0]).toBe('object');
    });

    test('interfaceArray() should return empty array when count is 0', () => {
      const mocks = TestModel.mock().interfaceArray(0) as ITestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(0);
    });

    test('interfaceArray() should throw error when count is negative', () => {
      expect(() => TestModel.mock().interfaceArray(-1)).toThrow('Count must be non-negative');
      expect(() => TestModel.mock().interfaceArray(-10)).toThrow('Count must be non-negative');
    });
  });

  describe('Mock serialization', () => {
    test('random().toInterface() should work correctly', () => {
      const instance = TestModel.mock().random() as TestModel;
      const serialized = instance.toInterface();

      expect(typeof serialized.name).toBe('string');
      expect(typeof serialized.age).toBe('number');
      expect(typeof serialized.amount).toBe('object'); // Ahora es { __type: 'bigint', value }
      expect(serialized.amount).toHaveProperty('__type', 'bigint');
      expect(typeof serialized.pattern).toBe('object'); // Ahora es { __type: 'regexp', source, flags }
      expect(serialized.pattern).toHaveProperty('__type', 'regexp');
      expect(typeof serialized.createdAt).toBe('string');
    });

    test('fromInterface(interfaceRandom()) should create valid instance', () => {
      const mockData = TestModel.mock().interfaceRandom() as ITestModel;
      const instance = TestModel.fromInterface(mockData);

      expect(instance).toBeInstanceOf(TestModel);
      expect(typeof instance.name).toBe('string');
      expect(typeof instance.age).toBe('number');
    });
  });
});

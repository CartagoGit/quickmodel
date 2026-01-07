/**
 * Test para verificar que el sistema de mocks funciona correctamente
 */

import { describe, expect, test } from 'bun:test';
import { Field, QuickModel, BigIntField, RegExpField } from '../../src';

interface ITestModel {
  name: string;
  age: number;
  active: boolean;
  amount: bigint;
  pattern: RegExp;
  createdAt: Date;
}

class TestModel extends QuickModel<ITestModel> {
  @Field() name!: string;
  @Field() age!: number;
  @Field() active!: boolean;
  @Field(BigIntField) amount!: bigint;
  @Field(RegExpField) pattern!: RegExp;
  @Field() createdAt!: Date;
}

describe('Mock Generator', () => {
  describe('Métodos mock para instancias', () => {
    test('empty() debe crear instancia con valores vacíos', () => {
      const instance = TestModel.mock.empty() as TestModel;

      expect(instance).toBeInstanceOf(TestModel);
      expect(instance.name).toBe('');
      expect(instance.age).toBe(0);
      expect(instance.active).toBe(false);
      expect(instance.amount).toBe(0n);
      expect(instance.pattern).toBeInstanceOf(RegExp);
      expect(instance.createdAt).toBeInstanceOf(Date);
    });

    test('random() debe crear instancia con valores aleatorios', () => {
      const instance = TestModel.mock.random.call(TestModel) as TestModel;

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

    test('sample() debe crear instancia con valores predecibles', () => {
      const instance = TestModel.mock.sample() as TestModel;

      expect(instance).toBeInstanceOf(TestModel);
      expect(instance.name).toBe('sample');
      expect(instance.age).toBe(42);
      expect(instance.active).toBe(true);
      expect(instance.amount).toBe(123n);
      expect(instance.pattern.toString()).toBe('/test/gi');
      expect(instance.createdAt).toBeInstanceOf(Date);
    });

    test('empty() debe aceptar overrides', () => {
      const instance = TestModel.mock.empty({ name: 'Override', age: 99 }) as TestModel;

      expect(instance.name).toBe('Override');
      expect(instance.age).toBe(99);
      expect(instance.active).toBe(false); // No override
    });
  });

  describe('array()', () => {
    test('debe crear array de mocks', () => {
      const mocks = TestModel.mock.array(5) as TestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(5);
      expect(mocks[0]).toBeInstanceOf(TestModel);
      expect(mocks[4]).toBeInstanceOf(TestModel);
    });

    test('debe devolver array vacío cuando count es 0', () => {
      const mocks = TestModel.mock.array(0) as TestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(0);
    });

    test('debe lanzar error cuando count es negativo', () => {
      expect(() => TestModel.mock.array(-1)).toThrow('Count must be non-negative');
      expect(() => TestModel.mock.array(-5)).toThrow('Count must be non-negative');
    });

    test('debe aceptar tipo específico', () => {
      const mocks = TestModel.mock.array(3, 'sample') as TestModel[];

      expect(mocks).toHaveLength(3);
      expect(mocks[0]!.name).toBe('sample');
      expect(mocks[1]!.name).toBe('sample');
      expect(mocks[2]!.name).toBe('sample');
    });

    test('debe aceptar función de overrides por índice', () => {
      const mocks = TestModel.mock.array(3, 'sample', (i: number) => ({ name: `User${i}` })) as TestModel[];

      expect(mocks[0]!.name).toBe('User0');
      expect(mocks[1]!.name).toBe('User1');
      expect(mocks[2]!.name).toBe('User2');
    });
  });

  describe('Métodos para interfaces (objetos planos)', () => {
    test('interfaceEmpty() debe crear objeto plano con valores vacíos', () => {
      const data = TestModel.mock.interfaceEmpty() as ITestModel;

      expect(data).not.toBeInstanceOf(TestModel);
      expect(typeof data).toBe('object');
      expect(data.name).toBe('');
      expect(data.age).toBe(0);
      expect(data.active).toBe(false);
    });

    test('interfaceRandom() debe crear objeto plano aleatorio', () => {
      const data = TestModel.mock.interfaceRandom() as ITestModel;

      expect(data).not.toBeInstanceOf(TestModel);
      expect(typeof data.name).toBe('string');
      expect(data.name).not.toBe('');
    });

    test('interfaceSample() debe crear objeto plano con valores predecibles', () => {
      const data = TestModel.mock.interfaceSample() as ITestModel;
      expect(data.name).toBe('sample');
      expect(data.age).toBe(42);
    });

    test('interfaceArray() debe crear array de objetos planos', () => {
      const mocks = TestModel.mock.interfaceArray(5) as ITestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(5);
      expect(mocks[0]).not.toBeInstanceOf(TestModel);
      expect(typeof mocks[0]).toBe('object');
    });

    test('interfaceArray() debe devolver array vacío cuando count es 0', () => {
      const mocks = TestModel.mock.interfaceArray(0) as ITestModel[];

      expect(Array.isArray(mocks)).toBe(true);
      expect(mocks).toHaveLength(0);
    });

    test('interfaceArray() debe lanzar error cuando count es negativo', () => {
      expect(() => TestModel.mock.interfaceArray(-1)).toThrow('Count must be non-negative');
      expect(() => TestModel.mock.interfaceArray(-10)).toThrow('Count must be non-negative');
    });
  });

  describe('Serialización de mocks', () => {
    test('random().toInterface() debe funcionar correctamente', () => {
      const instance = TestModel.mock.random.call(TestModel) as TestModel;
      const serialized = instance.toInterface();

      expect(typeof serialized.name).toBe('string');
      expect(typeof serialized.age).toBe('number');
      expect(typeof serialized.amount).toBe('string');
      expect(typeof serialized.pattern).toBe('string');
      expect(typeof serialized.createdAt).toBe('string');
    });

    test('fromInterface(interfaceRandom()) debe crear instancia válida', () => {
      const mockData = TestModel.mock.interfaceRandom.call(TestModel) as ITestModel;
      const instance = TestModel.fromInterface(mockData);

      expect(instance).toBeInstanceOf(TestModel);
      expect(typeof instance.name).toBe('string');
      expect(typeof instance.age).toBe('number');
    });
  });
});

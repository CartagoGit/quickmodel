/**
 * Class for managing mocks of a specific model.
 * Follows Single Responsibility Principle: only handles mock creation.
 */

import type { MockGenerator, MockType } from '../services/mock-generator.service';
import type { ModelData } from '../interfaces/serialization-types.interface';

export class ModelMock<T> {
  constructor(
    private readonly modelClass: new (data: any) => T,
    private readonly generator: MockGenerator
  ) {}

  // ============================================================================
  // INSTANCIAS MOCK
  // ============================================================================

  /**
   * Creates a mock with empty/default values.
   * @example User.mock.empty() // { name: '', age: 0, active: false }
   */
  empty(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'empty', overrides);
    return new this.modelClass(data);
  }

  /**
   * Creates a mock with random values using faker.
   * @example User.mock.random() // { name: 'dolor', age: 742, active: true }
   */
  random(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'random', overrides);
    return new this.modelClass(data);
  }

  /**
   * Creates a mock with predictable sample values.
   * @example User.mock.sample() // { name: 'sample', age: 42, active: true }
   */
  sample(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'sample', overrides);
    return new this.modelClass(data);
  }

  /**
   * Creates a mock with minimal values (only required fields).
   */
  minimal(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'minimal', overrides);
    return new this.modelClass(data);
  }

  /**
   * Creates a mock with all fields populated.
   */
  full(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'full', overrides);
    return new this.modelClass(data);
  }

  // ============================================================================
  // INTERFACES MOCK (objetos planos)
  // ============================================================================

  /**
   * Creates a mock interface with empty values.
   * @example User.mock.interfaceEmpty() // { name: '', age: 0 }
   */
  interfaceEmpty(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'empty', overrides);
  }

  /**
   * Creates a mock interface with random values.
   * @example User.mock.interfaceRandom() // { name: 'dolor', age: 742 }
   */
  interfaceRandom(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'random', overrides);
  }

  /**
   * Creates a mock interface with sample values.
   */
  interfaceSample(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'sample', overrides);
  }

  /**
   * Creates a minimal mock interface.
   */
  interfaceMinimal(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'minimal', overrides);
  }

  /**
   * Creates a complete mock interface.
   */
  interfaceFull(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'full', overrides);
  }

  // ============================================================================
  // ARRAYS
  // ============================================================================

  /**
   * Creates an array of mock instances.
   * @param count Number of mocks to generate
   * @param type Mock type ('random' by default)
   * @param overrides Function that returns overrides by index
   * @example User.mock.array(5) // 5 random users
   * @example User.mock.array(3, 'sample', (i) => ({ name: `User${i}` }))
   */
  array(
    count: number,
    type: MockType = 'random',
    overrides?: (index: number) => Partial<any>
  ): T[] {
    if (count < 0) {
      throw new Error(`Count must be non-negative, got ${count}`);
    }
    if (count === 0) {
      return [];
    }
    const dataArray = this.generator.generateArray(this.modelClass, count, type, overrides);
    return dataArray.map((data) => new this.modelClass(data));
  }

  /**
   * Creates an array of mock interfaces (plain objects).
   * @example User.mock.interfaceArray(5) // Array of 5 interfaces
   */
  interfaceArray(
    count: number,
    type: MockType = 'random',
    overrides?: (index: number) => Partial<any>
  ): ModelData<any>[] {
    if (count < 0) {
      throw new Error(`Count must be non-negative, got ${count}`);
    }
    if (count === 0) {
      return [];
    }
    return this.generator.generateArray(this.modelClass, count, type, overrides);
  }
}

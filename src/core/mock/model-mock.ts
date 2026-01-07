/**
 * Clase para gestionar mocks de un modelo específico
 * Sigue el principio de Single Responsibility: solo se encarga de crear mocks
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
   * Crea un mock con valores vacíos/por defecto
   * @example User.mock.empty() // { name: '', age: 0, active: false }
   */
  empty(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'empty', overrides);
    return new this.modelClass(data);
  }

  /**
   * Crea un mock con valores aleatorios usando faker
   * @example User.mock.random() // { name: 'dolor', age: 742, active: true }
   */
  random(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'random', overrides);
    return new this.modelClass(data);
  }

  /**
   * Crea un mock con valores de muestra predecibles
   * @example User.mock.sample() // { name: 'sample', age: 42, active: true }
   */
  sample(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'sample', overrides);
    return new this.modelClass(data);
  }

  /**
   * Crea un mock con valores mínimos (solo campos requeridos)
   */
  minimal(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'minimal', overrides);
    return new this.modelClass(data);
  }

  /**
   * Crea un mock con todos los campos completos
   */
  full(overrides?: Partial<any>): T {
    const data = this.generator.generate(this.modelClass, 'full', overrides);
    return new this.modelClass(data);
  }

  // ============================================================================
  // INTERFACES MOCK (objetos planos)
  // ============================================================================

  /**
   * Crea una interfaz mock con valores vacíos
   * @example User.mock.interfaceEmpty() // { name: '', age: 0 }
   */
  interfaceEmpty(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'empty', overrides);
  }

  /**
   * Crea una interfaz mock con valores aleatorios
   * @example User.mock.interfaceRandom() // { name: 'dolor', age: 742 }
   */
  interfaceRandom(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'random', overrides);
  }

  /**
   * Crea una interfaz mock con valores de muestra
   */
  interfaceSample(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'sample', overrides);
  }

  /**
   * Crea una interfaz mock mínima
   */
  interfaceMinimal(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'minimal', overrides);
  }

  /**
   * Crea una interfaz mock completa
   */
  interfaceFull(overrides?: Partial<any>): ModelData<any> {
    return this.generator.generate(this.modelClass, 'full', overrides);
  }

  // ============================================================================
  // ARRAYS
  // ============================================================================

  /**
   * Crea un array de instancias mock
   * @param count Cantidad de mocks a generar
   * @param type Tipo de mock ('random' por defecto)
   * @param overrides Función que retorna overrides por índice
   * @example User.mock.array(5) // 5 usuarios aleatorios
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
   * Crea un array de interfaces mock (objetos planos)
   * @example User.mock.interfaceArray(5) // Array de 5 interfaces
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

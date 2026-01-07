/**
 * Test: ¿Qué tipos funcionan automáticamente SIN especificar symbol?
 * 
 * Probar todos los tipos para ver cuáles se autodetectan
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType, QInterface } from '../../src/quick.model';

// ============================================================================
// Test Models
// ============================================================================

interface IAutoDetect {
  // Primitivos
  str: string;
  num: number;
  bool: boolean;
  
  // Tipos especiales (serializados como string en JSON)
  big: string;      // bigint
  sym: string;      // symbol
  date: string;     // Date
  regex: { source: string; flags: string };  // RegExp
  err: { message: string; stack?: string };  // Error
  
  // Colecciones
  arr: string[];
  map: Record<string, any>;
  set: string[];
  
  // Objetos plain
  plain: Record<string, any>;
}

type AutoDetectTransforms = {
  big: bigint;
  sym: symbol;
  date: Date;
  regex: RegExp;
  err: Error;
  map: Map<string, any>;
  set: Set<string>;
};

// SIN especificar symbols - solo @QType()
class AutoDetectModel 
  extends QModel<IAutoDetect> 
  implements QInterface<IAutoDetect, AutoDetectTransforms> {
  
  // Primitivos
  @QType() str!: string;
  @QType() num!: number;
  @QType() bool!: boolean;
  
  // Tipos especiales
  @QType() big!: bigint;      // ¿Funciona?
  @QType() sym!: symbol;      // ¿Funciona?
  @QType() date!: Date;       // ¿Funciona?
  @QType() regex!: RegExp;    // ¿Funciona?
  @QType() err!: Error;       // ¿Funciona?
  
  // Colecciones
  @QType() arr!: string[];
  @QType() map!: Map<string, any>;
  @QType() set!: Set<string>;
  
  // Objetos plain
  @QType() plain!: Record<string, any>;
}

// ============================================================================
// Tests
// ============================================================================

describe('Auto-detección de tipos SIN symbols', () => {
  
  const testData: IAutoDetect = {
    // Primitivos
    str: 'hello',
    num: 42,
    bool: true,
    
    // Tipos especiales
    big: '999999999999999999',
    sym: 'unique-symbol',
    date: '2024-01-01T00:00:00.000Z',
    regex: { source: '^test$', flags: 'i' },
    err: { message: 'Test error', stack: 'stack trace' },
    
    // Colecciones
    arr: ['a', 'b', 'c'],
    map: { key1: 'value1', key2: 42 },
    set: ['item1', 'item2', 'item3'],
    
    // Objetos plain
    plain: { foo: 'bar', nested: { value: 123 } },
  };

  test('Resumen: ¿Qué funciona automáticamente?', () => {
    const model = new AutoDetectModel(testData);

    console.log('\n=== RESULTADOS DE AUTO-DETECCIÓN ===\n');
    
    // Primitivos
    console.log('✅ Primitivos:');
    console.log('   str:', typeof model.str === 'string' ? '✅' : '❌', typeof model.str);
    console.log('   num:', typeof model.num === 'number' ? '✅' : '❌', typeof model.num);
    console.log('   bool:', typeof model.bool === 'boolean' ? '✅' : '❌', typeof model.bool);
    
    // Tipos especiales
    console.log('\n✅ Tipos especiales (auto-detectados por metadata):');
    console.log('   big:', typeof model.big === 'bigint' ? '✅' : '❌', typeof model.big);
    console.log('   sym:', typeof model.sym === 'symbol' ? '✅' : '❌', typeof model.sym);
    console.log('   date:', model.date instanceof Date ? '✅' : '❌', model.date.constructor.name);
    console.log('   regex:', model.regex instanceof RegExp ? '✅' : '❌', model.regex.constructor.name);
    console.log('   err:', model.err instanceof Error ? '✅' : '❌', model.err.constructor.name);
    
    // Colecciones
    console.log('\n✅ Colecciones (auto-detectadas por metadata):');
    console.log('   arr:', Array.isArray(model.arr) ? '✅' : '❌', model.arr.constructor.name);
    console.log('   map:', model.map instanceof Map ? '✅' : '❌', model.map.constructor.name);
    console.log('   set:', model.set instanceof Set ? '✅' : '❌', model.set.constructor.name);
    
    // Objetos plain
    console.log('\n✅ Objetos plain:');
    console.log('   plain:', typeof model.plain === 'object' ? '✅' : '❌', typeof model.plain);
    
    console.log('\n');
  });

  test('Verificar metadata emitida por TypeScript', () => {
    console.log('\n=== METADATA EMITIDA POR TYPESCRIPT ===\n');
    
    const types = [
      'str', 'num', 'bool', 
      'big', 'sym', 'date', 'regex', 'err',
      'arr', 'map', 'set', 'plain'
    ];
    
    types.forEach(prop => {
      const metadata = Reflect.getMetadata('design:type', AutoDetectModel.prototype, prop);
      console.log(`${prop}:`.padEnd(10), metadata?.name || 'undefined');
    });
    
    console.log('\n');
  });

  test('Verificar assertions', () => {
    const model = new AutoDetectModel(testData);

    // Primitivos
    expect(typeof model.str).toBe('string');
    expect(typeof model.num).toBe('number');
    expect(typeof model.bool).toBe('boolean');
    
    // Tipos especiales (auto-detectados)
    expect(typeof model.big).toBe('bigint');
    expect(typeof model.sym).toBe('symbol');
    expect(model.date).toBeInstanceOf(Date);
    expect(model.regex).toBeInstanceOf(RegExp);
    expect(model.err).toBeInstanceOf(Error);
    
    // Colecciones
    expect(Array.isArray(model.arr)).toBe(true);
    expect(model.map).toBeInstanceOf(Map);
    expect(model.set).toBeInstanceOf(Set);
    
    // Plain object
    expect(typeof model.plain).toBe('object');
  });
});

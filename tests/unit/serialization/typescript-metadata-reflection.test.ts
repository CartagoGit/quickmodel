/**
 * Test: ¿Qué metadata emite TypeScript para bigint?
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType } from '@/index';

// ============================================================================
// Test Models
// ============================================================================

interface ITest {
  str: string;
  num: number;
  bool: boolean;
  big: string;  // bigint serializado
  date: string; // Date serializado
}

class TestModel extends QModel<ITest> {
  @QType() str!: string;
  @QType() num!: number;
  @QType() bool!: boolean;
  @QType() big!: bigint;   // 👈 TypeScript sabe que es bigint
  @QType() date!: Date;    // 👈 TypeScript sabe que es Date
}

// ============================================================================
// Tests
// ============================================================================

describe('TypeScript Metadata Emission', () => {
  
  test('¿Qué metadata emite TypeScript?', () => {
    // Obtener metadata de cada propiedad
    const strType = Reflect.getMetadata('design:type', TestModel.prototype, 'str');
    const numType = Reflect.getMetadata('design:type', TestModel.prototype, 'num');
    const boolType = Reflect.getMetadata('design:type', TestModel.prototype, 'bool');
    const bigType = Reflect.getMetadata('design:type', TestModel.prototype, 'big');
    const dateType = Reflect.getMetadata('design:type', TestModel.prototype, 'date');

    console.log('\n=== METADATA EMITIDA POR TYPESCRIPT ===\n');
    console.log('str!: string    → metadata:', strType?.name);
    console.log('num!: number    → metadata:', numType?.name);
    console.log('bool!: boolean  → metadata:', boolType?.name);
    console.log('big!: bigint    → metadata:', bigType?.name);    // ❓
    console.log('date!: Date     → metadata:', dateType?.name);   // ✅
    console.log('\n');

    // Verificar
    expect(strType).toBe(String);
    expect(numType).toBe(Number);
    expect(boolType).toBe(Boolean);
    expect(dateType).toBe(Date);       // ✅ Date sí funciona
    
    // El problema: bigint NO emite BigInt
    console.log('¿bigType es BigInt?', bigType === BigInt);
    console.log('¿bigType es Object?', bigType === Object);
    
    // TypeScript emite Object, NO BigInt
    expect(bigType).toBe(BigInt);  // ✅ TypeScript SÍ emite BigInt correctamente!
  });

  test('Comparación: TypeScript emite BigInt correctamente', () => {
    console.log('\n=== COMPARACIÓN ===\n');
    
    const metadata = Reflect.getMetadata('design:type', TestModel.prototype, 'big');
    
    console.log('TypeScript emite para bigint:', metadata?.name);
    console.log('Lo que necesitamos:', 'BigInt');
    console.log('Son iguales?', metadata === BigInt);
    
    console.log('\n✅ TypeScript SÍ emite BigInt correctamente!');
    console.log('✅ Ahora el deserializador lo detecta automáticamente');
    console.log('✅ Ya NO necesitas @QType(QBigInt) explícitamente\n');
    
    expect(metadata).toBe(BigInt);
  });

  test('Demostración: bigint AHORA funciona automáticamente!', () => {
    const data: ITest = {
      str: 'hello',
      num: 42,
      bool: true,
      big: '999999999999999999',
      date: '2024-01-01T00:00:00.000Z',
    };

    const model = new TestModel(data);

    console.log('\n=== RESULTADO CON AUTO-DETECCIÓN ===\n');
    console.log('model.str:', typeof model.str, model.str);      // ✅ string
    console.log('model.num:', typeof model.num, model.num);      // ✅ number
    console.log('model.bool:', typeof model.bool, model.bool);   // ✅ boolean
    console.log('model.date:', typeof model.date, model.date);   // ✅ Date
    console.log('model.big:', typeof model.big, model.big);      // ✅ bigint (FUNCIONA!)
    console.log('\n');

    // Date funciona porque TypeScript emite Date correctamente
    expect(model.date).toBeInstanceOf(Date);
    
    // bigint AHORA funciona también!
    expect(typeof model.big).toBe('bigint');  // ✅ Funciona!
    expect(model.big).toBe(999999999999999999n);
  });
});

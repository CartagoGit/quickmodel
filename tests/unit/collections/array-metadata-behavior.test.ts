/**
 * Test: Verificar metadata de arrays y tipos union
 * 
 * ¿TypeScript emite el tipo de elemento de un array?
 * ¿Qué pasa con union types como 'pepe' | 'maria'?
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ============================================================================
// Nested Models
// ============================================================================

interface ITag {
  id: string;
  name: string;
}

@Quick()
class Tag extends QModel<ITag> {
  declare id: string;
  declare name: string;
}

interface IUser {
  id: string;
  name: string;
}

@Quick()
class _User extends QModel<IUser> {
  declare id: string;
  declare name: string;
}

// ============================================================================
// Test Models
// ============================================================================

type Role = 'admin' | 'user' | 'guest';
type Status = 'active' | 'inactive';

interface IArraysAndUnions {
  // Arrays de diferentes tipos
  strArray: string[];
  numArray: number[];
  modelArray: ITag[];
  
  // Union types
  role: Role;
  status: Status;
  
  // Literal types
  literalStr: 'pepe' | 'maria';
  literalNum: 1 | 2 | 3;
  
  // Combinaciones
  optional?: string;
  nullable: string | null;
  mixed: string | number;
}

@Quick({
  modelArray: [Tag]
})
class ArraysAndUnionsModel extends QModel<IArraysAndUnions> {
  declare strArray: string[];
  declare numArray: number[];
  declare modelArray: Tag[];
  
  declare role: Role;
  declare status: Status;
  
  declare literalStr: 'pepe' | 'maria';
  declare literalNum: 1 | 2 | 3;
  
  declare optional?: string;
  declare nullable: string | null;
  declare mixed: string | number;
}

// ============================================================================
// Tests
// ============================================================================

describe('Metadata de arrays y union types', () => {
  
  test('Verificar metadata de arrays', () => {
    console.log('\n=== METADATA DE ARRAYS ===\n');
    
    const arrayProps = ['strArray', 'numArray', 'modelArray'];
    
    arrayProps.forEach(prop => {
      const metadata = Reflect.getMetadata('design:type', ArraysAndUnionsModel.prototype, prop);
      console.log(`${prop}:`.padEnd(15), metadata?.name || 'undefined');
    });
    
    console.log('\n');
  });

  test('Verificar metadata de union types', () => {
    console.log('\n=== METADATA DE UNION TYPES ===\n');
    
    const unionProps = ['role', 'status', 'literalStr', 'literalNum', 'optional', 'nullable', 'mixed'];
    
    unionProps.forEach(prop => {
      const metadata = Reflect.getMetadata('design:type', ArraysAndUnionsModel.prototype, prop);
      console.log(`${prop}:`.padEnd(15), metadata?.name || 'undefined');
    });
    
    console.log('\n');
  });

  test('Probar comportamiento de arrays sin especificar tipo', () => {
    const data: IArraysAndUnions = {
      strArray: ['a', 'b', 'c'],
      numArray: [1, 2, 3],
      modelArray: [
        { id: '1', name: 'tag1' },
        { id: '2', name: 'tag2' },
      ],
      role: 'admin',
      status: 'active',
      literalStr: 'pepe',
      literalNum: 1,
      nullable: 'test',
      mixed: 'string',
    };

    const model = new ArraysAndUnionsModel(data);
    
    console.log('\n=== RESULTADO ARRAYS ===');
    console.log('strArray:', model.strArray, '→ tipo:', model.strArray?.constructor.name);
    console.log('numArray:', model.numArray, '→ tipo:', model.numArray?.constructor.name);
    console.log('modelArray:', model.modelArray);
    console.log('modelArray[0] tipo:', model.modelArray?.[0]?.constructor.name);
    console.log('¿modelArray[0] es Tag?', model.modelArray?.[0] instanceof Tag);
    console.log('\n');
    
    // Los arrays de primitivos funcionan
    expect(model.strArray).toEqual(['a', 'b', 'c']);
    expect(model.numArray).toEqual([1, 2, 3]);
    
    // Los arrays de modelos sin @QType(Tag) NO funcionan
    // (solo son objetos planos)
  });

  test('Probar comportamiento de union types', () => {
    const data: IArraysAndUnions = {
      strArray: [],
      numArray: [],
      modelArray: [],
      role: 'admin',
      status: 'active',
      literalStr: 'maria',
      literalNum: 2,
      nullable: null,
      mixed: 123,
    };

    const model = new ArraysAndUnionsModel(data);
    
    console.log('\n=== RESULTADO UNION TYPES ===');
    console.log('role:', model.role, '→ tipo:', typeof model.role);
    console.log('status:', model.status, '→ tipo:', typeof model.status);
    console.log('literalStr:', model.literalStr, '→ tipo:', typeof model.literalStr);
    console.log('literalNum:', model.literalNum, '→ tipo:', typeof model.literalNum);
    console.log('nullable:', model.nullable, '→ tipo:', typeof model.nullable);
    console.log('mixed:', model.mixed, '→ tipo:', typeof model.mixed);
    console.log('\n');
    
    // Union types se preservan como su valor real
    expect(model.role).toBe('admin');
    expect(model.literalStr).toBe('maria');
    expect(model.literalNum).toBe(2);
    expect(model.nullable).toBe(null);
    expect(model.mixed).toBe(123);
  });
});

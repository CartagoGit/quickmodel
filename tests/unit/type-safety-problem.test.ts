/**
 * Test: Problema de type safety en QModel (documentado)
 * 
 * Este archivo documenta limitaciones de TypeScript con type safety en runtime.
 * Los tests están comentados porque requieren que fallen en compile-time,
 * no en runtime.
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType } from '../../src/quick.model';

interface IUser {
  id: string;
  name: string;
  age: number;
}

class User extends QModel<IUser> {
  @QType() id!: string;
  @QType() name!: string;
  @QType() age!: number;
}

describe('Type Safety Limitations (documented)', () => {
  
  test('Runtime validation catches type errors', () => {
    // ❌ Intentar crear con tipo incorrecto lanza error en runtime
    expect(() => {
      new User({
        id: '1',
        name: 'John',
        age: 'WRONG TYPE' as any,  // String en vez de number
      });
    }).toThrow('Expected number, got string');
  });

  test('Correct types work normally', () => {
    const user = new User({
      id: '1',
      name: 'John',
      age: 30,
    });
    
    expect(user.id).toBe('1');
    expect(user.name).toBe('John');
    expect(user.age).toBe(30);
  });

  test('Extra fields are copied (permissive behavior)', () => {
    const user = new User({
      id: '1',
      name: 'John',
      age: 30,
      extraField: 'copied' as any,
    });
    
    expect(user.id).toBe('1');
    expect((user as any).extraField).toBe('copied');  // Se copia aunque no esté en la interfaz
  });
});

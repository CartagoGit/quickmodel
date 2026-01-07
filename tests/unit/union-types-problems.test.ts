/**
 * Test: Explorar problemas con tipos compuestos/union
 * 
 * Identificar qué casos no funcionan actualmente
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType } from '../../src/quick.model';

// ============================================================================
// Models
// ============================================================================

interface IUser {
  id: string;
  name: string;
}

class User extends QModel<IUser> {
  @QType() id!: string;
  @QType() name!: string;
}

interface ITag {
  code: string;
  label: string;
}

class Tag extends QModel<ITag> {
  @QType() code!: string;
  @QType() label!: string;
}

// ============================================================================
// Casos problemáticos
// ============================================================================

describe('Tipos compuestos - Casos problemáticos', () => {
  
  test('Caso 1: Arrays de union types (User | Tag)[]', () => {
    console.log('\n=== ARRAYS DE UNION TYPES ===\n');
    
    interface IMixed {
      items: (IUser | ITag)[];
    }
    
    class MixedContainer extends QModel<IMixed> {
      @QType() items!: (User | Tag)[];
    }
    
    const data: IMixed = {
      items: [
        { id: '1', name: 'John' },    // User
        { code: 'A', label: 'Alpha' }, // Tag
        { id: '2', name: 'Jane' },    // User
      ],
    };
    
    const container = new MixedContainer(data);
    console.log('items[0]:', container.items[0]);
    console.log('items[1]:', container.items[1]);
    console.log('¿items[0] es User?', container.items[0] instanceof User);
    console.log('¿items[1] es Tag?', container.items[1] instanceof Tag);
    console.log('¿items[2] es User?', container.items[2] instanceof User);
    console.log('\n');
    
    // ✅ Ahora cada elemento se infiere correctamente
    expect(container.items[0]).toBeInstanceOf(User);
    expect(container.items[1]).toBeInstanceOf(Tag);
    expect(container.items[2]).toBeInstanceOf(User);
    
    expect((container.items[0] as User).id).toBe('1');
    expect((container.items[0] as User).name).toBe('John');
    expect((container.items[1] as Tag).code).toBe('A');
    expect((container.items[1] as Tag).label).toBe('Alpha');
  });

  test('Caso 2: Propiedad que puede ser Model | null', () => {
    console.log('\n=== MODEL | NULL ===\n');
    
    interface IProfile {
      owner: IUser | null;
    }
    
    class Profile extends QModel<IProfile> {
      @QType() owner!: User | null;
    }
    
    // Con valor
    const data1: IProfile = {
      owner: { id: '1', name: 'John' },
    };
    
    const profile1 = new Profile(data1);
    console.log('owner con valor:', profile1.owner);
    console.log('¿Es User?', profile1.owner instanceof User);
    
    // Con null
    const data2: IProfile = {
      owner: null,
    };
    
    const profile2 = new Profile(data2);
    console.log('owner null:', profile2.owner);
    console.log('¿Es null?', profile2.owner === null);
    console.log('\n');
    
    expect(profile1.owner).toBeInstanceOf(User);
    expect(profile2.owner).toBe(null);
  });

  test('Caso 3: Propiedad string | number', () => {
    console.log('\n=== STRING | NUMBER ===\n');
    
    interface IFlexible {
      value: string | number;
    }
    
    class FlexibleModel extends QModel<IFlexible> {
      @QType() value!: string | number;
    }
    
    const data1: IFlexible = { value: 'hello' };
    const model1 = new FlexibleModel(data1);
    console.log('value string:', model1.value, '→ tipo:', typeof model1.value);
    
    const data2: IFlexible = { value: 123 };
    const model2 = new FlexibleModel(data2);
    console.log('value number:', model2.value, '→ tipo:', typeof model2.value);
    console.log('\n');
    
    expect(model1.value).toBe('hello');
    expect(model2.value).toBe(123);
  });

  test('Caso 4: Literal union types con validación', () => {
    console.log('\n=== LITERAL UNION CON VALIDACIÓN ===\n');
    
    type Status = 'active' | 'inactive' | 'pending';
    
    interface ITask {
      status: Status;
    }
    
    class Task extends QModel<ITask> {
      @QType() status!: Status;
    }
    
    // Valor válido
    const data1: ITask = { status: 'active' };
    const task1 = new Task(data1);
    console.log('Status válido:', task1.status);
    expect(task1.status).toBe('active');
    
    // Valor inválido - actualmente NO valida
    const data2 = { status: 'INVALID' };
    const task2 = new Task(data2 as ITask);
    console.log('Status inválido:', task2.status);
    console.log('⚠️ No hay validación, acepta cualquier string\n');
  });

  test('Caso 5: Arrays de tipos primitivos union', () => {
    console.log('\n=== ARRAYS DE (STRING | NUMBER)[] ===\n');
    
    interface IMixedArray {
      values: (string | number)[];
    }
    
    class MixedArrayModel extends QModel<IMixedArray> {
      @QType() values!: (string | number)[];
    }
    
    const data: IMixedArray = {
      values: ['a', 1, 'b', 2, 'c', 3],
    };
    
    const model = new MixedArrayModel(data);
    console.log('values:', model.values);
    console.log('values[0] tipo:', typeof model.values[0]);
    console.log('values[1] tipo:', typeof model.values[1]);
    console.log('\n');
    
    expect(model.values).toEqual(['a', 1, 'b', 2, 'c', 3]);
  });
});

describe('¿Qué funciona actualmente?', () => {
  
  test('✅ Union de primitivos funciona', () => {
    interface IData {
      value: string | number;
    }
    
    class DataModel extends QModel<IData> {
      @QType() value!: string | number;
    }
    
    expect(new DataModel({ value: 'test' }).value).toBe('test');
    expect(new DataModel({ value: 123 }).value).toBe(123);
  });

  test('✅ Model | null funciona', () => {
    interface IData {
      user: IUser | null;
    }
    
    class DataModel extends QModel<IData> {
      @QType() user!: User | null;
    }
    
    const withUser = new DataModel({ user: { id: '1', name: 'John' } });
    const withNull = new DataModel({ user: null });
    
    expect(withUser.user).toBeInstanceOf(User);
    expect(withNull.user).toBe(null);
  });
});

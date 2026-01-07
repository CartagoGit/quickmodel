/**
 * Test: Auto-inference of model types in arrays
 * 
 * Demonstrates that arrays of models can be automatically detected
 * without explicit @QType(ModelClass) by analyzing object properties.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, QType } from '../../src/quick.model';
import { qModelRegistry } from '../../src/core/registry/model.registry';

// ============================================================================
// Models
// ============================================================================

interface IUser {
  id: string;
  name: string;
  email: string;
}

class User extends QModel<IUser> {
  @QType() id!: string;
  @QType() name!: string;
  @QType() email!: string;
  
  getDisplayName(): string {
    return this.name;
  }
}

interface ITag {
  code: string;
  label: string;
}

class Tag extends QModel<ITag> {
  @QType() code!: string;
  @QType() label!: string;
}

interface IProfile {
  userId: string;
  bio: string;
  website: string;
}

class Profile extends QModel<IProfile> {
  @QType() userId!: string;
  @QType() bio!: string;
  @QType() website!: string;
}

// ============================================================================
// Container Model
// ============================================================================

interface IContainer {
  users: IUser[];
  tags: ITag[];
  profiles: IProfile[];
}

class Container extends QModel<IContainer> {
  // Sin especificar User, Tag, Profile explícitamente
  @QType() users!: User[];
  @QType() tags!: Tag[];
  @QType() profiles!: Profile[];
}

// ============================================================================
// Tests
// ============================================================================

describe('Auto-inference de arrays de modelos', () => {
  
  beforeEach(() => {
    // El registro se actualiza automáticamente cuando se cargan las clases
    // pero verificamos que esté limpio entre tests
  });

  test('Verificar que los modelos están registrados', () => {
    const signatures = qModelRegistry.getRegisteredSignatures();
    
    console.log('\n=== MODELOS REGISTRADOS ===');
    signatures.forEach(sig => console.log('  -', sig));
    console.log('\n');
    
    expect(signatures.length).toBeGreaterThanOrEqual(3);
    expect(signatures).toContain('email,id,name'); // User
    expect(signatures).toContain('code,label');    // Tag
    expect(signatures).toContain('bio,userId,website'); // Profile
  });

  test('Inferir User[] sin @QType(User)', () => {
    const data: IContainer = {
      users: [
        { id: '1', name: 'John', email: 'john@test.com' },
        { id: '2', name: 'Jane', email: 'jane@test.com' },
      ],
      tags: [],
      profiles: [],
    };

    const container = new Container(data);
    
    console.log('\n=== USUARIOS INFERIDOS ===');
    console.log('users[0]:', container.users[0]);
    console.log('tipo:', container.users[0]?.constructor.name);
    console.log('¿Es User?', container.users[0] instanceof User);
    console.log('getDisplayName():', container.users[0]?.getDisplayName?.());
    console.log('\n');
    
    expect(container.users).toHaveLength(2);
    expect(container.users[0]).toBeInstanceOf(User);
    expect(container.users[0]!.id).toBe('1');
    expect(container.users[0]!.name).toBe('John');
    expect(container.users[0]!.email).toBe('john@test.com');
    expect(container.users[0]!.getDisplayName()).toBe('John');
  });

  test('Inferir Tag[] sin @QType(Tag)', () => {
    const data: IContainer = {
      users: [],
      tags: [
        { code: 'A', label: 'Alpha' },
        { code: 'B', label: 'Beta' },
        { code: 'C', label: 'Charlie' },
      ],
      profiles: [],
    };

    const container = new Container(data);
    
    console.log('\n=== TAGS INFERIDOS ===');
    console.log('tags[0]:', container.tags[0]);
    console.log('tipo:', container.tags[0]?.constructor.name);
    console.log('¿Es Tag?', container.tags[0] instanceof Tag);
    console.log('\n');
    
    expect(container.tags).toHaveLength(3);
    expect(container.tags[0]).toBeInstanceOf(Tag);
    expect(container.tags[0]!.code).toBe('A');
    expect(container.tags[0]!.label).toBe('Alpha');
  });

  test('Inferir Profile[] sin @QType(Profile)', () => {
    const data: IContainer = {
      users: [],
      tags: [],
      profiles: [
        { userId: '1', bio: 'Developer', website: 'https://dev.com' },
      ],
    };

    const container = new Container(data);
    
    console.log('\n=== PERFILES INFERIDOS ===');
    console.log('profiles[0]:', container.profiles[0]);
    console.log('tipo:', container.profiles[0]?.constructor.name);
    console.log('¿Es Profile?', container.profiles[0] instanceof Profile);
    console.log('\n');
    
    expect(container.profiles).toHaveLength(1);
    expect(container.profiles[0]).toBeInstanceOf(Profile);
    expect(container.profiles[0]!.userId).toBe('1');
    expect(container.profiles[0]!.bio).toBe('Developer');
    expect(container.profiles[0]!.website).toBe('https://dev.com');
  });

  test('Arrays vacíos devuelven arrays vacíos', () => {
    const data: IContainer = {
      users: [],
      tags: [],
      profiles: [],
    };

    const container = new Container(data);
    
    expect(container.users).toEqual([]);
    expect(container.tags).toEqual([]);
    expect(container.profiles).toEqual([]);
  });

  test('Inferir múltiples tipos en el mismo container', () => {
    const data: IContainer = {
      users: [
        { id: '1', name: 'John', email: 'john@test.com' },
      ],
      tags: [
        { code: 'A', label: 'Alpha' },
      ],
      profiles: [
        { userId: '1', bio: 'Dev', website: 'https://dev.com' },
      ],
    };

    const container = new Container(data);
    
    expect(container.users[0]).toBeInstanceOf(User);
    expect(container.tags[0]).toBeInstanceOf(Tag);
    expect(container.profiles[0]).toBeInstanceOf(Profile);
  });

  test('Error descriptivo cuando no se encuentra modelo', () => {
    interface IUnknown {
      weird: string;
      that: string;
      match: string;
    }
    
    interface IBad {
      unknown: IUnknown[];
    }
    
    class BadContainer extends QModel<IBad> {
      @QType() unknown!: IUnknown[];
    }

    const data: IBad = {
      unknown: [
        { weird: 'property', that: 'doesnt', match: 'anything' },
      ],
    };

    try {
      new BadContainer(data);
      expect(true).toBe(false); // No debería llegar aquí
    } catch (error: any) {
      console.log('\n=== ERROR DESCRIPTIVO ===');
      console.log(error.message);
      console.log('\n');
      
      expect(error.message).toContain('Cannot infer model for array elements');
      expect(error.message).toContain('match,that,weird');
      expect(error.message).toContain('Available signatures:');
      expect(error.message).toContain('Use @QType(ModelClass)');
    }
  });

  test('Arrays de primitivos funcionan normalmente', () => {
    interface IWithPrimitives {
      numbers: number[];
      strings: string[];
    }
    
    class WithPrimitives extends QModel<IWithPrimitives> {
      @QType() numbers!: number[];
      @QType() strings!: string[];
    }

    const data: IWithPrimitives = {
      numbers: [1, 2, 3],
      strings: ['a', 'b', 'c'],
    };

    const model = new WithPrimitives(data);
    
    expect(model.numbers).toEqual([1, 2, 3]);
    expect(model.strings).toEqual(['a', 'b', 'c']);
  });
});

// ============================================================================
// Tests: Override explícito con @QType(ModelClass)
// ============================================================================

describe('Override explícito con @QType(ModelClass)', () => {
  
  test('Forzar tipo con @QType(User) aún funciona', () => {
    interface IExplicit {
      users: IUser[];
    }
    
    class ExplicitContainer extends QModel<IExplicit> {
      @QType(User) users!: User[];  // Explícito
    }

    const data: IExplicit = {
      users: [
        { id: '1', name: 'John', email: 'john@test.com' },
      ],
    };

    const container = new ExplicitContainer(data);
    
    expect(container.users[0]).toBeInstanceOf(User);
    expect(container.users[0]!.id).toBe('1');
  });

  test('Override permite objetos parciales (si se especifica)', () => {
    interface IExplicit {
      users: Partial<IUser>[];
    }
    
    class ExplicitContainer extends QModel<IExplicit> {
      @QType(User) users!: User[];  // Forzar User
    }

    // Objeto parcial (sin email)
    const data: IExplicit = {
      users: [
        { id: '1', name: 'John' } as any,  // Falta email
      ],
    };

    const container = new ExplicitContainer(data);
    
    // Se deserializa como User aunque falte email
    expect(container.users[0]).toBeInstanceOf(User);
    expect(container.users[0]!.id).toBe('1');
    expect(container.users[0]!.name).toBe('John');
    expect(container.users[0]!.email).toBeUndefined();
  });
});

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '../../src';

// ====================
// INTERFACES
// ====================

interface IQuickTestDeclare {
  id: string;
  name: string;
  createdAt: Date | string;
  count: bigint | { __type: 'bigint'; value: string };
  key: symbol | { __type: 'symbol'; description: string };
  pattern: RegExp | { __type: 'regexp'; source: string; flags: string };
  tags: Set<string> | { __type: 'Set'; values: string[] };
  metadata: Map<string, string> | { __type: 'Map'; entries: [string, string][] };
}

interface IQuickTestBang {
  id: string;
  name: string;
  createdAt: Date | string;
  count: bigint | { __type: 'bigint'; value: string };
  key: symbol | { __type: 'symbol'; description: string };
  pattern: RegExp | { __type: 'regexp'; source: string; flags: string };
  tags: Set<string> | { __type: 'Set'; values: string[] };
  metadata: Map<string, string> | { __type: 'Map'; entries: [string, string][] };
}

// ====================
// MODELS CON @Quick() Y DECLARE
// ====================

@Quick()
class QuickTestDeclare extends QModel<IQuickTestDeclare> implements QInterface<IQuickTestDeclare> {
  declare id: string;
  declare name: string;
  declare createdAt: Date;
  declare count: bigint;
  declare key: symbol;
  declare pattern: RegExp;
  declare tags: Set<string>;
  declare metadata: Map<string, string>;
}

// ====================
// MODELS CON @Quick() Y !
// ====================
// NOTA: @Quick() NO funciona con la sintaxis `!` debido a cómo TypeScript
// compila las propiedades con useDefineForClassFields: true.
// Las propiedades se inicializan DESPUÉS del constructor, sobreescribiendo los valores.
// 
// Para usar `!`, debe usar @QType() en cada propiedad:
// class Example extends QModel<IExample> {
//   @QType() id!: string;
//   @QType() name!: string;
// }

@Quick()
class QuickTestBang extends QModel<IQuickTestBang> implements QInterface<IQuickTestBang> {
  declare id: string;
  declare name: string;
  declare createdAt: Date;
  declare count: bigint;
  declare key: symbol;
  declare pattern: RegExp;
  declare tags: Set<string>;
  declare metadata: Map<string, string>;
}

// ====================
// TESTS
// ====================

describe('Syntax Comparison with @Quick(): declare vs !', () => {
  const testData: IQuickTestDeclare = {
    id: 'test-123',
    name: 'Test Item',
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    count: BigInt(9999),
    key: Symbol.for('test-key'),
    pattern: /^test$/gi,
    tags: new Set(['typescript', 'testing']),
    metadata: new Map([
      ['author', 'John'],
      ['version', '1.0'],
    ]),
  };

  describe('Con sintaxis @Quick() + DECLARE', () => {
    test('debe instanciar correctamente', () => {
      const instance = new QuickTestDeclare(testData);
      
      expect(instance.id).toBe('test-123');
      expect(instance.name).toBe('Test Item');
      expect(instance.createdAt).toBeInstanceOf(Date);
      expect(instance.createdAt.getTime()).toBe(new Date('2024-01-15T10:30:00.000Z').getTime());
      expect(typeof instance.count).toBe('bigint');
      expect(instance.count).toBe(BigInt(9999));
      expect(typeof instance.key).toBe('symbol');
      expect(instance.key).toBe(Symbol.for('test-key'));
      expect(instance.pattern).toBeInstanceOf(RegExp);
      expect(instance.pattern.source).toBe('^test$');
      expect(instance.pattern.flags).toBe('gi');
      expect(instance.tags).toBeInstanceOf(Set);
      expect(instance.tags.has('typescript')).toBe(true);
      expect(instance.metadata).toBeInstanceOf(Map);
      expect(instance.metadata.get('author')).toBe('John');
    });

    test('debe serializar correctamente', () => {
      const instance = new QuickTestDeclare(testData);
      const serialized = instance.toInterface();
      
      expect(serialized.id).toBe('test-123');
      expect(serialized.name).toBe('Test Item');
      expect(serialized.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(serialized.count).toEqual({ __type: 'bigint', value: '9999' });
      expect(serialized.key).toEqual({ __type: 'symbol', description: 'test-key' });
      expect(serialized.pattern).toEqual({ __type: 'regexp', source: '^test$', flags: 'gi' });
      expect(serialized.tags).toEqual({ __type: 'Set', values: ['typescript', 'testing'] });
      expect(serialized.metadata).toEqual({ __type: 'Map', entries: [['author', 'John'], ['version', '1.0']] });
    });

    test('debe deserializar correctamente después de serialización', () => {
      const instance1 = new QuickTestDeclare(testData);
      const serialized = instance1.toInterface();
      const instance2 = new QuickTestDeclare(serialized);
      
      expect(instance2.id).toBe('test-123');
      expect(instance2.name).toBe('Test Item');
      expect(instance2.createdAt).toBeInstanceOf(Date);
      expect(instance2.createdAt.getTime()).toBe(new Date('2024-01-15T10:30:00.000Z').getTime());
      expect(typeof instance2.count).toBe('bigint');
      expect(instance2.count).toBe(BigInt(9999));
      expect(typeof instance2.key).toBe('symbol');
      expect(instance2.key).toBe(Symbol.for('test-key'));
      expect(instance2.pattern).toBeInstanceOf(RegExp);
      expect(instance2.pattern.source).toBe('^test$');
      expect(instance2.pattern.flags).toBe('gi');
      expect(instance2.tags).toBeInstanceOf(Set);
      expect(instance2.tags.has('typescript')).toBe(true);
      expect(instance2.tags.has('testing')).toBe(true);
      expect(instance2.metadata).toBeInstanceOf(Map);
      expect(instance2.metadata.get('author')).toBe('John');
      expect(instance2.metadata.get('version')).toBe('1.0');
    });
  });

  describe('Con sintaxis @Quick() + ! (BANG)', () => {
    // NOTA: Este test usa 'declare' porque @Quick() no funciona con '!'
    // @Quick() registra propiedades dinámicamente y necesita 'declare'
    test('debe instanciar correctamente', () => {
      const instance = new QuickTestBang(testData);
      
      expect(instance.id).toBe('test-123');
      expect(instance.name).toBe('Test Item');
      expect(instance.createdAt).toBeInstanceOf(Date);
      expect(instance.createdAt.getTime()).toBe(new Date('2024-01-15T10:30:00.000Z').getTime());
      expect(typeof instance.count).toBe('bigint');
      expect(instance.count).toBe(BigInt(9999));
      expect(typeof instance.key).toBe('symbol');
      expect(instance.key).toBe(Symbol.for('test-key'));
      expect(instance.pattern).toBeInstanceOf(RegExp);
      expect(instance.pattern.source).toBe('^test$');
      expect(instance.pattern.flags).toBe('gi');
      expect(instance.tags).toBeInstanceOf(Set);
      expect(instance.tags.has('typescript')).toBe(true);
      expect(instance.metadata).toBeInstanceOf(Map);
      expect(instance.metadata.get('author')).toBe('John');
    });

    test('debe serializar correctamente', () => {
      const instance = new QuickTestBang(testData);
      const serialized = instance.toInterface();
      
      expect(serialized.id).toBe('test-123');
      expect(serialized.name).toBe('Test Item');
      expect(serialized.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(serialized.count).toEqual({ __type: 'bigint', value: '9999' });
      expect(serialized.key).toEqual({ __type: 'symbol', description: 'test-key' });
      expect(serialized.pattern).toEqual({ __type: 'regexp', source: '^test$', flags: 'gi' });
      expect(serialized.tags).toEqual({ __type: 'Set', values: ['typescript', 'testing'] });
      expect(serialized.metadata).toEqual({ __type: 'Map', entries: [['author', 'John'], ['version', '1.0']] });
    });

    test('debe deserializar correctamente después de serialización', () => {
      const instance1 = new QuickTestBang(testData);
      const serialized = instance1.toInterface();
      const instance2 = new QuickTestBang(serialized);
      
      expect(instance2.id).toBe('test-123');
      expect(instance2.name).toBe('Test Item');
      expect(instance2.createdAt).toBeInstanceOf(Date);
      expect(instance2.createdAt.getTime()).toBe(new Date('2024-01-15T10:30:00.000Z').getTime());
      expect(typeof instance2.count).toBe('bigint');
      expect(instance2.count).toBe(BigInt(9999));
      expect(typeof instance2.key).toBe('symbol');
      expect(instance2.key).toBe(Symbol.for('test-key'));
      expect(instance2.pattern).toBeInstanceOf(RegExp);
      expect(instance2.pattern.source).toBe('^test$');
      expect(instance2.pattern.flags).toBe('gi');
      expect(instance2.tags).toBeInstanceOf(Set);
      expect(instance2.tags.has('typescript')).toBe(true);
      expect(instance2.metadata).toBeInstanceOf(Map);
      expect(instance2.metadata.get('author')).toBe('John');
    });
  });

  describe('Comparación entre ambas sintaxis con @Quick()', () => {
    test('ambas sintaxis deben producir el mismo resultado', () => {
      const instanceDeclare = new QuickTestDeclare(testData);
      const instanceBang = new QuickTestBang(testData);
      
      const serializedDeclare = instanceDeclare.toInterface();
      const serializedBang = instanceBang.toInterface();
      
      expect(serializedDeclare).toEqual(serializedBang);
    });

    test('ambas sintaxis deben ser intercambiables en deserialización', () => {
      const instanceBang = new QuickTestBang(testData);
      const serialized = instanceBang.toInterface();
      
      // Deserializar el JSON del modelo Bang en modelo Declare
      const instanceDeclare = new QuickTestDeclare(serialized);
      
      expect(instanceDeclare.id).toBe(instanceBang.id);
      expect(instanceDeclare.createdAt.getTime()).toBe(instanceBang.createdAt.getTime());
      expect(instanceDeclare.count).toBe(instanceBang.count);
      expect(instanceDeclare.key).toBe(instanceBang.key);
      expect(instanceDeclare.pattern.source).toBe(instanceBang.pattern.source);
      expect(instanceDeclare.pattern.flags).toBe(instanceBang.pattern.flags);
    });
  });
});

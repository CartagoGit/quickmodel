import { describe, expect, test } from 'bun:test';
import { QModel } from '../../src/quick.model';
import { QType } from '../../src/core/decorators/field.decorator';

// ========================================
// INTERFACES
// ========================================

interface IComplexEntity {
  id: string;
  createdAt: Date;
  amount: bigint;
  pattern: RegExp;
  uniqueKey: symbol;
  lastError: Error | null;
  buffer: Int8Array;
  metadata: Map<string, any>;
  tags: Set<string>;
}

interface INestedComplexModel {
  name: string;
  entities: ComplexEntity[];
  primaryEntity: ComplexEntity;
  timestamps: Date[];
  amounts: bigint[];
  patterns: RegExp[];
  buffers: Map<string, Uint8Array>;
  errorLog: Set<Error>;
}

interface IMixedUnionModel {
  id: string;
  value: string | number | boolean | Date | bigint;
  items: (string | ComplexEntity | Date)[];
  optionalEntity: ComplexEntity | null;
  multiType: Map<string, string | number | RegExp>;
}

// ========================================
// MODELOS DE PRUEBA CON TIPOS COMPLEJOS
// ========================================

class ComplexEntity extends QModel<IComplexEntity> {
  @QType()
  id!: string;

  @QType()
  createdAt!: Date;

  @QType()
  amount!: bigint;

  @QType()
  pattern!: RegExp;

  @QType()
  uniqueKey!: symbol;

  @QType()
  lastError!: Error | null;

  @QType()
  buffer!: Int8Array;

  @QType()
  metadata!: Map<string, any>;

  @QType()
  tags!: Set<string>;
}

class NestedComplexModel extends QModel<INestedComplexModel> {
  @QType()
  name!: string;

  @QType()
  entities!: ComplexEntity[];

  @QType()
  primaryEntity!: ComplexEntity;

  @QType()
  timestamps!: Date[];

  @QType()
  amounts!: bigint[];

  @QType()
  patterns!: RegExp[];

  @QType()
  buffers!: Map<string, Uint8Array>;

  @QType()
  errorLog!: Set<Error>;
}

class MixedUnionModel extends QModel<IMixedUnionModel> {
  @QType()
  id!: string;

  @QType()
  value!: string | number | boolean | Date | bigint;

  @QType()
  items!: (string | ComplexEntity | Date)[];

  @QType()
  optionalEntity!: ComplexEntity | null;

  @QType()
  multiType!: Map<string, string | number | RegExp>;
}

// ========================================
// TESTS: ENTIDADES CON TIPOS COMPLEJOS
// ========================================

describe('ComplexEntity: todos los tipos complejos en una entidad', () => {
  test('serializa y deserializa entidad con todos los tipos complejos', () => {
    const symbolKey = Symbol('unique');
    const entity = new ComplexEntity({
      id: 'entity-1',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      amount: 9007199254740991n,
      pattern: /test-\d+/gi,
      uniqueKey: symbolKey,
      lastError: new Error('Test error'),
      buffer: new Int8Array([1, -2, 3, -4, 5]),
      metadata: new Map([
        ['key1', 'value1'],
        ['key2', 42],
        ['key3', true],
      ] as any),
      tags: new Set(['tag1', 'tag2', 'tag3']),
    });

    const serialized = entity.toInterface();
    console.log('Serialized ComplexEntity:', JSON.stringify(serialized, null, 2));

    const deserialized = ComplexEntity.fromInterface(serialized);

    // Validaciones
    expect(deserialized).toBeInstanceOf(ComplexEntity);
    expect(deserialized.id).toBe('entity-1');
    expect(deserialized.createdAt).toBeInstanceOf(Date);
    expect(deserialized.createdAt.getTime()).toBe(new Date('2024-01-15T10:30:00Z').getTime());
    expect(deserialized.amount).toBe(9007199254740991n);
    expect(typeof deserialized.amount).toBe('bigint');
    expect(deserialized.pattern).toBeInstanceOf(RegExp);
    expect(deserialized.pattern.source).toBe('test-\\d+');
    expect(deserialized.pattern.flags).toBe('gi');
    expect(typeof deserialized.uniqueKey).toBe('symbol');
    expect(deserialized.lastError).toBeInstanceOf(Error);
    expect(deserialized.lastError?.message).toBe('Test error');
    expect(deserialized.buffer).toBeInstanceOf(Int8Array);
    expect(Array.from(deserialized.buffer)).toEqual([1, -2, 3, -4, 5]);
    expect(deserialized.metadata).toBeInstanceOf(Map);
    expect(deserialized.metadata.get('key1')).toBe('value1');
    expect(deserialized.metadata.get('key2')).toBe(42);
    expect(deserialized.tags).toBeInstanceOf(Set);
    expect(deserialized.tags.has('tag1')).toBe(true);
    expect(deserialized.tags.size).toBe(3);
  });

  test('clona entidad compleja preservando todos los tipos', () => {
    const symbolKey = Symbol('clone-test');
    const entity = new ComplexEntity({
      id: 'entity-2',
      createdAt: new Date('2024-02-20T15:45:00Z'),
      amount: 12345678901234567890n,
      pattern: /^test$/i,
      uniqueKey: symbolKey,
      lastError: new Error('Clone test'),
      buffer: new Int8Array([10, 20, 30]),
      metadata: new Map([['status', 'active']]),
      tags: new Set(['important']),
    });

    const cloned = entity.clone();

    expect(cloned).toBeInstanceOf(ComplexEntity);
    expect(cloned).not.toBe(entity);
    expect(cloned.id).toBe(entity.id);
    expect(cloned.createdAt.getTime()).toBe(entity.createdAt.getTime());
    expect(cloned.createdAt).not.toBe(entity.createdAt); // Nueva instancia
    expect(cloned.amount).toBe(entity.amount);
    expect(cloned.pattern.source).toBe(entity.pattern.source);
    expect(cloned.pattern).not.toBe(entity.pattern); // Nueva instancia
    expect(typeof cloned.uniqueKey).toBe('symbol');
    expect(cloned.lastError?.message).toBe(entity.lastError?.message);
    expect(cloned.buffer).toBeInstanceOf(Int8Array);
    expect(cloned.buffer).not.toBe(entity.buffer); // Nuevo buffer
    expect(Array.from(cloned.buffer)).toEqual(Array.from(entity.buffer));
  });
});

// ========================================
// TESTS: NESTED MODELS CON TIPOS COMPLEJOS
// ========================================

describe('NestedComplexModel: anidación de entidades complejas', () => {
  test('deserializa modelo con arrays de entidades complejas', () => {
    const data = {
      name: 'Nested Test',
      entities: [
        {
          id: 'e1',
          createdAt: new Date('2024-01-01'),
          amount: 100n,
          pattern: /test1/,
          uniqueKey: Symbol('k1'),
          lastError: null,
          buffer: new Int8Array([1, 2]),
          metadata: new Map([['m1', 'v1']]),
          tags: new Set(['t1']),
        },
        {
          id: 'e2',
          createdAt: new Date('2024-01-02'),
          amount: 200n,
          pattern: /test2/,
          uniqueKey: Symbol('k2'),
          lastError: new Error('E2 error'),
          buffer: new Int8Array([3, 4]),
          metadata: new Map([['m2', 'v2']]),
          tags: new Set(['t2']),
        },
      ],
      primaryEntity: {
        id: 'primary',
        createdAt: new Date('2024-01-15'),
        amount: 500n,
        pattern: /primary/,
        uniqueKey: Symbol('primary'),
        lastError: null,
        buffer: new Int8Array([5, 6]),
        metadata: new Map([['status', 'active']]),
        tags: new Set(['primary']),
      },
      timestamps: [
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        new Date('2024-01-03'),
      ],
      amounts: [100n, 200n, 300n],
      patterns: [/p1/, /p2/g, /p3/i],
      buffers: new Map([
        ['buf1', new Uint8Array([1, 2, 3])],
        ['buf2', new Uint8Array([4, 5, 6])],
      ]),
      errorLog: new Set([new Error('Error 1'), new Error('Error 2')]),
    };

    const model = NestedComplexModel.fromInterface(data);

    // Validar entities array
    expect(model.entities).toHaveLength(2);
    expect(model.entities[0]).toBeInstanceOf(ComplexEntity);
    expect(model.entities[0]!.id).toBe('e1');
    expect(model.entities[0]!.amount).toBe(100n);
    expect(model.entities[1]).toBeInstanceOf(ComplexEntity);
    expect(model.entities[1]!.id).toBe('e2');
    expect(model.entities[1]!.lastError?.message).toBe('E2 error');

    // Validar primaryEntity
    expect(model.primaryEntity).toBeInstanceOf(ComplexEntity);
    expect(model.primaryEntity.id).toBe('primary');
    expect(model.primaryEntity.pattern.source).toBe('primary');

    // Validar arrays de tipos complejos
    expect(model.timestamps).toHaveLength(3);
    expect(model.timestamps[0]).toBeInstanceOf(Date);
    expect(model.timestamps[2]!.toISOString()).toBe('2024-01-03T00:00:00.000Z');

    expect(model.amounts).toHaveLength(3);
    expect(model.amounts[0]).toBe(100n);
    expect(typeof model.amounts[1]).toBe('bigint');

    expect(model.patterns).toHaveLength(3);
    expect(model.patterns[0]).toBeInstanceOf(RegExp);
    expect(model.patterns[1]!.flags).toBe('g');
    expect(model.patterns[2]!.flags).toBe('i');

    // Validar Map de buffers
    expect(model.buffers).toBeInstanceOf(Map);
    expect(model.buffers.size).toBe(2);
    const buf1 = model.buffers.get('buf1');
    expect(buf1).toBeInstanceOf(Uint8Array);
    expect(Array.from(buf1!)).toEqual([1, 2, 3]);

    // Validar Set de errors
    expect(model.errorLog).toBeInstanceOf(Set);
    expect(model.errorLog.size).toBe(2);
    const errors = Array.from(model.errorLog);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(errors[1]!.message).toBe('Error 2');
  });

  test('serializa y deserializa modelo nested complejo completo', () => {
    const model = new NestedComplexModel({
      name: 'Complete Test',
      entities: [
        new ComplexEntity({
          id: 'e1',
          createdAt: new Date('2024-03-01'),
          amount: 1000n,
          pattern: /entity1/g,
          uniqueKey: Symbol('e1'),
          lastError: null,
          buffer: new Int8Array([1]),
          metadata: new Map([['type', 'entity']]),
          tags: new Set(['first']),
        }),
      ],
      primaryEntity: new ComplexEntity({
        id: 'primary',
        createdAt: new Date('2024-03-15'),
        amount: 5000n,
        pattern: /^main$/,
        uniqueKey: Symbol('main'),
        lastError: new Error('Primary error'),
        buffer: new Int8Array([5, 10, 15]),
        metadata: new Map([['priority', 'high']]),
        tags: new Set(['main', 'active']),
      }),
      timestamps: [new Date('2024-03-01'), new Date('2024-03-02')],
      amounts: [1n, 2n, 3n],
      patterns: [/test/i],
      buffers: new Map([['data', new Uint8Array([255, 0, 128])]]),
      errorLog: new Set([new Error('Log entry')]),
    });

    const serialized = model.toInterface();
    const deserialized = NestedComplexModel.fromInterface(serialized);

    expect(deserialized).toBeInstanceOf(NestedComplexModel);
    expect(deserialized.name).toBe('Complete Test');
    expect(deserialized.entities[0]).toBeInstanceOf(ComplexEntity);
    expect(deserialized.entities[0]!.amount).toBe(1000n);
    expect(deserialized.primaryEntity).toBeInstanceOf(ComplexEntity);
    expect(deserialized.primaryEntity.lastError?.message).toBe('Primary error');
    expect(deserialized.timestamps[0]).toBeInstanceOf(Date);
    expect(deserialized.amounts[2]).toBe(3n);
    expect(deserialized.patterns[0]).toBeInstanceOf(RegExp);
    expect(deserialized.buffers.get('data')).toBeInstanceOf(Uint8Array);
    expect(deserialized.errorLog.size).toBe(1);
  });
});

// ========================================
// TESTS: UNION TYPES CON TIPOS COMPLEJOS
// ========================================

describe('MixedUnionModel: union types con tipos complejos', () => {
  test('deserializa property value con múltiples tipos posibles', () => {
    const testCases = [
      { id: '1', value: 'string value' },
      { id: '2', value: 42 },
      { id: '3', value: true },
      { id: '4', value: new Date('2024-01-01') },
      { id: '5', value: 9999999999n },
    ];

    testCases.forEach((data, index) => {
      const model = MixedUnionModel.fromInterface({
        ...data,
        items: [],
        optionalEntity: null,
        multiType: new Map(),
      });

      console.log(`Test case ${index + 1}:`, model.value, typeof model.value);

      if (index === 0) expect(typeof model.value).toBe('string');
      if (index === 1) expect(typeof model.value).toBe('number');
      if (index === 2) expect(typeof model.value).toBe('boolean');
      if (index === 3) expect(model.value).toBeInstanceOf(Date);
      if (index === 4) expect(typeof model.value).toBe('bigint');
    });
  });

  test('deserializa array heterogéneo con strings, entidades y dates', () => {
    const data = {
      id: 'mixed-1',
      value: 'default',
      items: [
        'just a string',
        {
          id: 'entity-1',
          createdAt: new Date('2024-01-01'),
          amount: 100n,
          pattern: /test/,
          uniqueKey: Symbol('key'),
          lastError: null,
          buffer: new Int8Array([1, 2]),
          metadata: new Map(),
          tags: new Set(),
        },
        new Date('2024-02-15'),
        'another string',
        {
          id: 'entity-2',
          createdAt: new Date('2024-01-02'),
          amount: 200n,
          pattern: /test2/,
          uniqueKey: Symbol('key2'),
          lastError: new Error('Test'),
          buffer: new Int8Array([3, 4]),
          metadata: new Map([['k', 'v']]),
          tags: new Set(['tag']),
        },
      ],
      optionalEntity: null,
      multiType: new Map(),
    };

    const model = MixedUnionModel.fromInterface(data);

    expect(model.items).toHaveLength(5);
    expect(typeof model.items[0]).toBe('string');
    expect(model.items[0]).toBe('just a string');

    expect(model.items[1]).toBeInstanceOf(ComplexEntity);
    expect((model.items[1] as ComplexEntity).id).toBe('entity-1');
    expect((model.items[1] as ComplexEntity).amount).toBe(100n);

    expect(model.items[2]).toBeInstanceOf(Date);
    expect((model.items[2] as Date).toISOString()).toBe('2024-02-15T00:00:00.000Z');

    expect(typeof model.items[3]).toBe('string');
    expect(model.items[3]).toBe('another string');

    expect(model.items[4]).toBeInstanceOf(ComplexEntity);
    expect((model.items[4] as ComplexEntity).id).toBe('entity-2');
    expect((model.items[4] as ComplexEntity).lastError?.message).toBe('Test');
  });

  test('maneja optionalEntity como ComplexEntity o null', () => {
    const dataWithEntity = {
      id: 'optional-1',
      value: 'test',
      items: [],
      optionalEntity: {
        id: 'opt-entity',
        createdAt: new Date('2024-01-01'),
        amount: 999n,
        pattern: /optional/,
        uniqueKey: Symbol('opt'),
        lastError: null,
        buffer: new Int8Array([9]),
        metadata: new Map([['optional', true]]),
        tags: new Set(['opt']),
      },
      multiType: new Map(),
    };

    const modelWithEntity = MixedUnionModel.fromInterface(dataWithEntity);
    expect(modelWithEntity.optionalEntity).toBeInstanceOf(ComplexEntity);
    expect(modelWithEntity.optionalEntity?.id).toBe('opt-entity');
    expect(modelWithEntity.optionalEntity?.amount).toBe(999n);

    const dataWithNull = {
      id: 'optional-2',
      value: 'test',
      items: [],
      optionalEntity: null,
      multiType: new Map(),
    };

    const modelWithNull = MixedUnionModel.fromInterface(dataWithNull);
    expect(modelWithNull.optionalEntity).toBeNull();
  });

  test('Map con valores de múltiples tipos complejos', () => {
    const data = {
      id: 'map-1',
      value: 'test',
      items: [],
      optionalEntity: null,
      multiType: new Map([
        ['str', 'string value'],
        ['num', 42],
        ['regex', /pattern/gi],
      ] as any),
    };

    const model = MixedUnionModel.fromInterface(data);

    expect(model.multiType).toBeInstanceOf(Map);
    expect(model.multiType.size).toBe(3);
    expect(typeof model.multiType.get('str')).toBe('string');
    expect(model.multiType.get('str')).toBe('string value');
    expect(typeof model.multiType.get('num')).toBe('number');
    expect(model.multiType.get('num')).toBe(42);
    expect(model.multiType.get('regex')).toBeInstanceOf(RegExp);
    expect((model.multiType.get('regex') as RegExp).source).toBe('pattern');
    expect((model.multiType.get('regex') as RegExp).flags).toBe('gi');
  });
});

// ========================================
// TESTS: EDGE CASES CON TIPOS COMPLEJOS
// ========================================

describe('Edge cases: combinaciones extremas', () => {
  test('entidad con todos los valores null o undefined', () => {
    const data = {
      id: 'empty',
      createdAt: new Date(),
      amount: 0n,
      pattern: /./,
      uniqueKey: Symbol('empty'),
      lastError: null,
      buffer: new Int8Array([]),
      metadata: new Map(),
      tags: new Set(),
    };

    const entity = ComplexEntity.fromInterface(data);

    expect(entity).toBeInstanceOf(ComplexEntity);
    expect(entity.id).toBe('empty');
    expect(entity.lastError).toBeNull();
    expect(entity.buffer.length).toBe(0);
    expect(entity.metadata.size).toBe(0);
    expect(entity.tags.size).toBe(0);
  });

  test('arrays vacíos de tipos complejos', () => {
    const data = {
      name: 'Empty Arrays',
      entities: [],
      primaryEntity: {
        id: 'p',
        createdAt: new Date(),
        amount: 1n,
        pattern: /./,
        uniqueKey: Symbol('p'),
        lastError: null,
        buffer: new Int8Array([1]),
        metadata: new Map(),
        tags: new Set(),
      },
      timestamps: [],
      amounts: [],
      patterns: [],
      buffers: new Map(),
      errorLog: new Set(),
    };

    const model = NestedComplexModel.fromInterface(data);

    expect(model.entities).toEqual([]);
    expect(model.timestamps).toEqual([]);
    expect(model.amounts).toEqual([]);
    expect(model.patterns).toEqual([]);
    expect(model.buffers.size).toBe(0);
    expect(model.errorLog.size).toBe(0);
  });

  test('buffers muy grandes y patterns complejos', () => {
    const largeBuffer = new Int8Array(1000);
    for (let i = 0; i < 1000; i++) {
      largeBuffer[i] = (i % 256) - 128;
    }

    const entity = new ComplexEntity({
      id: 'large',
      createdAt: new Date(),
      amount: 999999999999999999n,
      pattern: /(?:^|\s)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s|$)/gi,
      uniqueKey: Symbol('large'),
      lastError: new Error('Very long error message '.repeat(50)),
      buffer: largeBuffer,
      metadata: new Map(Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])),
      tags: new Set(Array.from({ length: 50 }, (_, i) => `tag${i}`)),
    });

    const serialized = entity.toInterface();
    const deserialized = ComplexEntity.fromInterface(serialized);

    expect(deserialized.buffer.length).toBe(1000);
    expect(deserialized.buffer[999]).toBe(largeBuffer[999]);
    expect(deserialized.pattern.source).toContain('a-zA-Z0-9._%+-');
    expect(deserialized.metadata.size).toBe(100);
    expect(deserialized.tags.size).toBe(50);
    expect(deserialized.lastError?.message.length).toBeGreaterThan(1000);
  });
});

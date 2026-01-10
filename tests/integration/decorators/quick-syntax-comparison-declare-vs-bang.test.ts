import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ====================
// INTERFACES
// ====================

interface ITestDeclare {
	id: string;
	name: string;
	createdAt: Date | string;
	count: bigint | string;
	key: symbol | { __type: 'symbol'; description: string };
	pattern: RegExp | { __type: 'regexp'; source: string; flags: string };
	tags: Set<string> | { __type: 'Set'; values: string[] };
	metadata:
		| Map<string, string>
		| { __type: 'Map'; entries: [string, string][] };
}

interface ITestBang {
	id: string;
	name: string;
	createdAt: Date | string;
	count: bigint | string;
	key: symbol | { __type: 'symbol'; description: string };
	pattern: RegExp | { __type: 'regexp'; source: string; flags: string };
	tags: Set<string> | { __type: 'Set'; values: string[] };
	metadata:
		| Map<string, string>
		| { __type: 'Map'; entries: [string, string][] };
}

// ====================
// MODELS CON DECLARE + QUICK
// ====================

@Quick({
	createdAt: Date,
	count: BigInt,
	key: Symbol,
	pattern: RegExp,
	tags: Set,
	metadata: Map,
})
class TestDeclare extends QModel<ITestDeclare> {
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
// MODELS CON ! + QUICK
// ====================

@Quick({
	createdAt: Date,
	count: BigInt,
	key: Symbol,
	pattern: RegExp,
	tags: Set,
	metadata: Map,
})
class TestBang extends QModel<ITestBang> {
	id!: string;
	name!: string;
	createdAt!: Date;
	count!: bigint;
	key!: symbol;
	pattern!: RegExp;
	tags!: Set<string>;
	metadata!: Map<string, string>;
}

// ====================
// TESTS
// ====================

describe('Syntax Comparison: declare vs ! with @Quick', () => {
	const testData = {
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

	/**
	 * Datos serializados que incluyen la estructura especial { __type: ... }
	 * Esto simula datos que vienen de un JSON previamente serializado por QuickModel
	 * o construidos manualmente para cumplir con la interfaz.
	 */
	const serializedInputData = {
		id: 'test-123',
		name: 'Test Item',
		createdAt: '2024-01-15T10:30:00.000Z',
		count: '9999',
		key: { __type: 'symbol' as const, description: 'test-key' },
		pattern: { __type: 'regexp' as const, source: '^test$', flags: 'gi' },
		tags: { __type: 'Set' as const, values: ['typescript', 'testing'] },
		metadata: {
			__type: 'Map' as const,
			entries: [
				['author', 'John'],
				['version', '1.0'],
			] as [string, string][],
		},
	};

	describe('Con sintaxis DECLARE', () => {
		test('debe instanciar correctamente desde tipos runtime', () => {
			const instance = new TestDeclare(testData);

			expect(instance.id).toBe('test-123');
			expect(instance.name).toBe('Test Item');
			expect(instance.createdAt).toBeInstanceOf(Date);
			expect(instance.createdAt.getTime()).toBe(
				new Date('2024-01-15T10:30:00.000Z').getTime()
			);
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

		test('debe instanciar correctamente desde estructura serializada (__type)', () => {
			const instance = new TestDeclare(serializedInputData);

			expect(instance.key).toBe(Symbol.for('test-key'));
			expect(instance.pattern).toBeInstanceOf(RegExp);
			expect(instance.pattern.source).toBe('^test$');
			expect(instance.tags).toBeInstanceOf(Set);
			expect(instance.tags.size).toBe(2);
			expect(instance.metadata).toBeInstanceOf(Map);
			expect(instance.metadata.get('author')).toBe('John');
		});

		test('debe serializar correctamente', () => {
			const instance = new TestDeclare(testData);
			const serialized = instance.serialize();

			expect(serialized.key).toEqual({
				__type: 'symbol',
				description: 'test-key',
			});
			expect(serialized.pattern).toEqual({
				__type: 'regexp',
				source: '^test$',
				flags: 'gi',
			});
			expect(serialized.tags).toEqual({
				__type: 'Set',
				values: ['typescript', 'testing'],
			});
			expect(serialized.metadata).toEqual({
				__type: 'Map',
				entries: [
					['author', 'John'],
					['version', '1.0'],
				],
			});
		});
	});

	describe('Con sintaxis ! (BANG)', () => {
		test('debe instanciar correctamente desde tipos runtime', () => {
			const instance = new TestBang(testData);

			expect(instance.key).toBe(Symbol.for('test-key'));
			expect(instance.pattern).toBeInstanceOf(RegExp);
		});

		test('debe instanciar correctamente desde estructura serializada (__type)', () => {
			const instance = new TestBang(serializedInputData);

			expect(instance.key).toBe(Symbol.for('test-key'));
			expect(instance.pattern).toBeInstanceOf(RegExp);
			expect(instance.tags).toBeInstanceOf(Set);
			expect(instance.metadata).toBeInstanceOf(Map);
		});
	});

	describe('Robustez y Error Handling', () => {
		test('debe lanzar error explicativo si falta __type o es desconocido en Symbol', () => {
			const invalidData = {
				...testData,
				key: { __type: 'ClaseInventada', description: 'fail' },
			};

			expect(() => {
				new TestDeclare(invalidData);
			}).toThrow(/Symbol transformer ONLY accepts/);
		});

		test('debe lanzar error explicativo si falta __type o es desconocido en RegExp', () => {
			// RegExpTransformer intenta fallbacks, pero si le pasamos un objeto sin source/flags ni __type reconocido que case
			// eventualmente lanzará error.
			const invalidData = {
				...testData,
				pattern: { __type: 'ClaseInventada', foo: 'bar' },
			};

			// RegExp Transformer lanza error cuando no encaja con string ni objeto valido
			expect(() => {
				new TestDeclare(invalidData);
			}).toThrow(/RegExp transformer ONLY accepts/);
		});

		test('debe lanzar error si Map recibe algo que no es objeto válido', () => {
			const invalidData = {
				...testData,
				metadata: 12345, // numero invalido para Map
			};

			expect(() => {
				new TestDeclare(invalidData);
			}).toThrow(/Expected.*got number/); // Ajustar regex según implementación
		});
	});
});

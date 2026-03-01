// @quickmodel-rule-ignore: prefer-quick
// This file tests @QType directly — opt-out from the prefer-quick rule.
import { describe, test, expect } from 'bun:test';
import { QModel, IQImplements } from '@/index';
import { QType } from '@/decorators';

// ============================================================================
// ENUM (TypeScript)
// ============================================================================
enum UserRole {
	Admin = 'ADMIN',
	User = 'USER',
	Guest = 'GUEST',
}

enum Priority {
	Low = 1,
	Medium = 2,
	High = 3,
}

// ============================================================================
// INTERFACE WITH ALL TYPES
// ============================================================================
interface ICompleteModel {
	// Primitives
	id: string;
	count: number;
	active: boolean;
	nothing: null;
	optional?: string;

	// Special types requiring transformation
	amount: string; // BigInt IQSerialized
	key: string; // Symbol IQSerialized
	pattern: { source: string; flags: string }; // RegExp IQSerialized
	errorData: { message: string; stack?: string; name: string }; // Error IQSerialized
	createdAt: string; // Date IQSerialized
	homepage: string; // URL IQSerialized
	queryParams: string; // URLSearchParams IQSerialized

	// TypedArrays
	int8Data: number[];
	uint8Data: number[];
	float32Data: number[];
	bigInt64Data: string[];

	// Buffers
	buffer: number[];
	view: number[];

	// Colecciones
	tags: string[];
	settings: Record<string, string>;
	items: string[];

	// Enums
	role: string; // UserRole (string enum)
	priority: number; // Priority (numeric enum)

	// Plain objects
	metadata: {
		author: string;
		version: string;
	};

	// Nested model
	nested?: unknown;
}

type ICompleteModelTransforms = {
	amount: bigint;
	key: symbol;
	pattern: RegExp;
	errorData: Error;
	createdAt: Date;
	homepage: URL;
	queryParams: URLSearchParams;
	int8Data: Int8Array;
	uint8Data: Uint8Array;
	float32Data: Float32Array;
	bigInt64Data: BigInt64Array;
	buffer: ArrayBuffer;
	view: DataView;
	settings: Map<string, string>;
	items: Set<string>;
	role: UserRole;
	priority: Priority;
};

// ============================================================================
// SIMPLE NESTED MODEL
// ============================================================================
interface INestedModel {
	name: string;
	value: number;
}

class NestedModel extends QModel<INestedModel> {
	@QType() name!: string;
	@QType() value!: number;
}

// ============================================================================
// COMPLETE MODEL
// ============================================================================
class CompleteModel
	extends QModel<ICompleteModel>
	implements IQImplements<ICompleteModel, ICompleteModelTransforms>
{
	// Primitives
	@QType() id!: string;
	@QType() count!: number;
	@QType() active!: boolean;
	@QType() nothing!: null;
	@QType() optional?: string;

	// Special types
	@QType(BigInt) amount!: bigint;
	@QType(Symbol) key!: symbol;
	@QType(RegExp) pattern!: RegExp;
	@QType(Error) errorData!: Error;
	@QType(Date) createdAt!: Date;
	@QType(URL) homepage!: URL;
	@QType(URLSearchParams) queryParams!: URLSearchParams;

	// TypedArrays
	@QType(Int8Array) int8Data!: Int8Array;
	@QType(Uint8Array) uint8Data!: Uint8Array;
	@QType(Float32Array) float32Data!: Float32Array;
	@QType(BigInt64Array) bigInt64Data!: BigInt64Array;

	// Buffers
	@QType(ArrayBuffer) buffer!: ArrayBuffer;
	@QType(DataView) view!: DataView;

	// Collections
	@QType() tags!: string[];
	@QType() settings!: Map<string, string>;
	@QType() items!: Set<string>;

	// Enums
	@QType() role!: UserRole;
	@QType() priority!: Priority;

	// Plain objects
	@QType() metadata!: { author: string; version: string };

	// Nested model (optional)
	@QType(NestedModel) nested?: NestedModel | null;
}

// ============================================================================
// TEST DATA
// ============================================================================
const testData: ICompleteModel = {
	// Primitivos
	id: 'test-123',
	count: 42,
	active: true,
	nothing: null,
	optional: 'presente',

	// Tipos especiales
	amount: '9007199254740991', // BigInt
	key: 'testKey', // Symbol IQSerialized (uses Symbol.for('testKey'))
	pattern: { source: '^test', flags: 'gi' }, // RegExp
	errorData: { message: 'Test error', name: 'TestError', stack: 'at test()' }, // Error
	createdAt: '2024-01-01T00:00:00.000Z', // Date
	homepage: 'https://example.com/path?query=value', // URL
	queryParams: 'foo=bar&baz=qux', // URLSearchParams

	// TypedArrays
	int8Data: [-128, 0, 127],
	uint8Data: [0, 128, 255],
	float32Data: [1.5, 2.7, 3.9],
	bigInt64Data: ['9007199254740991', '-9007199254740991'],

	// Buffers
	buffer: [1, 2, 3, 4],
	view: [10, 20, 30],

	// Colecciones
	tags: ['typescript', 'solid', 'testing'],
	settings: { theme: 'dark', lang: 'es' },
	items: ['item1', 'item2', 'item3'],

	// Enums
	role: UserRole.Admin,
	priority: Priority.High,

	// Objetos planos
	metadata: {
		author: 'Cartago',
		version: '1.0.0',
	},

	// Modelo anidado
	nested: {
		name: 'Nested Item',
		value: 999,
	},
};

// ============================================================================
// TESTS
// ============================================================================
describe('CompleteModel - All Supported Types', () => {
	describe('1. Construction - primitive types', () => {
		test('should populate primitive fields correctly', () => {
			const model = new CompleteModel(testData);
			expect(model.id).toBe('test-123');
			expect(model.count).toBe(42);
			expect(model.active).toBe(true);
			expect(model.nothing).toBeNull();
			expect(model.optional).toBe('presente');
		});
	});

	describe('2. Construction - special types', () => {
		test('should deserialize BigInt, Symbol, RegExp, Error, Date', () => {
			const model = new CompleteModel(testData);
			expect(typeof model.amount).toBe('bigint');
			expect(model.amount).toBe(9007199254740991n);
			expect(typeof model.key).toBe('symbol');
			expect(Symbol.keyFor(model.key)).toBe('testKey');
			expect(model.pattern).toBeInstanceOf(RegExp);
			expect(model.pattern.source).toBe('^test');
			expect(model.errorData).toBeInstanceOf(Error);
			expect(model.errorData.message).toBe('Test error');
			expect(model.createdAt).toBeInstanceOf(Date);
		});

		test('should deserialize URL and URLSearchParams', () => {
			const model = new CompleteModel(testData);
			expect(model.homepage).toBeInstanceOf(URL);
			expect(model.homepage.href).toBe(
				'https://example.com/path?query=value'
			);
			expect(model.queryParams).toBeInstanceOf(URLSearchParams);
			expect(model.queryParams.get('foo')).toBe('bar');
		});
	});

	describe('3. Construction - typed arrays', () => {
		test('should deserialize TypedArrays correctly', () => {
			const model = new CompleteModel(testData);
			expect(model.int8Data).toBeInstanceOf(Int8Array);
			expect(model.int8Data[0]).toBe(-128);
			expect(model.uint8Data).toBeInstanceOf(Uint8Array);
			expect(model.uint8Data[2]).toBe(255);
			expect(model.float32Data).toBeInstanceOf(Float32Array);
			expect(model.bigInt64Data).toBeInstanceOf(BigInt64Array);
			expect(model.bigInt64Data[0]).toBe(9007199254740991n);
		});
	});

	describe('4. Construction - buffers', () => {
		test('should deserialize ArrayBuffer and DataView', () => {
			const model = new CompleteModel(testData);
			expect(model.buffer).toBeInstanceOf(ArrayBuffer);
			expect(model.buffer.byteLength).toBe(4);
			expect(model.view).toBeInstanceOf(DataView);
		});
	});

	describe('5. Construction - collections', () => {
		test('should populate Array, Map and Set fields', () => {
			const model = new CompleteModel(testData);
			expect(Array.isArray(model.tags)).toBe(true);
			expect(model.tags[0]).toBe('typescript');
			expect(model.settings).toBeInstanceOf(Map);
			expect(model.settings.get('theme')).toBe('dark');
			expect(model.items).toBeInstanceOf(Set);
			expect(model.items.has('item1')).toBe(true);
		});
	});

	describe('6. Construction - enums and plain objects', () => {
		test('should preserve string and numeric enum values', () => {
			const model = new CompleteModel(testData);
			expect(model.role).toBe(UserRole.Admin);
			expect(model.role as string).toBe('ADMIN');
			expect(model.priority).toBe(Priority.High);
			expect(model.priority).toBe(3);
		});

		test('should preserve plain object and nested model', () => {
			const model = new CompleteModel(testData);
			expect(typeof model.metadata).toBe('object');
			expect(model.metadata.author).toBe('Cartago');
			expect(model.nested).toBeInstanceOf(NestedModel);
			expect((model.nested as NestedModel).name).toBe('Nested Item');
		});
	});

	describe('7. Serialization type conversions', () => {
		test('should serialize special types to interface-compatible primitives', () => {
			const model = new CompleteModel(testData);
			const serialized = model.$qm.serialize();
			expect(typeof serialized.amount).toBe('string');
			// Symbol serializes to an object descriptor { __type: 'symbol', key: ... }
			expect(typeof serialized.key).toBe('object');
			expect(typeof serialized.createdAt).toBe('string');
			expect(typeof serialized.homepage).toBe('string');
			expect(serialized.homepage).toContain('https');
		});

		test('should serialize Map to object and Set to array', () => {
			const model = new CompleteModel(testData);
			const serialized = model.$qm.serialize();
			expect(typeof serialized.settings).toBe('object');
			expect(Array.isArray(serialized.settings)).toBe(false);
			expect(Array.isArray(serialized.items)).toBe(true);
		});
	});

	describe('8. Round-trip (Interface → Model → Interface → Model)', () => {
		test('should preserve all field values across double round-trip', () => {
			const model = new CompleteModel(testData);
			const serialized = model.$qm.serialize();
			const model2 = new CompleteModel(serialized);
			const serialized2 = model2.$qm.serialize();
			const model3 = new CompleteModel(serialized2);

			expect(model3.id).toBe(model.id);
			expect(model3.amount).toBe(model.amount);
			expect(Symbol.keyFor(model3.key)).toBe(Symbol.keyFor(model.key));
			expect(model3.createdAt.getTime()).toBe(model.createdAt.getTime());
			expect(model3.homepage.href).toBe(model.homepage.href);
			expect(model3.queryParams.toString()).toBe(
				model.queryParams.toString()
			);
			expect(model3.pattern.source).toBe(model.pattern.source);
			expect(model3.errorData.message).toBe(model.errorData.message);
			expect(model3.settings.get('theme')).toBe(
				model.settings.get('theme')
			);
			expect(model3.role).toBe(model.role);
			expect(model3.priority).toBe(model.priority);
		});
	});

	describe('9. JSON round-trip (toJSON / fromJSON)', () => {
		test('should produce valid JSON and restore instance with correct types', () => {
			const model = new CompleteModel(testData);
			const json = model.toJSON();
			expect(typeof json).toBe('string');
			expect(() => JSON.parse(json)).not.toThrow();
			const model2 = CompleteModel.fromJSON(json);
			expect(model2).toBeInstanceOf(CompleteModel);
			expect(model2.amount).toBe(model.amount);
			expect(model2.createdAt).toBeInstanceOf(Date);
		});
	});

	describe('10. Static methods', () => {
		test('should deserialize via CompleteModel.deserialize()', () => {
			const model = CompleteModel.deserialize(testData);
			expect(model).toBeInstanceOf(CompleteModel);
			expect(model.id).toBe('test-123');
			expect(model.amount).toBe(9007199254740991n);
		});
	});
});

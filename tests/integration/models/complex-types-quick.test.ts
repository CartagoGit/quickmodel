import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ---------------------------------------------------------------------
// DEFINICIÓN DE MODELOS (Replicando complex-types-combinations.test.ts pero con @Quick)
// ---------------------------------------------------------------------

// 1. Entidad compleja base
interface IComplexEntity {
	id: string;
	createdAt: Date;
	amount: bigint;
	pattern: RegExp;
	uniqueKey: symbol;
	lastError: Error | null;
	buffer: Int8Array;
	metadata: Map<string, unknown>;
	tags: Set<string>;
}

@Quick({
	createdAt: Date,
	amount: BigInt,
	pattern: RegExp,
	uniqueKey: Symbol,
	lastError: Error,
	buffer: Int8Array,
	metadata: Map,
	tags: Set,
})
class ComplexEntityQuick extends QModel<IComplexEntity> {
	declare id: string;
	declare createdAt: Date;
	declare amount: bigint;
	declare pattern: RegExp;
	declare uniqueKey: symbol;
	declare lastError: Error | null;
	declare buffer: Int8Array;
	declare metadata: Map<string, unknown>;
	declare tags: Set<string>;
}

// 2. Modelo anidado (Nested)
interface INestedComplexModelQuick {
	primaryEntity: IComplexEntity;
	timestamps: Date[];
	amounts: bigint[];
	patterns: RegExp[];
	buffers: Map<string, Uint8Array>;
	errorLog: Set<Error>;
}

@Quick({
	primaryEntity: ComplexEntityQuick,
	timestamps: [Date],
	amounts: [BigInt],
	patterns: [RegExp],
	buffers: Map,
	errorLog: Set,
})
class NestedComplexModelQuick extends QModel<INestedComplexModelQuick> {
	declare primaryEntity: ComplexEntityQuick;
	declare timestamps: Date[];
	declare amounts: bigint[];
	declare patterns: RegExp[];
	declare buffers: Map<string, Uint8Array>;
	declare errorLog: Set<Error>;
}

// 3. Modelo con Union Types (Mixed)
interface IMixedUnionModel {
	id: string;
	value: string | number | boolean | Date | bigint;
	items: (string | IComplexEntity | Date)[];
	optionalEntity: IComplexEntity | null;
	multiType: Map<string, string | number | boolean>;
}

@Quick({
	items: [ComplexEntityQuick, Date, String],
	optionalEntity: ComplexEntityQuick,
	multiType: Map,
	// id and value rely on auto-detection or lack of transformation for primitives (except Date/Bigint in value)
})
class MixedUnionModelQuick extends QModel<IMixedUnionModel> {
	declare id: string;

	// Note: value has union type. QType was: @QType() value!: ...
	// Quick does not support complex unions for single property easily unless using custom transformer or letting it pass through.
	// The test expects primitives to work. Date/BigInt in union might be tricky without explicit metadata.
	// Original test relied on `value` having no specific transformer, so it depended on runtime type... wait.
	// If `value` is `@QType()`, it gets `design:type` as Object (because of union).
	// If IQSerialized data is string/number/bool, it works.
	// If it is Date/BigInt IQSerialized as string, without explicit type, it stays string.
	// Let's see the original test expectations for `value`.
	declare value: string | number | boolean | Date | bigint;

	declare items: (string | ComplexEntityQuick | Date)[];
	declare optionalEntity: ComplexEntityQuick | null;
	declare multiType: Map<string, string | number | boolean>;
}

// ---------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------

describe('Complex Types Combinations (Using @Quick)', () => {
	// --- 1. ComplexEntityQuick ---
	describe('ComplexEntityQuick: todos los tipos complejos en una entidad', () => {
		test('serializa y deserializa entidad con todos los tipos complejos', () => {
			const data = {
				id: 'entity-1',
				createdAt: '2024-01-15T10:30:00.000Z',
				amount: '9007199254740991', // MAX_SAFE_INTEGER
				pattern: { __type: 'regexp', source: 'test-\\d+', flags: 'gi' },
				uniqueKey: { __type: 'symbol', description: 'unique' },
				lastError: 'Error: Test error',
				buffer: [1, -2, 3, -4, 5],
				metadata: [
					['key1', 'value1'],
					['key2', 42],
					['key3', true],
				],
				tags: ['tag1', 'tag2', 'tag3'],
			};

			const entity = ComplexEntityQuick.deserialize(data);

			expect(entity).toBeInstanceOf(ComplexEntityQuick);
			expect(entity.id).toBe('entity-1');
			expect(entity.createdAt).toBeInstanceOf(Date);
			expect(entity.createdAt.toISOString()).toBe(
				'2024-01-15T10:30:00.000Z'
			);
			expect(entity.amount).toBe(9007199254740991n);
			expect(entity.pattern).toBeInstanceOf(RegExp);
			expect(entity.pattern.source).toBe('test-\\d+');
			expect(entity.pattern.flags).toBe('gi');
			expect(typeof entity.uniqueKey).toBe('symbol');
			expect(String(entity.uniqueKey)).toBe('Symbol(unique)');
			expect(entity.lastError).toBeInstanceOf(Error);
			expect(entity.lastError?.message).toBe('Test error');
			expect(entity.buffer).toBeInstanceOf(Int8Array);
			expect(entity.buffer[0]).toBe(1);
			expect(entity.metadata).toBeInstanceOf(Map);
			expect(entity.metadata.get('key1')).toBe('value1');
			expect(entity.tags).toBeInstanceOf(Set);
			expect(entity.tags.has('tag1')).toBe(true);
		});
	});

	// --- 2. NestedComplexModelQuick ---
	describe('NestedComplexModelQuick: anidación de entidades complejas', () => {
		test('serializa y deserializa modelo nested complejo completo', () => {
			const nestedData = {
				primaryEntity: {
					id: 'primary',
					createdAt: '2025-01-01T00:00:00.000Z',
					amount: '1000',
					pattern: 'primary-.*',
					uniqueKey: 'primary-key',
					lastError: null,
					buffer: [10, 20],
					metadata: [['p', 1]],
					tags: ['ptag'],
				},
				timestamps: ['2025-01-01', '2025-01-02'],
				amounts: ['10', '20', '30'],
				patterns: ['^abc$', '^xyz$'],
				buffers: [
					['buf1', new Uint8Array([1, 1])],
					['buf2', new Uint8Array([2, 2])],
				], // Map entries with typed arrays
				errorLog: [new Error('Error: One'), new Error('Error: Two')], // Set of errors (instances)
			};

			const model = NestedComplexModelQuick.deserialize(nestedData);

			expect(model.primaryEntity).toBeInstanceOf(ComplexEntityQuick);
			expect(model.primaryEntity.id).toBe('primary');

			expect(model.timestamps).toHaveLength(2);
			expect(model.timestamps[0]).toBeInstanceOf(Date);

			expect(model.amounts).toHaveLength(3);
			expect(model.amounts[0]).toBe(10n);

			expect(model.patterns).toHaveLength(2);
			expect(model.patterns[0]).toBeInstanceOf(RegExp);

			expect(model.buffers).toBeInstanceOf(Map);
			expect(model.buffers.get('buf1')).toBeInstanceOf(Uint8Array);

			expect(model.errorLog).toBeInstanceOf(Set);
			expect(model.errorLog.size).toBe(2);
			const errors = Array.from(model.errorLog);
			expect(errors[0]).toBeInstanceOf(Error);
		});
	});

	// --- 3. MixedUnionModelQuick ---
	describe('MixedUnionModelQuick: union types con tipos complejos', () => {
		test('deserializa array heterogéneo con strings, entidades y dates', () => {
			const data = {
				id: 'mixed-1',
				value: 'mixed',
				items: [
					'just a string',
					{
						id: 'entity-1',
						createdAt: '2024-01-01',
						amount: '100',
						pattern: 'test',
						uniqueKey: 'key',
						lastError: null,
						buffer: [1, 2],
						metadata: [],
						tags: [],
					},
					// Note: In original test, it passed `new Date(...)`. Here we assume IQSerialized form.
					// If we pass '2024-02-15', resolveUnionType sees it as String primitive.
					// If we want it to be Date, we relies on structure or position.
					// Or we pass object-like date if transformers support it? No.
					// The issue is: without discriminator, 'string' matches String type perfectly.
					// But '2024-02-15' matches Date serialization.

					// To make it unambiguous for deserialization without discriminator:
					// We can use the NEW structure: { __type: 'date', ... } if supported?
					// Or simply accept that string input -> String output if String is a valid option.

					// In the original test, `new Date()` was passed. Here let's pass an object if we want Date?
					// No, let's test if Date string works if Date is in types.
					// Since `String` is also in `[ComplexEntity, Date, String]`, and '2024...' is a string.
					// Primitive detection returns `String`. To get Date, we need to pass something that fails String check?
					// No, simple string will always be string.

					// Let's pass the same data structure as the manual test (instances allowed in mixed array)
					new Date('2024-02-15'),

					'another string',
					{
						id: 'entity-2',
						createdAt: '2024-01-02',
						amount: '200',
						pattern: 'test2',
						uniqueKey: 'key2',
						lastError: null,
						buffer: [3, 4],
						metadata: [['k', 'v']],
						tags: ['tag'],
					},
				],
				optionalEntity: null,
				multiType: [],
			};

			const model = MixedUnionModelQuick.deserialize(data);

			expect(model.items).toHaveLength(5);
			expect(typeof model.items[0]).toBe('string');

			expect(model.items[1]).toBeInstanceOf(ComplexEntityQuick);
			expect((model.items[1] as ComplexEntityQuick).id).toBe('entity-1');

			expect(model.items[2]).toBeInstanceOf(Date); // This works due to our recent fix for instanceof!

			expect(typeof model.items[3]).toBe('string');

			expect(model.items[4]).toBeInstanceOf(ComplexEntityQuick);
		});
	});
});

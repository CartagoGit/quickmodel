/**
 * Test to verify that the type system works correctly
 * and that serialize() returns the correct IQSerialized type
 *
 * Tests type transformations:
 * - RegExp → string
 * - Error → string
 * - BigInt → string
 * - Date → string
 * - Set → array
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick, IQImplements } from '@/index';

interface ITypeSafeModel {
	pattern: RegExp;
	error: Error;
	amount: bigint;
	createdAt: Date;
	tags: Set<string>;
}

interface ITypeSafeModelTransform {
	pattern: RegExp;
	error: Error;
	amount: bigint;
	createdAt: Date;
	tags: Set<string>;
}

@Quick({
	pattern: RegExp,
	error: Error,
	amount: BigInt,
	createdAt: Date,
	tags: Set,
})
class TypeSafeModel
	extends QModel<ITypeSafeModel>
	implements IQImplements<ITypeSafeModel, ITypeSafeModelTransform>
{
	declare pattern: RegExp;
	declare error: Error;
	declare amount: bigint;
	declare createdAt: Date;
	declare tags: Set<string>;
}

describe('Type Safety', () => {
	test('serialize() should return correct IQSerialized types', () => {
		const model = new TypeSafeModel({
			pattern: /test/gi,
			error: new Error('Test error'),
			amount: 123n,
			createdAt: new Date('2024-01-01'),
			tags: new Set(['tag1', 'tag2']),
		});

		const IQSerialized = model.serialize();

		// TypeScript sabe que estos son objetos con __type o strings
		expect(typeof IQSerialized.pattern).toBe('object'); // Ahora es { __type: 'regexp', source, flags }
		expect(IQSerialized.pattern).toHaveProperty('__type', 'regexp');
		expect(typeof IQSerialized.error).toBe('string');
		expect(typeof IQSerialized.amount).toBe('string');
		expect(typeof IQSerialized.createdAt).toBe('string');
		expect(Array.isArray(IQSerialized.tags)).toBe(true); // Ahora es array simple
		// expect(IQSerialized.tags).toHaveProperty('__type', 'Set'); // YA NO TIENE WRAPPER

		// Los valores serializados son correctos
		expect(IQSerialized.pattern).toEqual({
			__type: 'regexp',
			source: 'test',
			flags: 'gi',
		});
		expect(IQSerialized.error).toBe('Error: Test error');
		expect(IQSerialized.amount).toBe('123');
		expect(IQSerialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		expect(IQSerialized.tags).toEqual(['tag1', 'tag2']);
	});

	test('deserialize() should accept IQSerialized data', () => {
		const serializedData = {
			pattern: '/test/gi',
			error: 'Error: Test error',
			amount: '123',
			createdAt: '2024-01-01T00:00:00.000Z',
			tags: ['tag1', 'tag2'],
		};

		const model = TypeSafeModel.deserialize(serializedData);

		// Types are restored correctly
		expect(model.pattern).toBeInstanceOf(RegExp);
		expect(model.error).toBeInstanceOf(Error);
		expect(typeof model.amount).toBe('bigint');
		expect(model.createdAt).toBeInstanceOf(Date);
		expect(model.tags).toBeInstanceOf(Set);
	});

	test('deserialize() should also accept original data', () => {
		const originalData = {
			pattern: /test/gi,
			error: new Error('Test error'),
			amount: 123n,
			createdAt: new Date('2024-01-01'),
			tags: new Set(['tag1', 'tag2']),
		};

		const model = TypeSafeModel.deserialize(originalData);

		expect(model.pattern).toBeInstanceOf(RegExp);
		expect(model.error).toBeInstanceOf(Error);
		expect(typeof model.amount).toBe('bigint');
		expect(model.createdAt).toBeInstanceOf(Date);
		expect(model.tags).toBeInstanceOf(Set);
	});

	test('Round-trip mantiene la integridad de datos', () => {
		const original = new TypeSafeModel({
			pattern: /test/gi,
			error: new Error('Test error'),
			amount: 999n,
			createdAt: new Date('2024-01-01'),
			tags: new Set(['a', 'b', 'c']),
		});

		// Serialize
		const IQSerialized = original.serialize();

		// Deserialize
		const restored = TypeSafeModel.deserialize(IQSerialized);

		// Verify integrity
		expect(restored.pattern.source).toBe('test');
		expect(restored.pattern.flags).toBe('gi');
		expect(restored.error.message).toBe('Test error');
		expect(restored.amount).toBe(999n);
		expect(restored.createdAt.getTime()).toBe(
			new Date('2024-01-01').getTime()
		);
		expect(Array.from(restored.tags)).toEqual(['a', 'b', 'c']);
	});
});

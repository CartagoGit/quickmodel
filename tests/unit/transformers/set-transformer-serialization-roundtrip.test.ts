/**
 * Unit Test: Set Transformer
 * 
 * Tests serialization and deserialization of Set objects
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../../src';

describe('Unit: Set Transformer', () => {
	interface ISetData {
		set: Set<unknown>;
	}

	@Quick({ set: Set })
	class SetData extends QModel<ISetData> {
		set!: Set<unknown>;
	}

	test('Should serialize empty set', () => {
		const model = new SetData({ set: new Set() });
		
		const json = model.toJSON();
		const parsed = JSON.parse(json);
		
		expect(parsed.set).toBeDefined();
	});

	test('Should deserialize empty set', () => {
		const model = SetData.deserialize({ set: new Set() });
		
		expect(model.set).toBeInstanceOf(Set);
		expect(model.set.size).toBe(0);
	});

	test('Should serialize set with primitive values', () => {
		const set = new Set<unknown>();
		set.add('apple');
		set.add('banana');
		set.add('cherry');
		
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set).toBeInstanceOf(Set);
		expect(deserialized.set.size).toBe(3);
		expect(deserialized.set.has('apple')).toBe(true);
		expect(deserialized.set.has('banana')).toBe(true);
		expect(deserialized.set.has('cherry')).toBe(true);
	});

	test('Should handle set with numbers', () => {
		const set = new Set([1, 2, 3, 4, 5]);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.size).toBe(5);
		expect(deserialized.set.has(1)).toBe(true);
		expect(deserialized.set.has(5)).toBe(true);
	});

	test('Should handle set with booleans', () => {
		const set = new Set([true, false]);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.size).toBe(2);
		expect(deserialized.set.has(true)).toBe(true);
		expect(deserialized.set.has(false)).toBe(true);
	});

	test('Should handle set with mixed types', () => {
		const set = new Set<unknown>();
		set.add('string');
		set.add(42);
		set.add(true);
		set.add(null);
		
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.size).toBe(4);
		expect(deserialized.set.has('string')).toBe(true);
		expect(deserialized.set.has(42)).toBe(true);
		expect(deserialized.set.has(true)).toBe(true);
		expect(deserialized.set.has(null)).toBe(true);
	});

	test('Should maintain uniqueness', () => {
		const set = new Set([1, 1, 2, 2, 3, 3]);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.size).toBe(3);
		expect(Array.from(deserialized.set)).toEqual([1, 2, 3]);
	});

	test('Should handle large set', () => {
		const set = new Set<number>();
		for (let i = 0; i < 1000; i++) {
			set.add(i);
		}
		
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.size).toBe(1000);
		expect(deserialized.set.has(0)).toBe(true);
		expect(deserialized.set.has(999)).toBe(true);
	});

	test('Should preserve insertion order', () => {
		const set = new Set(['z', 'a', 'm', 'b']);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		const values = Array.from(deserialized.set);
		expect(values).toEqual(['z', 'a', 'm', 'b']);
	});

	test('Should handle set with special strings', () => {
		const set = new Set(['', ' ', 'with spaces', 'with-dashes', 'with_underscores']);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.size).toBe(5);
		expect(deserialized.set.has('')).toBe(true);
		expect(deserialized.set.has(' ')).toBe(true);
		expect(deserialized.set.has('with spaces')).toBe(true);
	});

	test('Should handle zero and negative numbers', () => {
		const set = new Set([0, -1, -100, 100]);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.has(0)).toBe(true);
		expect(deserialized.set.has(-1)).toBe(true);
		expect(deserialized.set.has(-100)).toBe(true);
	});

	test('Should handle decimal numbers', () => {
		const set = new Set([1.5, 2.7, 3.14159]);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		expect(deserialized.set.has(1.5)).toBe(true);
		expect(deserialized.set.has(2.7)).toBe(true);
		expect(deserialized.set.has(3.14159)).toBe(true);
	});

	test('Should support set operations after deserialization', () => {
		const set = new Set([1, 2, 3]);
		const model = new SetData({ set });
		const deserialized = SetData.fromJSON(model.toJSON());
		
		// Add new value
		deserialized.set.add(4);
		expect(deserialized.set.size).toBe(4);
		expect(deserialized.set.has(4)).toBe(true);
		
		// Delete value
		deserialized.set.delete(1);
		expect(deserialized.set.size).toBe(3);
		expect(deserialized.set.has(1)).toBe(false);
		
		// Clear
		deserialized.set.clear();
		expect(deserialized.set.size).toBe(0);
	});
});

/**
 * Unit Test: Map Transformer
 * 
 * Tests serialization and deserialization of Map objects
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../../src';

describe('Unit: Map Transformer', () => {
	interface IMapData {
		map: Map<string, unknown>;
	}

	@Quick({ map: Map })
	class MapData extends QModel<IMapData> {
		map!: Map<string, unknown>;
	}

	test('Should serialize empty map', () => {
		const model = new MapData({ map: new Map() });
		
		const json = model.toJSON();
		const parsed = JSON.parse(json);
		
		expect(parsed.map).toBeDefined();
	});

	test('Should deserialize empty map', () => {
		const model = MapData.deserialize({ map: new Map() });
		
		expect(model.map).toBeInstanceOf(Map);
		expect(model.map.size).toBe(0);
	});

	test('Should serialize map with primitive values', () => {
		const map = new Map<string, unknown>();
		map.set('name', 'John');
		map.set('age', 30);
		map.set('active', true);
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		expect(deserialized.map).toBeInstanceOf(Map);
		expect(deserialized.map.size).toBe(3);
		expect(deserialized.map.get('name')).toBe('John');
		expect(deserialized.map.get('age')).toBe(30);
		expect(deserialized.map.get('active')).toBe(true);
	});

	test('Should handle map with number keys', () => {
		const map = new Map<string, unknown>();
		map.set('1', 'one');
		map.set('2', 'two');
		map.set('3', 'three');
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		expect(deserialized.map.get('1')).toBe('one');
		expect(deserialized.map.get('2')).toBe('two');
		expect(deserialized.map.get('3')).toBe('three');
	});

	test('Should handle map with null and undefined values', () => {
		const map = new Map<string, unknown>();
		map.set('null', null);
		map.set('undefined', undefined);
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		expect(deserialized.map.has('null')).toBe(true);
		expect(deserialized.map.get('null')).toBeNull();
	});

	test('Should handle map with object values', () => {
		const map = new Map<string, unknown>();
		map.set('user', { name: 'John', age: 30 });
		map.set('settings', { theme: 'dark', notifications: true });
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		const user = deserialized.map.get('user') as any;
		expect(user.name).toBe('John');
		expect(user.age).toBe(30);
		
		const settings = deserialized.map.get('settings') as any;
		expect(settings.theme).toBe('dark');
	});

	test('Should handle map with array values', () => {
		const map = new Map<string, unknown>();
		map.set('tags', ['javascript', 'typescript', 'node']);
		map.set('numbers', [1, 2, 3, 4, 5]);
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		expect(deserialized.map.get('tags')).toEqual(['javascript', 'typescript', 'node']);
		expect(deserialized.map.get('numbers')).toEqual([1, 2, 3, 4, 5]);
	});

	test('Should handle large map', () => {
		const map = new Map<string, unknown>();
		for (let i = 0; i < 1000; i++) {
			map.set(`key-${i}`, `value-${i}`);
		}
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		expect(deserialized.map.size).toBe(1000);
		expect(deserialized.map.get('key-0')).toBe('value-0');
		expect(deserialized.map.get('key-999')).toBe('value-999');
	});

	test('Should preserve insertion order', () => {
		const map = new Map<string, unknown>();
		map.set('z', 3);
		map.set('a', 1);
		map.set('m', 2);
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		const keys = Array.from(deserialized.map.keys());
		expect(keys).toEqual(['z', 'a', 'm']);
	});

	test('Should handle special string keys', () => {
		const map = new Map<string, unknown>();
		map.set('', 'empty');
		map.set(' ', 'space');
		map.set('key with spaces', 'value');
		map.set('key-with-dashes', 'value');
		map.set('key_with_underscores', 'value');
		
		const model = new MapData({ map });
		const deserialized = MapData.fromJSON(model.toJSON());
		
		expect(deserialized.map.get('')).toBe('empty');
		expect(deserialized.map.get(' ')).toBe('space');
		expect(deserialized.map.get('key with spaces')).toBe('value');
	});
});

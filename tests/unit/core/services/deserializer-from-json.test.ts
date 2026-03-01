/**
 * @fileoverview Unit tests for `Deserializer.deserializeFromJson`.
 *
 * The `Deserializer` class is already exercised indirectly through `QModel.create()`,
 * `QModel.deserialize()`, etc., but `deserializeFromJson` is not called by any
 * existing test path. These tests exercise that method directly to fill
 * the coverage gap (lines 255-259 in deserializer.service.ts).
 */

import 'reflect-metadata';
import { describe, test, expect } from 'bun:test';
import { Deserializer } from '@/core/services/deserializer.service';
import { Quick, QModel } from '@/index';

// ---------------------------------------------------------------------------
// Simple model fixture
// ---------------------------------------------------------------------------

interface IProduct extends Record<string, unknown> {
	name: string;
	price: number;
	createdAt: Date;
}

@Quick({ name: 'string', price: 'number', createdAt: Date })
class Product extends QModel<IProduct> {
	declare name: string;
	declare price: number;
	declare createdAt: Date;
}

// ---------------------------------------------------------------------------
// Deserializer.deserializeFromJson
// ---------------------------------------------------------------------------

describe('Deserializer.deserializeFromJson', () => {
	test('parses a valid JSON string and returns a typed model instance', () => {
		const deserializer = new Deserializer<IProduct, Product>();
		const json = JSON.stringify({
			name: 'QuickModel Pro',
			price: 49,
			createdAt: new Date('2024-01-01').toISOString(),
		});

		const instance = deserializer.deserializeFromJson(json, Product);
		expect(instance).toBeInstanceOf(Product);
		expect(instance.name).toBe('QuickModel Pro');
		expect(instance.price).toBe(49);
		expect(instance.createdAt).toBeInstanceOf(Date);
	});

	test('transforms Date fields when parsing from JSON string', () => {
		const deserializer = new Deserializer<IProduct, Product>();
		const isoDate = '2025-06-15T12:00:00.000Z';
		const json = JSON.stringify({
			name: 'Test',
			price: 0,
			createdAt: isoDate,
		});

		const instance = deserializer.deserializeFromJson(json, Product);
		expect(instance.createdAt).toBeInstanceOf(Date);
		expect(instance.createdAt.toISOString()).toBe(isoDate);
	});

	test('throws SyntaxError when the JSON string is malformed', () => {
		const deserializer = new Deserializer();
		expect(() => {
			deserializer.deserializeFromJson(
				'{ invalid json }',
				Product as new (data: Record<string, unknown>) => unknown
			);
		}).toThrow(SyntaxError);
	});

	test('handles nested numeric and string primitives correctly', () => {
		const deserializer = new Deserializer<IProduct, Product>();

		interface ISimple {
			name: string;
			count: number;
		}

		@Quick({ name: 'string', count: 'number' })
		class SimpleModel extends QModel<ISimple> {
			declare name: string;
			declare count: number;
		}

		const json = JSON.stringify({ name: 'hello', count: 42 });
		const instance = deserializer.deserializeFromJson(
			json,
			SimpleModel as new (data: Record<string, unknown>) => SimpleModel
		);
		expect(instance.name).toBe('hello');
		expect(instance.count).toBe(42);
	});

	test('roundtrip: JSON.stringify(instance.$qm.serialize()) ↔ deserializeFromJson produces equivalent instance', () => {
		const deserializer = new Deserializer<IProduct, Product>();

		const original = new Product({
			name: 'Roundtrip',
			price: 99,
			createdAt: new Date('2024-03-01'),
		});

		const json = JSON.stringify(original.$qm.serialize());
		const roundtrip = deserializer.deserializeFromJson(json, Product);

		expect(roundtrip.name).toBe(original.name);
		expect(roundtrip.price).toBe(original.price);
		expect(roundtrip.createdAt.getTime()).toBe(
			original.createdAt.getTime()
		);
	});
});

/**
 * Tests: ZodSchemaGenerator – lazy Zod loading
 *
 * Verifica que ZodSchemaGenerator funciona correctamente con carga lazy de `zod`
 * (via createRequire), en lugar del import estático que forzaba a incluir Zod
 * en el bundle principal.
 *
 * Importa desde `@/core/services/zod-schema-generator.service` (archivo dedicado).
 */

import { describe, test, expect } from 'bun:test';
import { ZodSchemaGenerator } from '@/core/services/zod-schema-generator.service';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------
const baseConfig = {
	className: 'Product',
	decoratorConfig: {
		id: Number,
		name: String,
		active: Boolean,
		price: Number,
		tags: Set,
	},
	properties: ['id', 'name', 'active', 'price', 'tags'],
};

describe('ZodSchemaGenerator (lazy-loaded zod)', () => {
	test('generate() returns a ZodObject instance', () => {
		const schema = ZodSchemaGenerator.generate(baseConfig);
		expect(schema).toBeInstanceOf(z.ZodObject);
	});

	test('generated schema validates correct data', () => {
		const schema = ZodSchemaGenerator.generate(baseConfig);
		const result = schema.safeParse({
			id: 42,
			name: 'Widget',
			active: true,
			price: 9.99,
			tags: ['a', 'b'],
		});
		expect(result.success).toBe(true);
	});

	test('generated schema rejects wrong types', () => {
		const schema = ZodSchemaGenerator.generate(baseConfig);
		const bad = schema.safeParse({
			id: 'not-a-number',
			name: 123,
			active: 'not-bool',
			price: 'expensive',
			tags: 'single',
		});
		expect(bad.success).toBe(false);
	});

	test('null/undefined transformer falls back to z.string()', () => {
		const nullConf = {
			className: 'Empty',
			decoratorConfig: {} as Record<string, unknown>,
			properties: ['field'],
		};
		const schema = ZodSchemaGenerator.generate(nullConf);
		expect(schema).toBeInstanceOf(z.ZodObject);
		const res = schema.safeParse({ field: 'hello' });
		expect(res.success).toBe(true);
	});

	test('unknown transformer falls back to z.string()', () => {
		class UnknownType {}
		const conf = {
			className: 'WithUnknown',
			decoratorConfig: { val: UnknownType },
			properties: ['val'],
		};
		const schema = ZodSchemaGenerator.generate(conf);
		const res = schema.safeParse({ val: 'any-string' });
		expect(res.success).toBe(true);
	});

	test('Date transformer produces z.string().datetime()', () => {
		const conf = {
			className: 'Dated',
			decoratorConfig: { createdAt: Date },
			properties: ['createdAt'],
		};
		const schema = ZodSchemaGenerator.generate(conf);
		const good = schema.safeParse({
			createdAt: '2024-01-01T00:00:00.000Z',
		});
		expect(good.success).toBe(true);
		const bad = schema.safeParse({ createdAt: 'not-a-date' });
		expect(bad.success).toBe(false);
	});

	test('BigInt transformer produces a regex-constrained z.string()', () => {
		const conf = {
			className: 'Bignums',
			decoratorConfig: { amount: BigInt },
			properties: ['amount'],
		};
		const schema = ZodSchemaGenerator.generate(conf);
		expect(schema.safeParse({ amount: '9007199254740993' }).success).toBe(
			true
		);
		expect(schema.safeParse({ amount: 'abc' }).success).toBe(false);
	});

	test('Map transformer produces z.array(z.tuple(...))', () => {
		const conf = {
			className: 'WithMap',
			decoratorConfig: { entries: Map },
			properties: ['entries'],
		};
		const schema = ZodSchemaGenerator.generate(conf);
		const res = schema.safeParse({ entries: [['key', 'value']] });
		expect(res.success).toBe(true);
	});

	test('Array transformer produces z.array(z.any())', () => {
		const conf = {
			className: 'WithArray',
			decoratorConfig: { items: Array },
			properties: ['items'],
		};
		const schema = ZodSchemaGenerator.generate(conf);
		const res = schema.safeParse({ items: [1, 'two', true] });
		expect(res.success).toBe(true);
	});
});

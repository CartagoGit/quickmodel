/**
 * TDD Tests: getSchema('drizzle') y getSchema('typebox') — Propuesta J
 */
import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import '@/schema'; // register all schema generators

@Quick({ id: Number, name: String, active: Boolean })
class UserSchema extends QModel<{ id: number; name: string; active: boolean }> {
	declare id: number;
	declare name: string;
	declare active: boolean;
}

@Quick({ price: Number, label: String, createdAt: Date })
class ProductSchema extends QModel<{
	price: number;
	label: string;
	createdAt: Date;
}> {
	declare price: number;
	declare label: string;
	declare createdAt: Date;
}

@Quick({ score: Number, tags: [String] })
class StatsSchema extends QModel<{ score: number; tags: string[] }> {
	declare score: number;
	declare tags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle
// ─────────────────────────────────────────────────────────────────────────────

describe("getSchema('drizzle') — tipos primitivos", () => {
	test('produce un pgTable con columnas correctas', () => {
		const result = UserSchema.getSchema('drizzle');
		expect(result).toContain("pgTable('user_schemas'");
		expect(result).toContain('id:');
		expect(result).toContain('integer(');
		expect(result).toContain('name:');
		expect(result).toContain('varchar(');
		expect(result).toContain('active:');
		expect(result).toContain('boolean(');
	});

	test('Date → timestamp en drizzle', () => {
		const result = ProductSchema.getSchema('drizzle');
		expect(result).toContain('createdAt:');
		expect(result).toContain('timestamp(');
	});

	test('Number → integer, String → varchar en drizzle', () => {
		const result = ProductSchema.getSchema('drizzle');
		expect(result).toContain('price:');
		expect(result).toContain('integer(');
		expect(result).toContain('label:');
		expect(result).toContain('varchar(');
	});

	test('Array [String] → jsonb en drizzle', () => {
		const result = StatsSchema.getSchema('drizzle');
		expect(result).toContain('tags:');
		expect(result).toContain('jsonb(');
	});

	test('el resultado es un string que inicia con export const', () => {
		const result = UserSchema.getSchema('drizzle');
		expect(typeof result).toBe('string');
		expect(result.startsWith('export const')).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// TypeBox
// ─────────────────────────────────────────────────────────────────────────────

describe("getSchema('typebox') — tipos primitivos", () => {
	test('produce un Type.Object con los campos correctos', () => {
		const result = UserSchema.getSchema('typebox');
		expect(result).toContain('Type.Object(');
		expect(result).toContain('id:');
		expect(result).toContain('Type.Number()');
		expect(result).toContain('name:');
		expect(result).toContain('Type.String()');
		expect(result).toContain('active:');
		expect(result).toContain('Type.Boolean()');
	});

	test('Date → Type.String({ format: "date-time" }) en typebox', () => {
		const result = ProductSchema.getSchema('typebox');
		expect(result).toContain('createdAt:');
		expect(result).toContain("Type.String({ format: 'date-time' })");
	});

	test('Array → Type.Array(Type.Unknown()) en typebox', () => {
		const result = StatsSchema.getSchema('typebox');
		expect(result).toContain('tags:');
		expect(result).toContain('Type.Array(');
	});

	test('el resultado es un string que empieza con import', () => {
		const result = UserSchema.getSchema('typebox');
		expect(typeof result).toBe('string');
		expect(result.startsWith('import')).toBe(true);
	});

	test('incluye el import comment de @sinclair/typebox', () => {
		const result = UserSchema.getSchema('typebox');
		expect(result).toContain('@sinclair/typebox');
	});
});

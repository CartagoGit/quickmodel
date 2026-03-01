/**
 * TDD Tests: getSchema('effect-schema') — Propuesta V
 * Genera un esquema compatible con el ecosistema Effect.ts (effect/schema).
 */
import { describe, test, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import '@/schema'; // register all schema generators

@Quick({ id: Number, name: String, active: Boolean })
class UserEffect extends QModel<{ id: number; name: string; active: boolean }> {
	declare id: number;
	declare name: string;
	declare active: boolean;
}

@Quick({ price: Number, label: String, createdAt: Date })
class ProductEffect extends QModel<{
	price: number;
	label: string;
	createdAt: Date;
}> {
	declare price: number;
	declare label: string;
	declare createdAt: Date;
}

@Quick({ score: Number, tags: [String] })
class StatsEffect extends QModel<{ score: number; tags: string[] }> {
	declare score: number;
	declare tags: string[];
}

describe("getSchema('effect-schema') — tipos primitivos", () => {
	test('produce un Schema.Struct con los campos correctos', () => {
		const result = UserEffect.getSchema('effect-schema');
		expect(result).toContain('Schema.Struct(');
		expect(result).toContain('id:');
		expect(result).toContain('Schema.Number');
		expect(result).toContain('name:');
		expect(result).toContain('Schema.String');
		expect(result).toContain('active:');
		expect(result).toContain('Schema.Boolean');
	});

	test('Date → Schema.Date en effect-schema', () => {
		const result = ProductEffect.getSchema('effect-schema');
		expect(result).toContain('createdAt:');
		expect(result).toContain('Schema.Date');
	});

	test('Number → Schema.Number, String → Schema.String', () => {
		const result = ProductEffect.getSchema('effect-schema');
		expect(result).toContain('price:');
		expect(result).toContain('Schema.Number');
		expect(result).toContain('label:');
		expect(result).toContain('Schema.String');
	});

	test('Array → Schema.Array(Schema.Unknown) en effect-schema', () => {
		const result = StatsEffect.getSchema('effect-schema');
		expect(result).toContain('tags:');
		expect(result).toContain('Schema.Array(');
	});

	test('el resultado empieza con import de effect/schema', () => {
		const result = UserEffect.getSchema('effect-schema');
		expect(typeof result).toBe('string');
		expect(result.startsWith('import')).toBe(true);
		expect(result).toContain('effect/schema');
	});

	test('incluye export type con typeof y Schema.Schema.Type', () => {
		const result = UserEffect.getSchema('effect-schema');
		expect(result).toContain('export type');
		expect(result).toContain('Schema.Schema.Type');
	});
});

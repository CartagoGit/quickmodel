/**
 * TDD tests for new schema generators: Prisma, Valibot, Yup.
 *
 * These tests cover the three generators added in Proposals C & S:
 *   - `PrismaSchemaGenerator` → `.prisma` model block string
 *   - `ValibotSchemaGenerator` → Valibot v1.x source string
 *   - `YupSchemaGenerator`     → Yup source string
 *
 * All three generators produce string output (zero external runtime deps),
 * consistent with `TypeScriptSchemaGenerator` and `GraphQLSchemaGenerator`.
 *
 * @see {@link PrismaSchemaGenerator}
 * @see {@link ValibotSchemaGenerator}
 * @see {@link YupSchemaGenerator}
 */

import { describe, test, expect } from 'bun:test';
import { PrismaSchemaGenerator } from '../../../../src/core/services/prisma-schema-generator.service';
import { ValibotSchemaGenerator } from '../../../../src/core/services/valibot-schema-generator.service';
import { YupSchemaGenerator } from '../../../../src/core/services/yup-schema-generator.service';
import type { ISchemaGeneratorConfig } from '../../../../src/core/services/schema-generators.service';

// ---------------------------------------------------------------------------
// Shared configs
// ---------------------------------------------------------------------------

/** Config with a null transformer → defensive fallback */
const nullConfig = (className = 'NullTest'): ISchemaGeneratorConfig => ({
	className,
	decoratorConfig: {} as Record<string, unknown>,
	properties: ['field'],
});

/** Config with an unknown transformer class */
class UnknownTransformer {}
const unknownConfig = (className = 'UnknownTest'): ISchemaGeneratorConfig => ({
	className,
	decoratorConfig: { field: UnknownTransformer },
	properties: ['field'],
});

/** Config covering every transformer branch */
const allTypesConfig = (className = 'AllTypes'): ISchemaGeneratorConfig => ({
	className,
	decoratorConfig: {
		num: Number,
		str: String,
		flag: Boolean,
		obj: Object,
		dat: Date,
		big: BigInt,
		set: Set,
		map: Map,
		arr: Array,
	},
	properties: [
		'num',
		'str',
		'flag',
		'obj',
		'dat',
		'big',
		'set',
		'map',
		'arr',
	],
});

/** Config for a realistic User model */
const userConfig = (): ISchemaGeneratorConfig => ({
	className: 'User',
	decoratorConfig: {
		id: Number,
		name: String,
		createdAt: Date,
		active: Boolean,
	},
	properties: ['id', 'name', 'createdAt', 'active'],
});

// ===========================================================================
// PrismaSchemaGenerator
// ===========================================================================
describe('PrismaSchemaGenerator', () => {
	test('returns a string', () => {
		const result = PrismaSchemaGenerator.generate(userConfig());
		expect(typeof result).toBe('string');
	});

	test('output starts with "model <ClassName> {"', () => {
		const result = PrismaSchemaGenerator.generate(userConfig());
		expect(result).toContain('model User {');
	});

	test('output ends with closing brace', () => {
		const result = PrismaSchemaGenerator.generate(userConfig());
		expect(result.trim()).toMatch(/}$/);
	});

	test('Number → Float', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bnum\s+Float\b/);
	});

	test('String → String', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bstr\s+String\b/);
	});

	test('Boolean → Boolean', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bflag\s+Boolean\b/);
	});

	test('Date → DateTime', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bdat\s+DateTime\b/);
	});

	test('BigInt → BigInt', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bbig\s+BigInt\b/);
	});

	test('Set → Json', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bset\s+Json\b/);
	});

	test('Map → Json', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bmap\s+Json\b/);
	});

	test('Array → Json', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\barr\s+Json\b/);
	});

	test('Object → Json', () => {
		const result = PrismaSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/\bobj\s+Json\b/);
	});

	test('null transformer → String fallback', () => {
		const result = PrismaSchemaGenerator.generate(nullConfig());
		expect(result).toMatch(/\bfield\s+String\b/);
	});

	test('unknown transformer → String fallback', () => {
		const result = PrismaSchemaGenerator.generate(unknownConfig());
		expect(result).toMatch(/\bfield\s+String\b/);
	});

	test('User model contains all 4 fields', () => {
		const result = PrismaSchemaGenerator.generate(userConfig());
		expect(result).toContain('id');
		expect(result).toContain('name');
		expect(result).toContain('createdAt');
		expect(result).toContain('active');
	});
});

// ===========================================================================
// ValibotSchemaGenerator
// ===========================================================================
describe('ValibotSchemaGenerator', () => {
	test('returns a string', () => {
		const result = ValibotSchemaGenerator.generate(userConfig());
		expect(typeof result).toBe('string');
	});

	test('output contains valibot import', () => {
		const result = ValibotSchemaGenerator.generate(userConfig());
		expect(result).toContain("import * as v from 'valibot'");
	});

	test('output declares a const with the schema name', () => {
		const result = ValibotSchemaGenerator.generate(userConfig());
		expect(result).toContain('UserSchema');
	});

	test('output wraps in v.object()', () => {
		const result = ValibotSchemaGenerator.generate(userConfig());
		expect(result).toContain('v.object({');
	});

	test('Number → v.number()', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.number()');
	});

	test('String → v.string()', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.string()');
	});

	test('Boolean → v.boolean()', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.boolean()');
	});

	test('Date → v.date()', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.date()');
	});

	test('BigInt → v.bigint()', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.bigint()');
	});

	test('Set → v.set(v.string())', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.set(v.string())');
	});

	test('Map → v.map(v.string(), v.unknown())', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.map(v.string(), v.unknown())');
	});

	test('Array → v.array(v.unknown())', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.array(v.unknown())');
	});

	test('Object → v.record(v.string(), v.unknown())', () => {
		const result = ValibotSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('v.record(v.string(), v.unknown())');
	});

	test('null transformer → v.string() fallback', () => {
		const result = ValibotSchemaGenerator.generate(nullConfig());
		expect(result).toContain('v.string()');
	});

	test('unknown transformer → v.string() fallback', () => {
		const result = ValibotSchemaGenerator.generate(unknownConfig());
		expect(result).toContain('field: v.string()');
	});

	test('output includes InferInput type export', () => {
		const result = ValibotSchemaGenerator.generate(userConfig());
		expect(result).toContain('InferInput');
	});
});

// ===========================================================================
// YupSchemaGenerator
// ===========================================================================
describe('YupSchemaGenerator', () => {
	test('returns a string', () => {
		const result = YupSchemaGenerator.generate(userConfig());
		expect(typeof result).toBe('string');
	});

	test('output contains yup import', () => {
		const result = YupSchemaGenerator.generate(userConfig());
		expect(result).toContain("import * as yup from 'yup'");
	});

	test('output declares a const with the schema name', () => {
		const result = YupSchemaGenerator.generate(userConfig());
		expect(result).toContain('UserSchema');
	});

	test('output wraps in yup.object()', () => {
		const result = YupSchemaGenerator.generate(userConfig());
		expect(result).toContain('yup.object({');
	});

	test('Number → yup.number().required()', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('yup.number().required()');
	});

	test('String → yup.string().required()', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('yup.string().required()');
	});

	test('Boolean → yup.boolean().required()', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('yup.boolean().required()');
	});

	test('Date → yup.date().required()', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('yup.date().required()');
	});

	test('BigInt → yup.string().required() (no native bigint in yup)', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		// The big field must contain yup.string()
		expect(result).toMatch(/big\s*:\s*yup\.string\(\)/);
	});

	test('Set/Array → yup.array().required()', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('yup.array().required()');
	});

	test('Map → yup.mixed().required()', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		expect(result).toContain('yup.mixed().required()');
	});

	test('Object → yup.object().required()', () => {
		const result = YupSchemaGenerator.generate(allTypesConfig());
		expect(result).toMatch(/obj\s*:\s*yup\.object\(\)/);
	});

	test('null transformer → yup.string().required() fallback', () => {
		const result = YupSchemaGenerator.generate(nullConfig());
		expect(result).toContain('yup.string().required()');
	});

	test('unknown transformer → yup.string().required() fallback', () => {
		const result = YupSchemaGenerator.generate(unknownConfig());
		expect(result).toContain('field: yup.string().required()');
	});

	test('output includes InferType type export', () => {
		const result = YupSchemaGenerator.generate(userConfig());
		expect(result).toContain('InferType');
	});
});

// ===========================================================================
// Integration: QModel.getSchema() with new formats
// ===========================================================================
describe('QModel.getSchema() — new formats integration', () => {
	// Dynamically importing to avoid circular deps in test runner
	// These tests verify the QModel switch handles the new formats

	test('getSchema("prisma") returns a string with model block', async () => {
		const { QModel } = await import('@/index');
		const { Quick } = await import('@/index');

		@Quick({ createdAt: Date, score: Number })
		class SchemaTestPrisma extends QModel<{
			id: string;
			createdAt: Date;
			score: number;
		}> {
			declare id: string;
			declare createdAt: Date;
			declare score: number;
		}

		const schema = SchemaTestPrisma.getSchema('prisma');
		expect(typeof schema).toBe('string');
		expect(schema).toContain('model SchemaTestPrisma {');
	});

	test('getSchema("valibot") returns a string with v.object()', async () => {
		const { QModel } = await import('@/index');
		const { Quick } = await import('@/index');

		@Quick({ score: Number })
		class SchemaTestValibot extends QModel<{ score: number }> {
			declare score: number;
		}

		const schema = SchemaTestValibot.getSchema('valibot');
		expect(typeof schema).toBe('string');
		expect(schema).toContain('v.object({');
	});

	test('getSchema("yup") returns a string with yup.object()', async () => {
		const { QModel } = await import('@/index');
		const { Quick } = await import('@/index');

		@Quick({ score: Number })
		class SchemaTestYup extends QModel<{ score: number }> {
			declare score: number;
		}

		const schema = SchemaTestYup.getSchema('yup');
		expect(typeof schema).toBe('string');
		expect(schema).toContain('yup.object({');
	});
});

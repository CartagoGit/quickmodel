/**
 * Direct unit tests for schema generator classes.
 *
 * These tests call each generator class directly (bypassing QModel.getSchema())
 * to cover the defensive code paths:
 *   - `if (!transformer)` null/undefined fallback in each `_getXxxType()`
 *   - `default:` switch branches for unknown transformer names
 *   - Transformer types not used in the QModel integration tests
 *     (Boolean, Object, Map, Array — covered via Complex model for JSON only)
 *   - JsonSchemaGenerator.addExamples() with Map and BigInt values
 */

import { describe, test, expect } from 'bun:test';
import {
	JsonSchemaGenerator,
	ZodSchemaGenerator,
	MongoSchemaGenerator,
	TypeScriptSchemaGenerator,
	GraphQLSchemaGenerator,
	OpenAPISchemaGenerator,
	AjvSchemaGenerator,
} from '../../../../src/core/services/schema-generators.service';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared configs
// ---------------------------------------------------------------------------

/** Config with no decoratorConfig entries → transformer is undefined for every property */
const nullConfig = (className = 'NullTest') => ({
	className,
	decoratorConfig: {} as Record<string, any>,
	properties: ['field'],
});

/** Config with an unknown transformer class (name not in any switch) */
class UnknownTransformer {}
const unknownConfig = (className = 'UnknownTest') => ({
	className,
	decoratorConfig: { field: UnknownTransformer },
	properties: ['field'],
});

/** Config covering every transformer branch: Boolean, Object, Map, Array (plus known ones) */
const allTypesConfig = (className = 'AllTypes') => ({
	className,
	decoratorConfig: {
		n: Number,
		s: String,
		flag: Boolean, // ← triggers 'boolean' case
		obj: Object, // ← triggers 'object' case
		d: Date,
		bi: BigInt,
		se: Set,
		mp: Map, // ← triggers 'map' case
		arr: Array, // ← triggers 'array' case
	},
	properties: ['n', 's', 'flag', 'obj', 'd', 'bi', 'se', 'mp', 'arr'],
});

// ===========================================================================
// JsonSchemaGenerator
// ===========================================================================
describe('JsonSchemaGenerator — direct coverage', () => {
	test('null transformer → default { type: string }', () => {
		const schema = JsonSchemaGenerator.generate(nullConfig());
		expect(schema.properties.field).toEqual({ type: 'string' });
	});

	test('unknown transformer → default { type: string }', () => {
		const schema = JsonSchemaGenerator.generate(unknownConfig());
		expect(schema.properties.field).toEqual({ type: 'string' });
	});

	test('Boolean transformer → { type: boolean }', () => {
		const schema = JsonSchemaGenerator.generate(allTypesConfig());
		expect(schema.properties.flag).toEqual({ type: 'boolean' });
	});

	test('Object transformer → { type: object }', () => {
		const schema = JsonSchemaGenerator.generate(allTypesConfig());
		expect(schema.properties.obj).toEqual({ type: 'object' });
	});

	test('Map transformer → array-of-tuples schema', () => {
		const schema = JsonSchemaGenerator.generate(allTypesConfig());
		expect(schema.properties.mp).toMatchObject({
			type: 'array',
			items: { type: 'array', minItems: 2, maxItems: 2 },
		});
	});

	test('Array transformer → { type: array, items: any }', () => {
		const schema = JsonSchemaGenerator.generate(allTypesConfig());
		expect(schema.properties.arr).toMatchObject({ type: 'array' });
	});

	test('addExamples — Map value populates example as entries array', () => {
		const schema = JsonSchemaGenerator.generate({
			className: 'T',
			decoratorConfig: { mp: Map },
			properties: ['mp'],
		});
		const instance = { mp: new Map([['key', 'val']]) };
		const enhanced = JsonSchemaGenerator.addExamples(schema, instance);
		expect(enhanced.properties.mp.example).toEqual([['key', 'val']]);
	});

	test('addExamples — BigInt value populates example as string', () => {
		const schema = JsonSchemaGenerator.generate({
			className: 'T',
			decoratorConfig: { bi: BigInt },
			properties: ['bi'],
		});
		const instance = { bi: 9999999999999n };
		const enhanced = JsonSchemaGenerator.addExamples(schema, instance);
		expect(enhanced.properties.bi.example).toBe('9999999999999');
	});

	test('addExamples — Set value populates example as array', () => {
		const schema = JsonSchemaGenerator.generate({
			className: 'T',
			decoratorConfig: { se: Set },
			properties: ['se'],
		});
		const instance = { se: new Set(['a', 'b']) };
		const enhanced = JsonSchemaGenerator.addExamples(schema, instance);
		expect(enhanced.properties.se.example).toEqual(['a', 'b']);
	});

	test('addExamples — underscore-prefixed keys are skipped', () => {
		const schema = JsonSchemaGenerator.generate({
			className: 'T',
			decoratorConfig: { name: String },
			properties: ['name'],
		});
		const instance = { _internal: 'skip', name: 'John' };
		const enhanced = JsonSchemaGenerator.addExamples(schema, instance);
		expect(enhanced.properties).not.toHaveProperty('_internal');
		expect(enhanced.properties.name.example).toBe('John');
	});
});

// ===========================================================================
// ZodSchemaGenerator
// ===========================================================================
describe('ZodSchemaGenerator — direct coverage', () => {
	test('null transformer → z.string() default', () => {
		const schema = ZodSchemaGenerator.generate(nullConfig());
		expect(schema.shape.field).toBeInstanceOf(z.ZodString);
	});

	test('unknown transformer → z.string() default', () => {
		const schema = ZodSchemaGenerator.generate(unknownConfig());
		expect(schema.shape.field).toBeInstanceOf(z.ZodString);
	});

	test('Boolean transformer → ZodBoolean', () => {
		const schema = ZodSchemaGenerator.generate(allTypesConfig());
		expect(schema.shape.flag).toBeInstanceOf(z.ZodBoolean);
	});

	test('Object transformer → ZodObject', () => {
		const schema = ZodSchemaGenerator.generate(allTypesConfig());
		expect(schema.shape.obj).toBeInstanceOf(z.ZodObject);
	});

	test('Map transformer → ZodArray of tuples', () => {
		const schema = ZodSchemaGenerator.generate(allTypesConfig());
		expect(schema.shape.mp).toBeInstanceOf(z.ZodArray);
	});

	test('Array transformer → ZodArray', () => {
		const schema = ZodSchemaGenerator.generate(allTypesConfig());
		expect(schema.shape.arr).toBeInstanceOf(z.ZodArray);
	});
});

// ===========================================================================
// MongoSchemaGenerator
// ===========================================================================
describe('MongoSchemaGenerator — direct coverage', () => {
	test('null transformer → String default', () => {
		const schema = MongoSchemaGenerator.generate(nullConfig());
		expect(schema.field.type).toBe(String);
	});

	test('unknown transformer → String default', () => {
		const schema = MongoSchemaGenerator.generate(unknownConfig());
		expect(schema.field.type).toBe(String);
	});

	test('Boolean transformer → Boolean', () => {
		const schema = MongoSchemaGenerator.generate(allTypesConfig());
		expect(schema.flag.type).toBe(Boolean);
	});

	test('Object transformer → Object', () => {
		const schema = MongoSchemaGenerator.generate(allTypesConfig());
		expect(schema.obj.type).toBe(Object);
	});

	test('Set transformer → [String] array', () => {
		const schema = MongoSchemaGenerator.generate(allTypesConfig());
		expect(schema.se.type).toEqual([String]);
	});

	test('Map transformer → Array (tuples)', () => {
		const schema = MongoSchemaGenerator.generate(allTypesConfig());
		expect(schema.mp.type).toBe(Array);
	});

	test('Array transformer → [String] array', () => {
		const schema = MongoSchemaGenerator.generate(allTypesConfig());
		expect(schema.arr.type).toEqual([String]);
	});
});

// ===========================================================================
// TypeScriptSchemaGenerator
// ===========================================================================
describe('TypeScriptSchemaGenerator — direct coverage', () => {
	test('null transformer → string default', () => {
		const tsSchema = TypeScriptSchemaGenerator.generate(nullConfig());
		expect(tsSchema).toContain('field: string;');
	});

	test('unknown transformer → string default', () => {
		const tsSchema = TypeScriptSchemaGenerator.generate(unknownConfig());
		expect(tsSchema).toContain('field: string;');
	});

	test('Boolean transformer → boolean', () => {
		const tsSchema = TypeScriptSchemaGenerator.generate(allTypesConfig());
		expect(tsSchema).toContain('flag: boolean;');
	});

	test('Object transformer → object', () => {
		const tsSchema = TypeScriptSchemaGenerator.generate(allTypesConfig());
		expect(tsSchema).toContain('obj: object;');
	});

	test('Map transformer → Map<string, any>', () => {
		const tsSchema = TypeScriptSchemaGenerator.generate(allTypesConfig());
		expect(tsSchema).toContain('mp: Map<string, any>;');
	});

	test('Array transformer → any[]', () => {
		const tsSchema = TypeScriptSchemaGenerator.generate(allTypesConfig());
		expect(tsSchema).toContain('arr: any[];');
	});
});

// ===========================================================================
// GraphQLSchemaGenerator
// ===========================================================================
describe('GraphQLSchemaGenerator — direct coverage', () => {
	test('null transformer → String! default', () => {
		const gql = GraphQLSchemaGenerator.generate(nullConfig());
		expect(gql).toContain('field: String!');
	});

	test('unknown transformer → String! default', () => {
		const gql = GraphQLSchemaGenerator.generate(unknownConfig());
		expect(gql).toContain('field: String!');
	});

	test('Boolean transformer → Boolean!', () => {
		const gql = GraphQLSchemaGenerator.generate(allTypesConfig());
		expect(gql).toContain('flag: Boolean!');
	});

	test('Object transformer → JSON!', () => {
		const gql = GraphQLSchemaGenerator.generate(allTypesConfig());
		expect(gql).toContain('obj: JSON!');
	});

	test('Map transformer → JSON!', () => {
		const gql = GraphQLSchemaGenerator.generate(allTypesConfig());
		expect(gql).toContain('mp: JSON!');
	});

	test('Array transformer → [String!]!', () => {
		const gql = GraphQLSchemaGenerator.generate(allTypesConfig());
		expect(gql).toContain('arr: [String!]!');
	});
});

// ===========================================================================
// OpenAPISchemaGenerator
// ===========================================================================
describe('OpenAPISchemaGenerator — direct coverage', () => {
	test('null transformer → { type: string } default', () => {
		const schema = OpenAPISchemaGenerator.generate(nullConfig());
		expect(schema.properties.field).toEqual({ type: 'string' });
	});

	test('unknown transformer → { type: string } default', () => {
		const schema = OpenAPISchemaGenerator.generate(unknownConfig());
		expect(schema.properties.field).toEqual({ type: 'string' });
	});

	test('Boolean transformer → { type: boolean }', () => {
		const schema = OpenAPISchemaGenerator.generate(allTypesConfig());
		expect(schema.properties.flag).toEqual({ type: 'boolean' });
	});

	test('Set/Array transformer → { type: array, items: { type: string } }', () => {
		const schema = OpenAPISchemaGenerator.generate(allTypesConfig());
		expect(schema.properties.se).toMatchObject({
			type: 'array',
			items: { type: 'string' },
		});
		expect(schema.properties.arr).toMatchObject({
			type: 'array',
			items: { type: 'string' },
		});
	});

	test('Map transformer → array of pair arrays', () => {
		const schema = OpenAPISchemaGenerator.generate(allTypesConfig());
		expect(schema.properties.mp).toMatchObject({
			type: 'array',
			items: { type: 'array', minItems: 2, maxItems: 2 },
		});
	});
});

// ===========================================================================
// AjvSchemaGenerator
// ===========================================================================
describe('AjvSchemaGenerator — direct coverage', () => {
	test('generates JSON-Schema without $schema property', () => {
		const schema = AjvSchemaGenerator.generate(allTypesConfig());
		expect(schema).not.toHaveProperty('$schema');
		expect(schema).toHaveProperty('type', 'object');
		expect(schema.properties.flag).toEqual({ type: 'boolean' }); // Boolean covered
		expect(schema.properties.mp).toMatchObject({ type: 'array' }); // Map covered
	});

	test('null transformer → { type: string } default', () => {
		const schema = AjvSchemaGenerator.generate(nullConfig());
		expect(schema.properties.field).toEqual({ type: 'string' });
	});

	test('unknown transformer → { type: string } default', () => {
		const schema = AjvSchemaGenerator.generate(unknownConfig());
		expect(schema.properties.field).toEqual({ type: 'string' });
	});
});

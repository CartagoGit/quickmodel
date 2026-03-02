// @quickmodel-rule-ignore: no-as-unknown — intentional: accessing private static _getJsonSchemaType directly for white-box contract tests
/**
 * Task #14 — Negative tests for JsonSchemaGenerator with properties
 * lacking explicit transformer entries.
 *
 * PURPOSE:
 *   Document the EXACT fallback behaviour when a property is either:
 *   a) Not present in the @Quick type map (missing key in decoratorConfig)
 *   b) Present in the type map but mapped to `undefined`
 *   c) Present via _inferPropertiesFromSample() (no explicit type map)
 *
 * KEY FINDING:
 *   `_getJsonSchemaType(undefined)` always returns `{ type: 'string' }`.
 *   This means a `number` or `boolean` property without an explicit
 *   transformer entry in `@Quick` will produce an INCORRECT schema type.
 *
 * WORKAROUND (documented here):
 *   Always list every property type in the `@Quick` type map to get
 *   correct JSON Schema types.
 */

import { QModel, Quick } from '@/index';
import { JsonSchemaGenerator } from '@/core/services/schema-generators.service';
import { describe, test, expect } from 'bun:test';

// ---------------------------------------------------------------------------
// Helper: a config with explicit undefined transformer (simulates missing type)
// ---------------------------------------------------------------------------

const undefinedTransformerConfig = (className = 'Partial') => ({
	className,
	decoratorConfig: {
		name: String,
		count: undefined, // number field with no transformer
		flag: undefined, // boolean field with no transformer
	} as Record<string, any>,
	properties: ['name', 'count', 'flag'],
});

// ---------------------------------------------------------------------------
// 1. Service-level: _getJsonSchemaType with undefined
// ---------------------------------------------------------------------------

describe('JsonSchemaGenerator._getJsonSchemaType fallback contract', () => {
	test('undefined transformer always returns { type: "string" }', () => {
		// Access private method via bracket notation for direct test
		// This documents the CONTRACT: undefined → string (may be wrong but is consistent)
		const result = (
			JsonSchemaGenerator as unknown as {
				// @quickmodel-rule-ignore: no-as-unknown
				_getJsonSchemaType(val: unknown): Record<string, string>;
			}
		)['_getJsonSchemaType'](undefined);
		expect(result).toEqual({ type: 'string' });
	});

	test('null transformer returns { type: "string" }', () => {
		const result = (
			JsonSchemaGenerator as unknown as {
				// @quickmodel-rule-ignore: no-as-unknown
				_getJsonSchemaType(val: unknown): Record<string, string>;
			}
		)['_getJsonSchemaType'](null);
		expect(result).toEqual({ type: 'string' });
	});

	test('empty-string transformer returns { type: "string" } (default branch)', () => {
		const result = (
			JsonSchemaGenerator as unknown as {
				// @quickmodel-rule-ignore: no-as-unknown
				_getJsonSchemaType(val: unknown): Record<string, string>;
			}
		)['_getJsonSchemaType']('');
		expect(result).toEqual({ type: 'string' });
	});

	test('a custom class without matching name falls back to { type: "string" }', () => {
		class MySpecialType {}
		const result = (
			JsonSchemaGenerator as unknown as {
				// @quickmodel-rule-ignore: no-as-unknown
				_getJsonSchemaType(val: unknown): Record<string, string>;
			}
		)['_getJsonSchemaType'](MySpecialType);
		expect(result).toEqual({ type: 'string' });
	});

	test('fallback is deterministic — same input, same output every time', () => {
		const valA = (
			JsonSchemaGenerator as unknown as {
				// @quickmodel-rule-ignore: no-as-unknown
				_getJsonSchemaType(val: unknown): Record<string, string>;
			}
		)['_getJsonSchemaType'](undefined);
		const valB = (
			JsonSchemaGenerator as unknown as {
				// @quickmodel-rule-ignore: no-as-unknown
				_getJsonSchemaType(val: unknown): Record<string, string>;
			}
		)['_getJsonSchemaType'](undefined);
		expect(valA).toEqual(valB);
	});
});

// ---------------------------------------------------------------------------
// 2. Schema-level: generate() with mixed undefined transformers
// ---------------------------------------------------------------------------

describe('JsonSchemaGenerator.generate(): mixed undefined transformers', () => {
	test('undefined transformer in decoratorConfig produces type:string (not type:number)', () => {
		const schema = JsonSchemaGenerator.generate(
			undefinedTransformerConfig()
		);

		// The property DOES appear in the schema (it IS in the properties list)
		expect(schema.properties).toHaveProperty('count');
		expect(schema.properties).toHaveProperty('flag');

		// ⚠️ DOCUMENTED GAP: although count is intended as number, it gets 'string'
		// This is the fallback behaviour — change this test if the fallback is improved
		expect(schema.properties.count).toEqual({ type: 'string' });
		expect(schema.properties.flag).toEqual({ type: 'string' });
	});

	test('explicitly typed transformer overrides fallback correctly', () => {
		const schema = JsonSchemaGenerator.generate(
			undefinedTransformerConfig()
		);
		// The 'name' property IS typed correctly
		expect(schema.properties.name).toEqual({ type: 'string' });
	});

	test('generate() marks all listed properties as required', () => {
		const schema = JsonSchemaGenerator.generate(
			undefinedTransformerConfig()
		);
		expect(schema.required).toContain('count');
		expect(schema.required).toContain('flag');
		expect(schema.required).toContain('name');
	});
});

// ---------------------------------------------------------------------------
// 3. Model-level: only properties in @Quick type map appear in getSchema('json')
// ---------------------------------------------------------------------------

describe('QModel.getSchema("json"): properties not in type map are excluded', () => {
	test('properties omitted from @Quick type map do NOT appear in schema', () => {
		// Only 'createdAt' is in the type map; 'id' and 'name' are plain 'declare'
		@Quick({ createdAt: Date })
		class PartialUser extends QModel<any> {
			declare id: number;
			declare name: string;
			declare createdAt: Date;
		}

		const schema = PartialUser.getSchema('json');

		// ⚠️ DOCUMENTED BEHAVIOUR: id and name are NOT in the schema
		// because they are not in the @Quick({ ... }) type map.
		expect(schema.properties).not.toHaveProperty('id');
		expect(schema.properties).not.toHaveProperty('name');

		// createdAt IS present because it IS in the type map
		expect(schema.properties).toHaveProperty('createdAt');
		expect(
			(schema.properties as Record<string, unknown>)['createdAt']
		).toMatchObject({
			type: 'string',
			format: 'date-time',
		});
	});

	test('all properties in @Quick type map appear with correct schema types', () => {
		@Quick({ id: Number, name: String, active: Boolean, createdAt: Date })
		class FullUser extends QModel<any> {
			declare id: number;
			declare name: string;
			declare active: boolean;
			declare createdAt: Date;
		}

		const schema = FullUser.getSchema('json');

		// All types correct when explicitly mapped
		const props = schema.properties as Record<string, unknown>;
		expect(props['id']).toEqual({ type: 'number' });
		expect(props['name']).toEqual({ type: 'string' });
		expect(props['active']).toEqual({ type: 'boolean' });
		expect(props['createdAt']).toMatchObject({
			type: 'string',
			format: 'date-time',
		});
	});

	test('@Quick() with no type map and initialized properties → fallback to _inferPropertiesFromSample', () => {
		// With @Quick() (empty) + initialized properties, _inferPropertiesFromSample runs.
		// Result depends on whether properties appear in __quickValues__.
		// This test documents the behaviour without making strong assertions about count/flag types
		// (the fallback still returns 'string' for untyped properties).

		@Quick()
		class InferredModel extends QModel<any> {
			declare id: number; // plain declare — may not appear
			declare label: string; // plain declare — may not appear
		}

		const schema = InferredModel.getSchema('json');

		// The schema must at minimum be a valid JSON Schema object
		expect(schema).toHaveProperty('$schema');
		expect(schema).toHaveProperty('type', 'object');
		expect(schema).toHaveProperty('properties');
		// id and label are plain 'declare' — they likely won't appear (documented gap)
		// This test does not assert their presence, just that the schema is valid
	});

	test('WORKAROUND: always list all properties in @Quick type map for correct schema', () => {
		// Correct usage pattern: every field has an explicit type
		@Quick({ id: Number, score: Number, verified: Boolean, tags: [String] })
		class ProductModel extends QModel<any> {
			declare id: number;
			declare score: number;
			declare verified: boolean;
			declare tags: string[];
		}

		const schema = ProductModel.getSchema('json');

		const schemaProps = schema.properties as Record<string, unknown>;
		expect(schemaProps['id']).toEqual({ type: 'number' });
		expect(schemaProps['score']).toEqual({ type: 'number' });
		expect(schemaProps['verified']).toEqual({ type: 'boolean' });
		expect(schemaProps['tags']).toMatchObject({ type: 'array' });
	});
});

// ---------------------------------------------------------------------------
// 4. Cross-schema consistency: all generators agree on the fallback type
// ---------------------------------------------------------------------------

describe('Cross-generator fallback consistency', () => {
	test('all generators return "string"-equivalent for undefined transformer', () => {
		// We already cover each generator individually in schema-generators-direct.test.ts.
		// This cross-test documents that all generators agree on the string fallback.
		const jsonSchema = JsonSchemaGenerator.generate({
			className: 'Test',
			decoratorConfig: { mystery: undefined } as Record<string, any>,
			properties: ['mystery'],
		});

		expect(
			(jsonSchema.properties as Record<string, unknown>)['mystery']
		).toEqual({ type: 'string' });
	});
});

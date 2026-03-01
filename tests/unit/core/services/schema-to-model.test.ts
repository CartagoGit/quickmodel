/**
 * TDD Tests: SchemaToModelService
 *
 * Convierte cualquier schema generado por getSchema() de vuelta en código fuente TypeScript
 * de una clase QModel.
 *
 * @see {@link SchemaToModelService}
 * @see {@link QModel.fromSchema} — método estático que envuelve este servicio
 */
import { describe, test, expect } from 'bun:test';
import { SchemaToModelService } from '@/core/services/schema-to-model.service';

// ── JSON Schema básico ──────────────────────────────────────────────────────

const simpleJsonSchema = {
	type: 'object',
	title: 'User',
	properties: {
		id: { type: 'number' },
		name: { type: 'string' },
		active: { type: 'boolean' },
	},
	required: ['id', 'name'],
};

describe("SchemaToModelService.fromSchema('json') \u2014 tipos primitivos", () => {
	test('genera una clase con extends QModel', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('extends QModel<IUser>');
	});

	test('genera @Quick con transformers para Number y Boolean', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('id: Number');
		expect(code).toContain('active: Boolean');
	});

	test('String no aparece en @Quick (es el transformer por defecto)', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).not.toMatch(/name:\s*String[\s,\n]/);
	});

	test('genera declare para cada propiedad', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('declare id: number;');
		expect(code).toContain('declare name: string;');
		expect(code).toContain('declare active: boolean;');
	});

	test('genera interfaz IUser con los tipos correctos', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('interface IUser');
		expect(code).toContain('id: number;');
		expect(code).toContain('name: string;');
	});

	test('campos no-required son opcionales en la interfaz', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('active?: boolean;');
	});

	test('campos required NO son opcionales en la interfaz', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).toMatch(/id:\s*number;/);
		expect(code).not.toMatch(/id\?:/);
	});

	test('incluye import de quickmodel', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain("from 'quickmodel'");
	});
});

// ── Date y formato date-time ────────────────────────────────────────────────

const dateSchema = {
	type: 'object',
	title: 'Event',
	properties: {
		name: { type: 'string' },
		startedAt: { type: 'string', format: 'date-time' },
		createdAt: { type: 'string', format: 'date' },
		description: { type: 'string' },
	},
};

describe("SchemaToModelService.fromSchema('json') \u2014 Date", () => {
	test('string/date-time \u2192 transformer Date', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			dateSchema,
			'Event'
		);
		expect(code).toContain('startedAt: Date');
	});

	test('string/date \u2192 transformer Date', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			dateSchema,
			'Event'
		);
		expect(code).toContain('createdAt: Date');
	});

	test('campos Date en declare tienen tipo Date', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			dateSchema,
			'Event'
		);
		expect(code).toContain('declare startedAt: Date;');
		expect(code).toContain('declare createdAt: Date;');
	});

	test('string sin format \u2192 tipo string en declare', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			dateSchema,
			'Event'
		);
		expect(code).toContain('declare name: string;');
		expect(code).toContain('declare description: string;');
	});
});

// ── Arrays ──────────────────────────────────────────────────────────────────

const arraySchema = {
	type: 'object',
	title: 'Collection',
	properties: {
		tags: { type: 'array', items: { type: 'string' } },
		scores: { type: 'array', items: { type: 'number' } },
		flags: { type: 'array', items: { type: 'boolean' } },
		dates: {
			type: 'array',
			items: { type: 'string', format: 'date-time' },
		},
		misc: { type: 'array' },
	},
};

describe("SchemaToModelService.fromSchema('json') \u2014 Arrays", () => {
	test('array<string> \u2192 [String] en @Quick', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			arraySchema,
			'Collection'
		);
		expect(code).toContain('tags: [String]');
	});

	test('array<number> \u2192 [Number] en @Quick', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			arraySchema,
			'Collection'
		);
		expect(code).toContain('scores: [Number]');
	});

	test('array<boolean> \u2192 [Boolean] en @Quick', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			arraySchema,
			'Collection'
		);
		expect(code).toContain('flags: [Boolean]');
	});

	test('array<date-time> \u2192 [Date] en @Quick', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			arraySchema,
			'Collection'
		);
		expect(code).toContain('dates: [Date]');
	});

	test('declare de arrays tienen tipo correcto', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			arraySchema,
			'Collection'
		);
		expect(code).toContain('declare tags: string[];');
		expect(code).toContain('declare scores: number[];');
		expect(code).toContain('declare flags: boolean[];');
		expect(code).toContain('declare dates: Date[];');
	});

	test('array sin items \u2192 unknown[] en declare, sin transformer en @Quick', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			arraySchema,
			'Collection'
		);
		expect(code).toContain('declare misc: unknown[];');
	});
});

// ── BigInt ──────────────────────────────────────────────────────────────────

const bigintSchema = {
	type: 'object',
	title: 'Finance',
	properties: {
		amount: { type: 'integer', format: 'int64' },
		balance: { type: 'string', format: 'bigint' },
	},
};

describe("SchemaToModelService.fromSchema('json') \u2014 BigInt", () => {
	test('integer/int64 \u2192 transformer BigInt', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			bigintSchema,
			'Finance'
		);
		expect(code).toContain('amount: BigInt');
	});

	test('string/bigint \u2192 transformer BigInt', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			bigintSchema,
			'Finance'
		);
		expect(code).toContain('balance: BigInt');
	});
});

// ── integer normal (no BigInt) ───────────────────────────────────────────────

const intSchema = {
	type: 'object',
	title: 'Counter',
	properties: {
		count: { type: 'integer' },
		rank: { type: 'integer', format: 'int32' },
	},
};

describe("SchemaToModelService.fromSchema('json') \u2014 integer sin BigInt", () => {
	test('integer sin format \u2192 Number', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			intSchema,
			'Counter'
		);
		expect(code).toContain('count: Number');
	});

	test('integer/int32 \u2192 Number (no BigInt)', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			intSchema,
			'Counter'
		);
		expect(code).toContain('rank: Number');
	});
});

// ── className inferido desde title ──────────────────────────────────────────

describe("SchemaToModelService.fromSchema('json') \u2014 className inferido", () => {
	test('infiere className desde schema.title si no se provee', () => {
		const schema = {
			type: 'object',
			title: 'Product',
			properties: { price: { type: 'number' } },
		};
		const code = SchemaToModelService.fromSchema('json', schema);
		expect(code).toContain('class Product extends QModel');
	});

	test('usa "GeneratedModel" si no hay title ni className', () => {
		const schema = {
			type: 'object',
			properties: { val: { type: 'string' } },
		};
		const code = SchemaToModelService.fromSchema('json', schema);
		expect(code).toContain('class GeneratedModel extends QModel');
	});
});

// ── fromSchema('openapi') ────────────────────────────────────────────────────

describe("SchemaToModelService.fromSchema('openapi')", () => {
	test('extrae el primer esquema de components.schemas', () => {
		const openapi = {
			components: {
				schemas: {
					User: {
						type: 'object',
						properties: {
							id: { type: 'number' },
							name: { type: 'string' },
						},
					},
				},
			},
		};
		const code = SchemaToModelService.fromSchema(
			'openapi',
			openapi,
			'User'
		);
		expect(code).toContain('class User extends QModel<IUser>');
		expect(code).toContain('id: Number');
	});

	test('acepta un esquema OpenAPI directo (sin components)', () => {
		const schema = {
			type: 'object',
			title: 'Order',
			properties: { total: { type: 'number' }, ref: { type: 'string' } },
		};
		const code = SchemaToModelService.fromSchema(
			'openapi',
			schema,
			'Order'
		);
		expect(code).toContain('class Order extends QModel<IOrder>');
	});

	test('lanza error si className no est\u00e1 en components.schemas', () => {
		const openapi = {
			components: {
				schemas: { Product: { type: 'object', properties: {} } },
			},
		};
		expect(() =>
			SchemaToModelService.fromSchema('openapi', openapi, 'Unknown')
		).toThrow();
	});
});

// ── fromSchema('ajv') — mismo comportamiento que 'json' ──────────────────────

describe("SchemaToModelService.fromSchema('ajv')", () => {
	test('ajv procesa primitivos igual que json', () => {
		const ajvSchema = {
			type: 'object',
			title: 'Widget',
			properties: {
				count: { type: 'integer' },
				label: { type: 'string' },
				active: { type: 'boolean' },
			},
			required: ['count'],
		};
		const code = SchemaToModelService.fromSchema(
			'ajv',
			ajvSchema,
			'Widget'
		);
		expect(code).toContain('class Widget extends QModel<IWidget>');
		expect(code).toContain('count: Number');
		expect(code).toContain('active: Boolean');
		expect(code).toContain('declare label: string;');
	});

	test('ajv procesa Date igual que json', () => {
		const ajvSchema = {
			type: 'object',
			properties: {
				name: { type: 'string' },
				created: { type: 'string', format: 'date-time' },
			},
		};
		const code = SchemaToModelService.fromSchema(
			'ajv',
			ajvSchema,
			'Record'
		);
		expect(code).toContain('created: Date');
		expect(code).toContain('declare created: Date;');
	});

	test('ajv infiere className desde title si no se pasa', () => {
		const ajvSchema = {
			type: 'object',
			title: 'ItemAJV',
			properties: { val: { type: 'number' } },
		};
		const code = SchemaToModelService.fromSchema('ajv', ajvSchema);
		expect(code).toContain('class ItemAJV extends QModel');
	});
});

// ── fromSchema('typescript') ─────────────────────────────────────────────────

describe("SchemaToModelService.fromSchema('typescript')", () => {
	const userInterface = [
		'interface IUser {',
		'  id: number;',
		'  name: string;',
		'  active: boolean;',
		'  createdAt: Date;',
		'}',
	].join('\n');

	test('genera class con extends QModel inferido desde IUser', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			userInterface
		);
		expect(code).toContain('class User extends QModel<IUser>');
	});

	test('produce @Quick con transformers para Number, Boolean, Date', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			userInterface
		);
		expect(code).toContain('id: Number');
		expect(code).toContain('active: Boolean');
		expect(code).toContain('createdAt: Date');
	});

	test('produce declare para cada campo', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			userInterface
		);
		expect(code).toContain('declare id: number;');
		expect(code).toContain('declare name: string;');
		expect(code).toContain('declare active: boolean;');
		expect(code).toContain('declare createdAt: Date;');
	});

	test('respeta optionalidad de campos', () => {
		const src = [
			'interface IPost {',
			'  title: string;',
			'  content?: string;',
			'}',
		].join('\n');
		const code = SchemaToModelService.fromSchema('typescript', src, 'Post');
		expect(code).toContain('title: string;');
		expect(code).toContain('content?: string;');
	});

	test('infiere BigInt desde bigint', () => {
		const src = ['interface IBig {', '  amount: bigint;', '}'].join('\n');
		const code = SchemaToModelService.fromSchema('typescript', src, 'Big');
		expect(code).toContain('amount: BigInt');
		expect(code).toContain('declare amount: bigint;');
	});

	test('acepta className expl\u00edcito sobrescribiendo el del interface', () => {
		const src = ['interface ISomeModel {', '  value: number;', '}'].join(
			'\n'
		);
		const code = SchemaToModelService.fromSchema(
			'typescript',
			src,
			'Custom'
		);
		expect(code).toContain('class Custom extends QModel<ICustom>');
	});

	test('lanza error si no hay interface en el c\u00f3digo fuente', () => {
		expect(() =>
			SchemaToModelService.fromSchema(
				'typescript',
				'const val = 42;',
				'Foo'
			)
		).toThrow(/no interface declaration/);
	});
});

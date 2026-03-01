/**
 * TDD Tests: SchemaToModelService
 *
 * Convierte un JSON Schema / OpenAPI component schema en código fuente TypeScript
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

describe('SchemaToModelService.fromJsonSchema — tipos primitivos', () => {
	test('genera una clase con extends QModel', () => {
		const code = SchemaToModelService.fromJsonSchema(
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('extends QModel<IUser>');
	});

	test('genera @Quick con transformers para Number y Boolean', () => {
		const code = SchemaToModelService.fromJsonSchema(
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('id: Number');
		expect(code).toContain('active: Boolean');
	});

	test('String no aparece en @Quick (es el transformer por defecto)', () => {
		const code = SchemaToModelService.fromJsonSchema(
			simpleJsonSchema,
			'User'
		);
		// 'name' es string — no necesita transformer en @Quick
		expect(code).not.toMatch(/name:\s*String[\s,\n]/);
	});

	test('genera declare para cada propiedad', () => {
		const code = SchemaToModelService.fromJsonSchema(
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('declare id: number;');
		expect(code).toContain('declare name: string;');
		expect(code).toContain('declare active: boolean;');
	});

	test('genera interfaz IUser con los tipos correctos', () => {
		const code = SchemaToModelService.fromJsonSchema(
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('interface IUser');
		expect(code).toContain('id: number;');
		expect(code).toContain('name: string;');
	});

	test('campos no-required son opcionales en la interfaz', () => {
		const code = SchemaToModelService.fromJsonSchema(
			simpleJsonSchema,
			'User'
		);
		expect(code).toContain('active?: boolean;');
	});

	test('campos required NO son opcionales en la interfaz', () => {
		const code = SchemaToModelService.fromJsonSchema(
			simpleJsonSchema,
			'User'
		);
		expect(code).toMatch(/id:\s*number;/);
		expect(code).not.toMatch(/id\?:/);
	});

	test('incluye import de quickmodel', () => {
		const code = SchemaToModelService.fromJsonSchema(
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

describe('SchemaToModelService.fromJsonSchema — Date', () => {
	test('string/date-time → transformer Date', () => {
		const code = SchemaToModelService.fromJsonSchema(dateSchema, 'Event');
		expect(code).toContain('startedAt: Date');
	});

	test('string/date → transformer Date', () => {
		const code = SchemaToModelService.fromJsonSchema(dateSchema, 'Event');
		expect(code).toContain('createdAt: Date');
	});

	test('campos Date en declare tienen tipo Date', () => {
		const code = SchemaToModelService.fromJsonSchema(dateSchema, 'Event');
		expect(code).toContain('declare startedAt: Date;');
		expect(code).toContain('declare createdAt: Date;');
	});

	test('string sin format → tipo string en declare', () => {
		const code = SchemaToModelService.fromJsonSchema(dateSchema, 'Event');
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

describe('SchemaToModelService.fromJsonSchema — Arrays', () => {
	test('array<string> → [String] en @Quick', () => {
		const code = SchemaToModelService.fromJsonSchema(
			arraySchema,
			'Collection'
		);
		expect(code).toContain('tags: [String]');
	});

	test('array<number> → [Number] en @Quick', () => {
		const code = SchemaToModelService.fromJsonSchema(
			arraySchema,
			'Collection'
		);
		expect(code).toContain('scores: [Number]');
	});

	test('array<boolean> → [Boolean] en @Quick', () => {
		const code = SchemaToModelService.fromJsonSchema(
			arraySchema,
			'Collection'
		);
		expect(code).toContain('flags: [Boolean]');
	});

	test('array<date-time> → [Date] en @Quick', () => {
		const code = SchemaToModelService.fromJsonSchema(
			arraySchema,
			'Collection'
		);
		expect(code).toContain('dates: [Date]');
	});

	test('declare de arrays tienen tipo correcto', () => {
		const code = SchemaToModelService.fromJsonSchema(
			arraySchema,
			'Collection'
		);
		expect(code).toContain('declare tags: string[];');
		expect(code).toContain('declare scores: number[];');
		expect(code).toContain('declare flags: boolean[];');
		expect(code).toContain('declare dates: Date[];');
	});

	test('array sin items → unknown[] en declare, sin transformer en @Quick', () => {
		const code = SchemaToModelService.fromJsonSchema(
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

describe('SchemaToModelService.fromJsonSchema — BigInt', () => {
	test('integer/int64 → transformer BigInt', () => {
		const code = SchemaToModelService.fromJsonSchema(
			bigintSchema,
			'Finance'
		);
		expect(code).toContain('amount: BigInt');
	});

	test('string/bigint → transformer BigInt', () => {
		const code = SchemaToModelService.fromJsonSchema(
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

describe('SchemaToModelService.fromJsonSchema — integer sin BigInt', () => {
	test('integer sin format → Number', () => {
		const code = SchemaToModelService.fromJsonSchema(intSchema, 'Counter');
		expect(code).toContain('count: Number');
	});

	test('integer/int32 → Number (no BigInt)', () => {
		const code = SchemaToModelService.fromJsonSchema(intSchema, 'Counter');
		expect(code).toContain('rank: Number');
	});
});

// ── className inferido desde title ──────────────────────────────────────────

describe('SchemaToModelService.fromJsonSchema — className inferido', () => {
	test('infiere className desde schema.title si no se provee', () => {
		const schema = {
			type: 'object',
			title: 'Product',
			properties: { price: { type: 'number' } },
		};
		const code = SchemaToModelService.fromJsonSchema(schema);
		expect(code).toContain('class Product extends QModel');
	});

	test('usa "GeneratedModel" si no hay title ni className', () => {
		const schema = {
			type: 'object',
			properties: { val: { type: 'string' } },
		};
		const code = SchemaToModelService.fromJsonSchema(schema);
		expect(code).toContain('class GeneratedModel extends QModel');
	});
});

// ── fromOpenApiSchema ────────────────────────────────────────────────────────

describe('SchemaToModelService.fromOpenApiSchema', () => {
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
		const code = SchemaToModelService.fromOpenApiSchema(openapi, 'User');
		expect(code).toContain('class User extends QModel<IUser>');
		expect(code).toContain('id: Number');
	});

	test('acepta un esquema OpenAPI directo (sin components)', () => {
		const schema = {
			type: 'object',
			title: 'Order',
			properties: { total: { type: 'number' }, ref: { type: 'string' } },
		};
		const code = SchemaToModelService.fromOpenApiSchema(schema, 'Order');
		expect(code).toContain('class Order extends QModel<IOrder>');
	});

	test('lanza error si className no está en components.schemas', () => {
		const openapi = {
			components: {
				schemas: { Product: { type: 'object', properties: {} } },
			},
		};
		expect(() =>
			SchemaToModelService.fromOpenApiSchema(openapi, 'Unknown')
		).toThrow();
	});
});

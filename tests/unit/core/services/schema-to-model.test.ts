/**
 * TDD Tests: SchemaToModelService
 *
 * Verifica que `fromSchema(format, schema, className?)` — inverso de `getSchema()` —
 * produce código TypeScript correcto para todos los formatos soportados:
 * json · openapi · ajv · typescript
 *
 * @see {@link SchemaToModelService}
 * @see {@link QModel.fromSchema} — entry point estático en QModel
 */
import { describe, test, expect } from 'bun:test';
import { SchemaToModelService } from '@/core/services/schema-to-model.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Fabricar código desde un JSON Schema con valores por defecto cómodos. */
function jsonCode(
	props: Record<string, unknown>,
	opts: { required?: string[]; title?: string; className?: string } = {}
): string {
	return SchemaToModelService.fromSchema(
		'json',
		{
			type: 'object',
			title: opts.title,
			properties: props,
			required: opts.required,
		},
		opts.className
	);
}

// ── fromSchema('json') — tipos primitivos ────────────────────────────────────

describe("fromSchema('json') — primitivos", () => {
	const schema = {
		type: 'object',
		title: 'User',
		properties: {
			id: { type: 'number' },
			name: { type: 'string' },
			active: { type: 'boolean' },
		},
		required: ['id', 'name'],
	};

	test('genera class que extiende QModel con generic correcto', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toContain('export class User extends QModel<IUser>');
	});

	test('genera interfaz IUser', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toContain('interface IUser {');
	});

	test('number → transformer Number en @Quick', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toContain('id: Number');
	});

	test('boolean → transformer Boolean en @Quick', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toContain('active: Boolean');
	});

	test('string no aparece como transformer en @Quick (es el default)', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).not.toMatch(/name:\s*String[\s,\n]/);
	});

	test('genera declare para cada propiedad', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toContain('declare id: number;');
		expect(code).toContain('declare name: string;');
		expect(code).toContain('declare active: boolean;');
	});

	test('campos required → no opcionales en la interfaz', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toMatch(/\bid: number;/);
		expect(code).not.toMatch(/\bid\?:/);
		expect(code).toMatch(/\bname: string;/);
	});

	test('campos no-required → opcionales en la interfaz', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toContain('active?: boolean;');
	});

	test("incluye import { QModel, Quick } from 'quickmodel'", () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'User');
		expect(code).toContain("import { QModel, Quick } from 'quickmodel'");
	});

	test('@Quick({}) cuando no hay transformers (solo strings)', () => {
		const code = jsonCode(
			{ first: { type: 'string' }, last: { type: 'string' } },
			{ className: 'Name' }
		);
		expect(code).toContain('@Quick({})');
		expect(code).not.toMatch(/@Quick\(\{\s*\w+:/);
	});

	test('type object → Record<string, unknown>', () => {
		const code = jsonCode(
			{ meta: { type: 'object' } },
			{ className: 'Doc' }
		);
		expect(code).toContain('declare meta: Record<string, unknown>;');
	});

	test('tipo desconocido → unknown', () => {
		const code = jsonCode({ raw: { type: 'null' } }, { className: 'Doc' });
		expect(code).toContain('declare raw: unknown;');
	});

	test('schema sin propiedades → clase vacía válida', () => {
		const code = SchemaToModelService.fromSchema(
			'json',
			{ type: 'object' },
			'Empty'
		);
		expect(code).toContain('export class Empty extends QModel<IEmpty>');
		expect(code).toContain('@Quick({})');
	});
});

// ── fromSchema('json') — Date ────────────────────────────────────────────────

describe("fromSchema('json') — Date", () => {
	const schema = {
		type: 'object',
		properties: {
			name: { type: 'string' },
			startedAt: { type: 'string', format: 'date-time' },
			createdAt: { type: 'string', format: 'date' },
		},
	};

	test('string/date-time → transformer Date', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Event');
		expect(code).toContain('startedAt: Date');
	});

	test('string/date → transformer Date', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Event');
		expect(code).toContain('createdAt: Date');
	});

	test('declare tiene tipo Date', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Event');
		expect(code).toContain('declare startedAt: Date;');
		expect(code).toContain('declare createdAt: Date;');
	});

	test('string sin format → tipo string', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Event');
		expect(code).toContain('declare name: string;');
	});
});

// ── fromSchema('json') — BigInt ──────────────────────────────────────────────

describe("fromSchema('json') — BigInt", () => {
	const schema = {
		type: 'object',
		properties: {
			amount: { type: 'integer', format: 'int64' },
			balance: { type: 'string', format: 'bigint' },
			count: { type: 'integer' },
			rank: { type: 'integer', format: 'int32' },
		},
	};

	test('integer/int64 → transformer BigInt', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Finance');
		expect(code).toContain('amount: BigInt');
		expect(code).toContain('declare amount: bigint;');
	});

	test('string/bigint → transformer BigInt', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Finance');
		expect(code).toContain('balance: BigInt');
		expect(code).toContain('declare balance: bigint;');
	});

	test('integer sin format → Number (no BigInt)', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Finance');
		expect(code).toContain('count: Number');
		expect(code).toContain('declare count: number;');
	});

	test('integer/int32 → Number (no BigInt)', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Finance');
		expect(code).toContain('rank: Number');
		expect(code).toContain('declare rank: number;');
	});
});

// ── fromSchema('json') — Arrays ──────────────────────────────────────────────

describe("fromSchema('json') — Arrays", () => {
	const schema = {
		type: 'object',
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

	test('array<string> → [String] en @Quick', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Coll');
		expect(code).toContain('tags: [String]');
		expect(code).toContain('declare tags: string[];');
	});

	test('array<number> → [Number] en @Quick', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Coll');
		expect(code).toContain('scores: [Number]');
		expect(code).toContain('declare scores: number[];');
	});

	test('array<boolean> → [Boolean] en @Quick', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Coll');
		expect(code).toContain('flags: [Boolean]');
		expect(code).toContain('declare flags: boolean[];');
	});

	test('array<date-time> → [Date] en @Quick', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Coll');
		expect(code).toContain('dates: [Date]');
		expect(code).toContain('declare dates: Date[];');
	});

	test('array sin items → unknown[], sin transformer', () => {
		const code = SchemaToModelService.fromSchema('json', schema, 'Coll');
		expect(code).toContain('declare misc: unknown[];');
		expect(code).not.toMatch(/misc:\s*\[/);
	});
});

// ── fromSchema('json') — className ───────────────────────────────────────────

describe("fromSchema('json') — className", () => {
	test('infiere className desde schema.title', () => {
		const schema = {
			type: 'object',
			title: 'Product',
			properties: { price: { type: 'number' } },
		};
		const code = SchemaToModelService.fromSchema('json', schema);
		expect(code).toContain('export class Product extends QModel<IProduct>');
	});

	test('usa "GeneratedModel" cuando no hay title ni className', () => {
		const schema = {
			type: 'object',
			properties: { val: { type: 'string' } },
		};
		const code = SchemaToModelService.fromSchema('json', schema);
		expect(code).toContain(
			'export class GeneratedModel extends QModel<IGeneratedModel>'
		);
	});

	test('className explícito tiene prioridad sobre title', () => {
		const schema = {
			type: 'object',
			title: 'OldName',
			properties: { val: { type: 'string' } },
		};
		const code = SchemaToModelService.fromSchema('json', schema, 'NewName');
		expect(code).toContain('export class NewName extends QModel<INewName>');
		expect(code).not.toContain('OldName');
	});
});

// ── fromSchema('openapi') ────────────────────────────────────────────────────

describe("fromSchema('openapi')", () => {
	const openapiDoc = {
		components: {
			schemas: {
				User: {
					type: 'object',
					properties: {
						id: { type: 'number' },
						email: { type: 'string' },
					},
					required: ['id'],
				},
				Order: {
					type: 'object',
					properties: { total: { type: 'number' } },
				},
			},
		},
	};

	test('extrae esquema por className en components.schemas', () => {
		const code = SchemaToModelService.fromSchema(
			'openapi',
			openapiDoc,
			'User'
		);
		expect(code).toContain('export class User extends QModel<IUser>');
		expect(code).toContain('id: Number');
		expect(code).toContain('declare email: string;');
	});

	test('auto-selecciona el primer key cuando no se da className', () => {
		const code = SchemaToModelService.fromSchema('openapi', openapiDoc);
		// El primer key es 'User'
		expect(code).toContain('export class User extends QModel<IUser>');
	});

	test('puede extraer un esquema distinto del primero por className', () => {
		const code = SchemaToModelService.fromSchema(
			'openapi',
			openapiDoc,
			'Order'
		);
		expect(code).toContain('export class Order extends QModel<IOrder>');
	});

	test('acepta esquema bare sin components (como JSON Schema)', () => {
		const schema = {
			type: 'object',
			title: 'Invoice',
			properties: { ref: { type: 'string' } },
		};
		const code = SchemaToModelService.fromSchema(
			'openapi',
			schema,
			'Invoice'
		);
		expect(code).toContain('export class Invoice extends QModel<IInvoice>');
	});

	test('infiere className desde title en schema bare sin components', () => {
		const schema = {
			type: 'object',
			title: 'Receipt',
			properties: { total: { type: 'number' } },
		};
		const code = SchemaToModelService.fromSchema('openapi', schema);
		expect(code).toContain('export class Receipt extends QModel<IReceipt>');
	});

	test('lanza error si className no existe en components.schemas', () => {
		expect(() =>
			SchemaToModelService.fromSchema('openapi', openapiDoc, 'Unknown')
		).toThrow(/not found in.*components\.schemas/i);
	});
});

// ── fromSchema('ajv') — equivalente a 'json' ─────────────────────────────────

describe("fromSchema('ajv')", () => {
	test('procesa primitivos igual que json', () => {
		const schema = {
			type: 'object',
			title: 'Widget',
			properties: {
				count: { type: 'integer' },
				label: { type: 'string' },
				active: { type: 'boolean' },
			},
			required: ['count'],
		};
		const code = SchemaToModelService.fromSchema('ajv', schema, 'Widget');
		expect(code).toContain('export class Widget extends QModel<IWidget>');
		expect(code).toContain('count: Number');
		expect(code).toContain('active: Boolean');
		expect(code).toContain('declare label: string;');
		expect(code).toContain('count: number;');
		expect(code).toContain('label?: string;');
	});

	test('procesa Date igual que json', () => {
		const schema = {
			type: 'object',
			properties: { created: { type: 'string', format: 'date-time' } },
		};
		const code = SchemaToModelService.fromSchema('ajv', schema, 'Rec');
		expect(code).toContain('created: Date');
		expect(code).toContain('declare created: Date;');
	});

	test('procesa arrays igual que json', () => {
		const schema = {
			type: 'object',
			properties: {
				tags: { type: 'array', items: { type: 'string' } },
				scores: { type: 'array', items: { type: 'number' } },
			},
		};
		const code = SchemaToModelService.fromSchema('ajv', schema, 'Bag');
		expect(code).toContain('tags: [String]');
		expect(code).toContain('scores: [Number]');
		expect(code).toContain('declare tags: string[];');
	});

	test('@Quick({}) cuando todas las propiedades son string', () => {
		const schema = {
			type: 'object',
			properties: { name: { type: 'string' } },
		};
		const code = SchemaToModelService.fromSchema('ajv', schema, 'Plain');
		expect(code).toContain('@Quick({})');
	});

	test('infiere className desde title', () => {
		const schema = {
			type: 'object',
			title: 'ItemAJV',
			properties: { val: { type: 'number' } },
		};
		const code = SchemaToModelService.fromSchema('ajv', schema);
		expect(code).toContain('export class ItemAJV extends QModel<IItemAJV>');
	});
});

// ── fromSchema('typescript') ─────────────────────────────────────────────────

describe("fromSchema('typescript')", () => {
	// Interface construida con campos representativos de todos los transformers
	const fullInterface = [
		'interface IUser {',
		'  id: number;',
		'  name: string;',
		'  active: boolean;',
		'  createdAt: Date;',
		'  balance: bigint;',
		'  pattern: RegExp;',
		'  tags: Set<string>;',
		'  index: Map<string, number>;',
		'  homepage: URL;',
		'}',
	].join('\n');

	test('infiere class User desde IUser (elimina prefijo I)', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('export class User extends QModel<IUser>');
	});

	test('number → Number', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('id: Number');
		expect(code).toContain('declare id: number;');
	});

	test('boolean → Boolean', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('active: Boolean');
		expect(code).toContain('declare active: boolean;');
	});

	test('Date → Date', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('createdAt: Date');
		expect(code).toContain('declare createdAt: Date;');
	});

	test('bigint → BigInt', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('balance: BigInt');
		expect(code).toContain('declare balance: bigint;');
	});

	test('RegExp → RegExp', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('pattern: RegExp');
		expect(code).toContain('declare pattern: RegExp;');
	});

	test('Set<...> → Set', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('tags: Set');
		expect(code).toContain('declare tags: Set<string>;');
	});

	test('Map<...> → Map', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('index: Map');
		expect(code).toContain('declare index: Map<string, number>;');
	});

	test('URL → URL', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).toContain('homepage: URL');
		expect(code).toContain('declare homepage: URL;');
	});

	test('string no produce transformer → @Quick solo tiene el resto', () => {
		const code = SchemaToModelService.fromSchema(
			'typescript',
			fullInterface
		);
		expect(code).not.toMatch(/name:\s*String[\s,\n]/);
	});

	test('arrays tipados → transformer correcto [Number], [Date]', () => {
		const src = [
			'interface IReport {',
			'  scores: number[];',
			'  dates: Date[];',
			'  labels: string[];',
			'}',
		].join('\n');
		const code = SchemaToModelService.fromSchema('typescript', src);
		expect(code).toContain('scores: [Number]');
		expect(code).toContain('dates: [Date]');
		expect(code).toContain('declare scores: number[];');
		expect(code).toContain('declare dates: Date[];');
		// string[] → sin transformer (default)
		expect(code).not.toMatch(/labels:\s*\[String\]/);
	});

	test('campos opcionales mantienen ? en la interfaz generada', () => {
		const src = [
			'interface IPost {',
			'  title: string;',
			'  content?: string;',
			'  author?: number;',
			'}',
		].join('\n');
		const code = SchemaToModelService.fromSchema('typescript', src, 'Post');
		expect(code).toContain('title: string;');
		expect(code).toContain('content?: string;');
		expect(code).toContain('author?: number;');
	});

	test('className explícito tiene prioridad sobre el nombre del interface', () => {
		const src = ['interface ISomeModel {', '  value: number;', '}'].join(
			'\n'
		);
		const code = SchemaToModelService.fromSchema(
			'typescript',
			src,
			'Custom'
		);
		expect(code).toContain('export class Custom extends QModel<ICustom>');
		expect(code).not.toContain('SomeModel');
	});

	test('interface sin prefijo I → nombre de clase = nombre del interface', () => {
		const src = ['interface Person {', '  age: number;', '}'].join('\n');
		const code = SchemaToModelService.fromSchema('typescript', src);
		expect(code).toContain('export class Person extends QModel<IPerson>');
	});

	test('comentarios en el body del interface son ignorados', () => {
		const src = [
			'interface IItem {',
			'  // identificador único',
			'  id: number;',
			'  name: string;',
			'}',
		].join('\n');
		const code = SchemaToModelService.fromSchema('typescript', src, 'Item');
		expect(code).toContain('declare id: number;');
		expect(code).toContain('declare name: string;');
		// El comentario no debe aparecer como campo
		expect(code).not.toContain('identificador');
	});

	test('@Quick({}) cuando todos los campos son string', () => {
		const src = [
			'interface ILabel {',
			'  key: string;',
			'  value: string;',
			'}',
		].join('\n');
		const code = SchemaToModelService.fromSchema(
			'typescript',
			src,
			'Label'
		);
		expect(code).toContain('@Quick({})');
		expect(code).not.toMatch(/@Quick\(\{\s*\w+:/);
	});

	test('incluye import correcto', () => {
		const src = ['interface IX {', '  val: number;', '}'].join('\n');
		const code = SchemaToModelService.fromSchema('typescript', src, 'X');
		expect(code).toContain("import { QModel, Quick } from 'quickmodel'");
	});

	test('lanza error si no hay interface en el código fuente', () => {
		expect(() =>
			SchemaToModelService.fromSchema(
				'typescript',
				'const val = 42;',
				'Foo'
			)
		).toThrow(/no interface declaration/);
	});
});

// ── fromSchema('graphql') ────────────────────────────────────────────────────

describe("fromSchema('graphql') — primitivos", () => {
	const sdl = [
		'type Product {',
		'\tname: String!',
		'\tprice: Float!',
		'\tstock: Int!',
		'\tactive: Boolean!',
		'}',
	].join('\n');

	test('genera class que extiende QModel con generic correcto', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('export class Product extends QModel<IProduct>');
	});

	test('genera interfaz IProduct', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('interface IProduct {');
	});

	test('Float! → transformer Number', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('price: Number');
	});

	test('Int! → transformer Number', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('stock: Number');
	});

	test('Boolean! → transformer Boolean', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('active: Boolean');
	});

	test('String! → no aparece como transformer en @Quick (es el default)', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).not.toMatch(/name:\s*String[\s,\n]/);
	});

	test('genera declare para cada propiedad', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('declare name: string;');
		expect(code).toContain('declare price: number;');
		expect(code).toContain('declare active: boolean;');
	});

	test('campos no-nullable (!) → sin ? en la interfaz', () => {
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toMatch(/\bname: string;/);
		expect(code).not.toMatch(/\bname\?:/);
	});
});

describe("fromSchema('graphql') — tipos especiales", () => {
	test('DateTime! → transformer Date', () => {
		const sdl = 'type Event {\n\tcreatedAt: DateTime!\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('createdAt: Date');
		expect(code).toContain('declare createdAt: Date;');
	});

	test('[String!]! → transformer [String] (array)', () => {
		const sdl = 'type Post {\n\ttags: [String!]!\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('tags: [String]');
		expect(code).toContain('declare tags: string[];');
	});

	test('[Float!]! → transformer [Number] (array de números)', () => {
		const sdl = 'type Report {\n\tscores: [Float!]!\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('scores: [Number]');
		expect(code).toContain('declare scores: number[];');
	});

	test('JSON! → Record<string, unknown> sin transformer', () => {
		const sdl = 'type Config {\n\tmeta: JSON!\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('declare meta: Record<string, unknown>;');
		expect(code).not.toMatch(/meta:\s*\w+[^\n]*\n.*@Quick/s);
	});

	test('campo nullable (sin !) → opcional en la interfaz', () => {
		const sdl = 'type Draft {\n\ttitle: String\n\tscore: Float\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('title?: string;');
		expect(code).toContain('score?: number;');
	});
});

describe("fromSchema('graphql') — className y errores", () => {
	test('className se infiere del nombre del type block', () => {
		const sdl = 'type Invoice {\n\tamount: Float!\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('export class Invoice extends QModel<IInvoice>');
	});

	test('className explícito tiene prioridad sobre el nombre del type block', () => {
		const sdl = 'type Invoice {\n\tamount: Float!\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl, 'Bill');
		expect(code).toContain('export class Bill extends QModel<IBill>');
		expect(code).not.toContain('Invoice');
	});

	test('@Quick({}) cuando todos los campos son String!', () => {
		const sdl = 'type Label {\n\tkey: String!\n\tvalue: String!\n}';
		const code = SchemaToModelService.fromSchema('graphql', sdl);
		expect(code).toContain('@Quick({})');
		expect(code).not.toMatch(/@Quick\(\{\s*\w+:/);
	});

	test('lanza error si no hay type block en el input', () => {
		expect(() =>
			SchemaToModelService.fromSchema('graphql', 'query { user { id } }')
		).toThrow(/no `type` block found/);
	});
});

// ── fromSchema('prisma') ─────────────────────────────────────────────────────

describe("fromSchema('prisma') — primitivos", () => {
	const model = [
		'model Order {',
		'\tname      String',
		'\ttotal     Float',
		'\tquantity  Int',
		'\tactive    Boolean',
		'}',
	].join('\n');

	test('genera class que extiende QModel con generic correcto', () => {
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('export class Order extends QModel<IOrder>');
	});

	test('genera interfaz IOrder', () => {
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('interface IOrder {');
	});

	test('Float → transformer Number', () => {
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('total: Number');
	});

	test('Int → transformer Number', () => {
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('quantity: Number');
	});

	test('Boolean → transformer Boolean', () => {
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('active: Boolean');
	});

	test('String → no aparece como transformer en @Quick (es el default)', () => {
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).not.toMatch(/name:\s*String[\s,\n]/);
	});

	test('genera declare para cada propiedad', () => {
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('declare name: string;');
		expect(code).toContain('declare total: number;');
		expect(code).toContain('declare active: boolean;');
	});
});

describe("fromSchema('prisma') — tipos especiales", () => {
	test('DateTime → transformer Date', () => {
		const model = 'model Log {\n\tcreatedAt  DateTime\n}';
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('createdAt: Date');
		expect(code).toContain('declare createdAt: Date;');
	});

	test('BigInt → transformer BigInt', () => {
		const model = 'model Finance {\n\tamount  BigInt\n}';
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('amount: BigInt');
		expect(code).toContain('declare amount: bigint;');
	});

	test('Json → Record<string, unknown> sin transformer', () => {
		const model = 'model Config {\n\tmeta  Json\n}';
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('declare meta: Record<string, unknown>;');
	});

	test('campo opcional (PrismaType?) → ? en la interfaz', () => {
		const model = 'model Profile {\n\tbio  String?\n\tscore  Float?\n}';
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('bio?: string;');
		expect(code).toContain('score?: number;');
	});
});

describe("fromSchema('prisma') — className y errores", () => {
	test('className se infiere del nombre del model block', () => {
		const model = 'model Payment {\n\tamount  Float\n}';
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('export class Payment extends QModel<IPayment>');
	});

	test('className explícito tiene prioridad sobre el nombre del model block', () => {
		const model = 'model Payment {\n\tamount  Float\n}';
		const code = SchemaToModelService.fromSchema('prisma', model, 'Charge');
		expect(code).toContain('export class Charge extends QModel<ICharge>');
		expect(code).not.toContain('Payment');
	});

	test('@Quick({}) cuando todos los campos son String', () => {
		const model = 'model Tag {\n\tslug  String\n\tlabel  String\n}';
		const code = SchemaToModelService.fromSchema('prisma', model);
		expect(code).toContain('@Quick({})');
		expect(code).not.toMatch(/@Quick\(\{\s*\w+:/);
	});

	test('lanza error si no hay model block en el input', () => {
		expect(() =>
			SchemaToModelService.fromSchema(
				'prisma',
				'datasource db { url = "" }'
			)
		).toThrow(/no `model` block found/);
	});
});

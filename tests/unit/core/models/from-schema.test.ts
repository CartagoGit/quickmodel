import { describe, it, expect } from 'bun:test';
import { QModel } from '../../../../src/core/models/quick.model';
import { Quick } from '../../../../src/core/decorators/quick.decorator';
import '../../../../src/schema';

// ── Minimal model fixture ────────────────────────────────────────────────────

interface IFoo {
	name: string;
	age: number;
}

@Quick({ age: Number })
class Foo extends QModel<IFoo> {
	declare name: string;
	declare age: number;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('QModel.fromSchema()', () => {
	it('is a static method on QModel', () => {
		expect(typeof QModel.fromSchema).toBe('function');
	});

	it('converts a JSON Schema to a QModel class definition', () => {
		const schema = {
			type: 'object',
			title: 'User',
			properties: {
				name: { type: 'string' },
				age: { type: 'integer' },
			},
			required: ['name', 'age'],
		};

		const code = QModel.fromSchema('json', schema, 'User');

		expect(typeof code).toBe('string');
		expect(code).toContain("import { QModel, Quick } from 'quickmodel';");
		expect(code).toContain('interface IUser {');
		expect(code).toContain('class User extends QModel<IUser>');
		expect(code).toContain('name: string;');
		expect(code).toContain('age: number;');
	});

	it('round-trips a model through getSchema → fromSchema', () => {
		// Forward: Foo → JSON Schema
		const jsonSchema = Foo.getSchema('json');

		// Reverse: JSON Schema → QModel class code
		const code = QModel.fromSchema('json', jsonSchema, 'Foo');

		expect(code).toContain('class Foo extends QModel<IFoo>');
		// age has a Number transformer — must be declared
		expect(code).toContain('declare age: number;');
		expect(code).toContain('age: Number');
		// name is a plain string: may or may not be present depending on schema metadata
		expect(typeof code).toBe('string');
	});

	it('converts a TypeScript interface string to a QModel class', () => {
		const tsInterface = `
interface IProduct {
  title: string;
  price: number;
  createdAt: Date;
}
`;

		const code = QModel.fromSchema('typescript', tsInterface);

		expect(code).toContain('class Product extends QModel<IProduct>');
		expect(code).toContain('declare title: string;');
		expect(code).toContain('declare price: number;');
		expect(code).toContain('declare createdAt: Date;');
		expect(code).toContain('createdAt: Date');
	});

	it('converts an AJV-compatible schema', () => {
		const schema = {
			type: 'object',
			properties: {
				token: { type: 'string' },
				active: { type: 'boolean' },
			},
		};

		const code = QModel.fromSchema('ajv', schema, 'Auth');
		expect(code).toContain('class Auth extends QModel<IAuth>');
		expect(code).toContain('token?: string;');
		expect(code).toContain('active?: boolean;');
	});

	it('uses GeneratedModel when no className and no schema.title', () => {
		const schema = {
			type: 'object',
			properties: { val: { type: 'number' } },
		};
		const code = QModel.fromSchema('json', schema);
		expect(code).toContain(
			'class GeneratedModel extends QModel<IGeneratedModel>'
		);
	});
});

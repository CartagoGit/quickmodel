/**
 * Integration tests for schema generation as real integration.
 * Covers: cross-feature/F
 *
 * Tests that schema generation for complex models (with @QAlias, @QField,
 * nested models) produces correct and usable schemas.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QAlias, QField, QGroup } from '@/decorators';

// ─── F-1, F-3: Model with @QAlias + @QField ──────────────────────────────────

interface IApiUser {
	userId: string;
	createdAt: string;
	email: string;
}

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
class ApiUserModel extends QModel<IApiUser> {
	@QAlias('user_id')
	@QField({ widget: 'input', label: 'User ID', required: true })
	declare userId: string;

	@QAlias('created_at')
	@QField({ widget: 'input', label: 'Created At' })
	declare createdAt: Date;

	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	declare email: string;
}

// ─── F-2: Model for schema generation ────────────────────────────────────────

interface IProduct {
	name: string;
	price: number;
	category: string;
}

@Quick({ price: Number }, { unknownPropertyPolicy: 'keep' })
class ProductModel extends QModel<IProduct> {
	@QField({ widget: 'input', label: 'Product Name', required: true })
	declare name: string;

	@QField({
		widget: 'input',
		inputType: 'number',
		label: 'Price',
		required: true,
	})
	declare price: number;

	@QField({ widget: 'select', label: 'Category' })
	declare category: string;
}

// ─── F-4: Model with @QGroup for schema grouping ─────────────────────────────

interface IContact {
	firstName: string;
	lastName: string;
	phone: string;
	address: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ContactModel extends QModel<IContact> {
	@QGroup('Personal')
	@QField({ widget: 'input', label: 'First Name', required: true })
	declare firstName: string;

	@QGroup('Personal')
	@QField({ widget: 'input', label: 'Last Name', required: true })
	declare lastName: string;

	@QGroup('Contact')
	@QField({ widget: 'input', label: 'Phone' })
	declare phone: string;

	@QGroup('Contact')
	@QField({ widget: 'input', label: 'Address' })
	declare address: string;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: schema generation (schema/F)', () => {
	describe('F-1: getSchema() — JSON schema basic shape', () => {
		test('getSchema("json") returns an object with properties', () => {
			const schema = ApiUserModel.getSchema('json');
			expect(typeof schema).toBe('object');
			expect(schema).not.toBeNull();
		});

		test('JSON schema has type "object"', () => {
			const schema = ApiUserModel.getSchema('json');
			expect(schema['type']).toBe('object');
		});

		test('JSON schema has properties key', () => {
			const schema = ApiUserModel.getSchema('json');
			expect(schema['properties']).toBeDefined();
		});
	});

	describe('F-2: getSchema("zod") — Zod schema object', () => {
		test('getSchema("zod") returns a non-null object', () => {
			const schema = ProductModel.getSchema('zod');
			expect(schema).not.toBeNull();
			expect(typeof schema).toBe('object');
		});

		test('Zod schema object has a parse method (is a Zod schema)', () => {
			const schema = ProductModel.getSchema('zod') as { parse?: unknown };
			expect(typeof schema.parse).toBe('function');
		});
	});

	describe('F-3: getSchema("openapi") — OpenAPI schema', () => {
		test('getSchema("openapi") returns an object', () => {
			const schema = ApiUserModel.getSchema('openapi');
			expect(typeof schema).toBe('object');
			expect(schema).not.toBeNull();
		});

		test('OpenAPI schema has type property', () => {
			const schema = ApiUserModel.getSchema('openapi');
			expect(schema['type']).toBeDefined();
		});
	});

	describe('F-4: getFormSchema() with @QGroup — grouped schema', () => {
		test('getFormSchema() returns array with entries', () => {
			const schema = ContactModel.getFormSchema();
			expect(Array.isArray(schema)).toBe(true);
			expect(schema.length).toBeGreaterThan(0);
		});

		test('Personal group fields appear in the schema', () => {
			const schema = ContactModel.getFormSchema();
			const personalFields = schema
				.filter((entry) => entry.group === 'Personal')
				.map((entry) => entry.field);
			expect(personalFields).toContain('firstName');
			expect(personalFields).toContain('lastName');
		});

		test('Contact group fields appear in the schema', () => {
			const schema = ContactModel.getFormSchema();
			const contactFields = schema
				.filter((entry) => entry.group === 'Contact')
				.map((entry) => entry.field);
			expect(contactFields).toContain('phone');
			expect(contactFields).toContain('address');
		});

		test('required fields are flagged in schema', () => {
			const schema = ApiUserModel.getFormSchema();
			const emailEntry = schema.find((entry) => entry.field === 'email');
			expect(emailEntry?.required).toBe(true);
		});
	});
});

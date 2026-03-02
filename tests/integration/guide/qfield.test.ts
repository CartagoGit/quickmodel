/**
 * Integration Test: @QField decorator
 * Covers: docs-vitepress/en/guide/qfield.md
 *
 * Validates:
 * - $qGetFormSchema() (static) returns all @QField entries
 * - Instance $qGetFormSchema() same as static
 * - Declaration order is preserved in schema output
 * - Extra metadata in @QField is preserved as-is
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QField } from '@/decorators';

// ── Models ────────────────────────────────────────────────────────────────────

interface IContactForm {
	name: string;
	email: string;
	phone: string;
	message: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ContactFormModel extends QModel<IContactForm> {
	@QField({ widget: 'text', label: 'Full Name', required: true })
	declare name: string;

	@QField({ widget: 'email', label: 'Email', required: true })
	declare email: string;

	@QField({ widget: 'tel', label: 'Phone', required: false })
	declare phone: string;

	@QField({
		widget: 'textarea',
		label: 'Message',
		required: true,
		maxLength: 500,
	})
	declare message: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: @QField (guide/qfield.md)', () => {
	describe('static $qGetFormSchema()', () => {
		test('returns schema entries for all @QField decorated fields', () => {
			const schema = ContactFormModel.getFormSchema();

			expect(schema).toBeDefined();
			const fields = schema.map((entry) => entry.field);

			expect(fields).toContain('name');
			expect(fields).toContain('email');
			expect(fields).toContain('phone');
			expect(fields).toContain('message');
		});

		test('each entry contains the metadata defined in @QField', () => {
			const schema = ContactFormModel.getFormSchema();
			const emailEntry = schema.find((entry) => entry.field === 'email');

			expect(emailEntry).toBeDefined();
			expect(emailEntry?.widget).toBe('email');
			expect(emailEntry?.label).toBe('Email');
			expect(emailEntry?.required).toBe(true);
		});

		test('extra metadata attributes are preserved', () => {
			const schema = ContactFormModel.getFormSchema();
			const messageEntry = schema.find(
				(entry) => entry.field === 'message'
			);

			expect(messageEntry).toBeDefined();
			expect((messageEntry as { maxLength?: number })?.maxLength).toBe(
				500
			);
		});
	});

	describe('instance $qGetFormSchema()', () => {
		test('instance schema matches static schema', () => {
			const form = new ContactFormModel({
				name: 'Alice',
				email: 'alice@example.com',
				phone: '555-1234',
				message: 'Hello',
			});

			const instanceSchema = form.$qGetFormSchema();
			const staticSchema = ContactFormModel.getFormSchema();

			expect(instanceSchema).toEqual(staticSchema);
		});
	});

	describe('declaration order preserved', () => {
		test('schema fields follow the order of @QField declarations', () => {
			const schema = ContactFormModel.getFormSchema();
			const fields = schema.map((entry) => entry.field);

			const nameIdx = fields.indexOf('name');
			const emailIdx = fields.indexOf('email');
			const phoneIdx = fields.indexOf('phone');
			const messageIdx = fields.indexOf('message');

			expect(nameIdx).toBeLessThan(emailIdx);
			expect(emailIdx).toBeLessThan(phoneIdx);
			expect(phoneIdx).toBeLessThan(messageIdx);
		});
	});
});

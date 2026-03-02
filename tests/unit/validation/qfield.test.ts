import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QField } from '@/core/decorators/qfield.decorator';

// ---------------------------------------------------------------------------
// Shared model
// ---------------------------------------------------------------------------

@Quick({ birthDate: Date })
class ProfileModel extends QModel<{
	name: string;
	role: string;
	active: boolean;
	birthDate: string | Date;
}> {
	@QField({
		widget: 'input',
		inputType: 'text',
		label: 'Full name',
		required: true,
	})
	declare name: string;

	@QField({
		widget: 'select',
		label: 'Role',
		options: ['admin', 'user', 'guest'],
	})
	declare role: string;

	@QField({ widget: 'checkbox', label: 'Active' })
	declare active: boolean;

	@QField({ widget: 'datepicker', label: 'Birth date' })
	declare birthDate: Date;
}

// ---------------------------------------------------------------------------
// @QField decorator
// ---------------------------------------------------------------------------

describe('@QField decorator', () => {
	test('$qGetFormSchema() returns an array with one entry per @QField', () => {
		const instance = ProfileModel.create({
			name: 'Alice',
			role: 'admin',
			active: true,
			birthDate: '1990-01-01T00:00:00.000Z',
		});
		const schema = instance.$qGetFormSchema();
		expect(schema).toHaveLength(4);
	});

	test('each entry has the field name', () => {
		const instance = ProfileModel.create({
			name: 'Alice',
			role: 'admin',
			active: true,
			birthDate: '1990-01-01T00:00:00.000Z',
		});
		const fields = instance.$qGetFormSchema().map((schema) => schema.field);
		expect(fields).toContain('name');
		expect(fields).toContain('role');
		expect(fields).toContain('active');
		expect(fields).toContain('birthDate');
	});

	test('entry for input widget has correct metadata', () => {
		const instance = ProfileModel.create({
			name: 'Alice',
			role: 'admin',
			active: true,
			birthDate: '1990-01-01T00:00:00.000Z',
		});
		const nameEntry = instance
			.$qGetFormSchema()
			.find((schema) => schema.field === 'name');
		expect(nameEntry?.widget).toBe('input');
		expect(nameEntry?.inputType).toBe('text');
		expect(nameEntry?.label).toBe('Full name');
		expect(nameEntry?.required).toBe(true);
	});

	test('entry for select widget has options array', () => {
		const instance = ProfileModel.create({
			name: 'Alice',
			role: 'admin',
			active: true,
			birthDate: '1990-01-01T00:00:00.000Z',
		});
		const roleEntry = instance
			.$qGetFormSchema()
			.find((schema) => schema.field === 'role');
		expect(roleEntry?.widget).toBe('select');
		expect(roleEntry?.options).toEqual(['admin', 'user', 'guest']);
	});

	test('entry for checkbox widget', () => {
		const instance = ProfileModel.create({
			name: 'Alice',
			role: 'admin',
			active: true,
			birthDate: '1990-01-01T00:00:00.000Z',
		});
		const activeEntry = instance
			.$qGetFormSchema()
			.find((schema) => schema.field === 'active');
		expect(activeEntry?.widget).toBe('checkbox');
		expect(activeEntry?.label).toBe('Active');
	});

	test('entry for datepicker widget', () => {
		const instance = ProfileModel.create({
			name: 'Alice',
			role: 'admin',
			active: true,
			birthDate: '1990-01-01T00:00:00.000Z',
		});
		const birthDateEntry = instance
			.$qGetFormSchema()
			.find((schema) => schema.field === 'birthDate');
		expect(birthDateEntry?.widget).toBe('datepicker');
	});

	test('model with no @QField returns empty array from $qGetFormSchema()', () => {
		@Quick({ val: 'number' })
		class Plain extends QModel<{ val: number }> {
			declare val: number;
		}
		const plain = Plain.create({ val: 5 });
		expect(plain.$qGetFormSchema()).toHaveLength(0);
	});

	test('static getFormSchema() works without an instance', () => {
		const schema = ProfileModel.getFormSchema();
		expect(schema).toHaveLength(4);
	});

	test('@QField supports arbitrary extra metadata (placeholder, hint, etc.)', () => {
		@Quick({})
		class ExtraModel extends QModel<{ email: string }> {
			@QField({
				widget: 'input',
				inputType: 'email',
				label: 'Email',
				placeholder: 'you@example.com',
				hint: 'Must be unique',
			})
			declare email: string;
		}
		const instance = ExtraModel.create({ email: 'a@b.com' });
		const entry = instance.$qGetFormSchema()[0];
		expect(entry?.placeholder).toBe('you@example.com');
		expect(entry?.hint).toBe('Must be unique');
	});

	test('inheritance: subclass inherits parent @QField entries', () => {
		@Quick({})
		class BaseForm extends QModel<{ label: string }> {
			@QField({ widget: 'input', label: 'Label' })
			declare label: string;
		}
		@Quick({})
		class ExtForm extends BaseForm {
			@QField({ widget: 'checkbox', label: 'Enabled' })
			declare enabled: boolean;
		}
		const instance = ExtForm.create({
			label: 'Test',
			enabled: true,
		} as any);
		const schema = instance.$qGetFormSchema();
		const fields = schema.map((schema) => schema.field);
		expect(fields).toContain('label');
		expect(fields).toContain('enabled');
	});
});

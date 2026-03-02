import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QField } from '@/core/decorators/qfield.decorator';
import { QGroup } from '@/core/decorators/qgroup.decorator';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

@Quick()
class ContactModel extends QModel<{
	firstName: string;
	lastName: string;
	street: string;
	city: string;
	bio: string;
}> {
	@QField({ widget: 'input', label: 'First name' })
	@QGroup('Personal Info')
	declare firstName: string;

	@QField({ widget: 'input', label: 'Last name' })
	@QGroup('Personal Info')
	declare lastName: string;

	@QField({ widget: 'input', label: 'Street' })
	@QGroup('Address')
	declare street: string;

	@QField({ widget: 'input', label: 'City' })
	@QGroup('Address')
	declare city: string;

	@QField({ widget: 'textarea', label: 'Bio' })
	// No @QGroup — intentionally ungrouped
	declare bio: string;
}

@Quick()
class SimpleModel extends QModel<{ name: string; age: number }> {
	@QField({ widget: 'input', label: 'Name' })
	declare name: string;

	@QField({ widget: 'number', label: 'Age' })
	declare age: number;
}

@Quick()
class ChildContact extends ContactModel {
	@QField({ widget: 'input', label: 'Company' })
	@QGroup('Work')
	declare company: string;
}

// ---------------------------------------------------------------------------
// getFormSchema() with group metadata
// ---------------------------------------------------------------------------

describe('@QGroup — $qGetFormSchema() includes group property', () => {
	test('entries decorated with @QGroup include group in schema', () => {
		const schema = ContactModel.getFormSchema();
		const firstName = schema.find((entry) => entry.field === 'firstName');
		const street = schema.find((entry) => entry.field === 'street');

		expect(firstName?.group).toBe('Personal Info');
		expect(street?.group).toBe('Address');
	});

	test('entry without @QGroup has group === undefined', () => {
		const schema = ContactModel.getFormSchema();
		const bio = schema.find((entry) => entry.field === 'bio');
		expect(bio?.group).toBeUndefined();
	});

	test('model with no @QGroup at all — all entries have group undefined', () => {
		const schema = SimpleModel.getFormSchema();
		expect(schema.every((entry) => entry.group === undefined)).toBe(true);
	});

	test('instance $qGetFormSchema() also includes group', () => {
		const contact = ContactModel.create({
			firstName: 'A',
			lastName: 'B',
			street: 'S',
			city: 'C',
			bio: '',
		});
		const schema = contact.$qGetFormSchema();
		const lastName = schema.find((entry) => entry.field === 'lastName');
		expect(lastName?.group).toBe('Personal Info');
	});
});

// ---------------------------------------------------------------------------
// getFormSchemaGrouped()
// ---------------------------------------------------------------------------

describe('$qGetFormSchemaGrouped()', () => {
	test('static getFormSchemaGrouped() returns array of groups', () => {
		const grouped = ContactModel.getFormSchemaGrouped();
		expect(Array.isArray(grouped)).toBe(true);
		expect(grouped.length).toBeGreaterThan(0);
	});

	test('each entry has group and fields', () => {
		const grouped = ContactModel.getFormSchemaGrouped();
		for (const group of grouped) {
			expect(group).toHaveProperty('group');
			expect(group).toHaveProperty('fields');
			expect(Array.isArray(group.fields)).toBe(true);
		}
	});

	test('groups contain correct fields', () => {
		const grouped = ContactModel.getFormSchemaGrouped();
		const personal = grouped.find(
			(group) => group.group === 'Personal Info'
		);
		const address = grouped.find((group) => group.group === 'Address');

		expect(personal?.fields.map((field) => field.field)).toEqual(
			expect.arrayContaining(['firstName', 'lastName'])
		);
		expect(address?.fields.map((field) => field.field)).toEqual(
			expect.arrayContaining(['street', 'city'])
		);
	});

	test('fields without @QGroup appear in undefined group', () => {
		const grouped = ContactModel.getFormSchemaGrouped();
		const ungrouped = grouped.find((group) => group.group === undefined);
		expect(ungrouped?.fields.map((field) => field.field)).toContain('bio');
	});

	test('model with no @QGroup at all returns one entry with group undefined', () => {
		const grouped = SimpleModel.getFormSchemaGrouped();
		expect(grouped).toHaveLength(1);
		expect(grouped[0].group).toBeUndefined();
		expect(grouped[0].fields).toHaveLength(2);
	});

	test('model with no @QField returns empty array', () => {
		@Quick()
		class Empty extends QModel<{ strX: string }> {
			declare strX: string;
		}
		expect(Empty.getFormSchemaGrouped()).toEqual([]);
	});

	test('instance $qGetFormSchemaGrouped() works too', () => {
		const contact = ContactModel.create({
			firstName: 'A',
			lastName: 'B',
			street: 'S',
			city: 'C',
			bio: '',
		});
		const grouped = contact.$qGetFormSchemaGrouped();
		expect(grouped.length).toBeGreaterThan(0);
	});

	test('field order within group is preserved', () => {
		const grouped = ContactModel.getFormSchemaGrouped();
		const personal = grouped.find(
			(group) => group.group === 'Personal Info'
		)!;
		expect(personal.fields[0].field).toBe('firstName');
		expect(personal.fields[1].field).toBe('lastName');
	});
});

// ---------------------------------------------------------------------------
// @QGroup — inheritance
// ---------------------------------------------------------------------------

describe('@QGroup — inheritance', () => {
	test('subclass inherits parent @QGroup entries', () => {
		const grouped = ChildContact.getFormSchemaGrouped();
		const personal = grouped.find(
			(group) => group.group === 'Personal Info'
		);
		const work = grouped.find((group) => group.group === 'Work');

		expect(personal?.fields.map((field) => field.field)).toContain(
			'firstName'
		);
		expect(work?.fields.map((field) => field.field)).toContain('company');
	});
});

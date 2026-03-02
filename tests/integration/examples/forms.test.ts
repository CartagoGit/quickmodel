/**
 * Integration tests for examples/forms.md
 * Validates @QField, @QGroup, getFormSchema() and qCheckRulesByGroup() flow.
 */
import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QField, QGroup, QRule } from '@/decorators';
import { $qCheckRulesByGroup } from '@/forms';

// ─── Models from forms.md ─────────────────────────────────────────────────────

interface IContact {
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	role: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ContactModel extends QModel<IContact> {
	@QField({
		widget: 'input',
		inputType: 'text',
		label: 'First name',
		required: true,
	})
	declare firstName: string;

	@QField({
		widget: 'input',
		inputType: 'text',
		label: 'Last name',
		required: true,
	})
	declare lastName: string;

	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	declare email: string;

	@QField({ widget: 'input', inputType: 'tel', label: 'Phone' })
	declare phone?: string;

	@QField({ widget: 'select', label: 'Role', required: true })
	declare role: string;
}

interface IUserProfile {
	firstName: string;
	lastName: string;
	email: string;
	street: string;
	city: string;
	country: string;
	bio?: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class UserProfileModel extends QModel<IUserProfile> {
	@QGroup('Personal Info')
	@QField({ widget: 'input', label: 'First name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Too short')
	declare firstName: string;

	@QGroup('Personal Info')
	@QField({ widget: 'input', label: 'Last name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Too short')
	declare lastName: string;

	@QGroup('Personal Info')
	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	declare email: string;

	@QGroup('Address')
	@QField({ widget: 'input', label: 'Street', required: true })
	declare street: string;

	@QGroup('Address')
	@QField({ widget: 'input', label: 'City', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'City too short')
	declare city: string;

	@QGroup('Address')
	@QField({ widget: 'select', label: 'Country', required: true })
	declare country: string;

	@QField({ widget: 'textarea', label: 'About me' })
	// No @QGroup
	declare bio?: string;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: forms example (examples/forms.md)', () => {
	describe('ContactModel.getFormSchema() — basic schema', () => {
		it('returns an array of field entries', () => {
			const schema = ContactModel.getFormSchema();
			expect(Array.isArray(schema)).toBe(true);
		});

		it('includes all declared @QField fields', () => {
			const schema = ContactModel.getFormSchema();
			const fields = schema.map((entry) => entry.field);
			expect(fields).toContain('firstName');
			expect(fields).toContain('lastName');
			expect(fields).toContain('email');
			expect(fields).toContain('phone');
			expect(fields).toContain('role');
		});

		it('schema entry for firstName has required: true', () => {
			const schema = ContactModel.getFormSchema();
			const firstName = schema.find(
				(entry) => entry.field === 'firstName'
			);
			expect(firstName?.required).toBe(true);
		});

		it('schema entry for email has inputType: "email"', () => {
			const schema = ContactModel.getFormSchema();
			const email = schema.find((entry) => entry.field === 'email');
			expect(email?.inputType).toBe('email');
		});
	});

	describe('UserProfileModel.getFormSchema() — grouped schema', () => {
		it('includes group info for Personal Info fields', () => {
			const schema = UserProfileModel.getFormSchema();
			const personalFields = schema.filter(
				(entry) => entry.group === 'Personal Info'
			);
			const fieldNames = personalFields.map((entry) => entry.field);
			expect(fieldNames).toContain('firstName');
			expect(fieldNames).toContain('lastName');
			expect(fieldNames).toContain('email');
		});

		it('includes group info for Address fields', () => {
			const schema = UserProfileModel.getFormSchema();
			const addressFields = schema.filter(
				(entry) => entry.group === 'Address'
			);
			const fieldNames = addressFields.map((entry) => entry.field);
			expect(fieldNames).toContain('street');
			expect(fieldNames).toContain('city');
			expect(fieldNames).toContain('country');
		});

		it('bio has no group (undefined or missing)', () => {
			const schema = UserProfileModel.getFormSchema();
			const bio = schema.find((entry) => entry.field === 'bio');
			expect(bio?.group).toBeUndefined();
		});
	});

	describe('qCheckRulesByGroup() — validate only one group', () => {
		const validPersonal = {
			firstName: 'Alice',
			lastName: 'García',
			email: 'alice@example.com',
			street: 'Street 1',
			city: 'A', // ❌ invalid city (< 2 chars)
			country: 'USA',
		};

		it('Personal Info group is valid when personal fields are OK', () => {
			const instance = new UserProfileModel(validPersonal);
			const results = $qCheckRulesByGroup(instance);
			const personalResult = results['Personal Info'];
			expect(personalResult?.valid).toBe(true);
		});

		it('checking Personal Info does not surface Address errors', () => {
			const instance = new UserProfileModel(validPersonal);
			const results = $qCheckRulesByGroup(instance);
			const personalResult = results['Personal Info'];
			const cityErrors = (personalResult?.errors ?? []).filter(
				(err) => err.field === 'city'
			);
			expect(cityErrors.length).toBe(0);
		});

		it('Address group is invalid when city is too short', () => {
			const instance = new UserProfileModel(validPersonal);
			const results = $qCheckRulesByGroup(instance);
			const addressResult = results['Address'];
			expect(addressResult?.valid).toBe(false);
		});

		it('Address group error is for city field', () => {
			const instance = new UserProfileModel(validPersonal);
			const results = $qCheckRulesByGroup(instance);
			const addressResult = results['Address'];
			const fields = (addressResult?.errors ?? []).map(
				(err) => err.field
			);
			expect(fields).toContain('city');
		});
	});
});

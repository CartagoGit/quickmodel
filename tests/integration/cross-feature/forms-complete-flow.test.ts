/**
 * Integration tests for complete form flow: @QField + @QGroup + checkRulesByGroup().
 * Covers: cross-feature/B-3
 *
 * Tests that @QField, @QGroup, and qCheckRulesByGroup() work together in a
 * complete form validation flow.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QField, QGroup, QRule } from '@/decorators';
import { $qCheckRulesByGroup } from '@/forms';

// ─── Models from B-3 ─────────────────────────────────────────────────────────

interface IFormProfile {
	username: string;
	email: string;
	bio: string;
	street: string;
	city: string;
	country: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class FormProfileModel extends QModel<IFormProfile> {
	@QGroup('Personal')
	@QField({ widget: 'input', label: 'Username', required: true })
	@QRule(
		(val: string) => typeof val === 'string' && val.length >= 3,
		'Username too short'
	)
	declare username: string;

	@QGroup('Personal')
	@QField({
		widget: 'input',
		inputType: 'email',
		label: 'Email',
		required: true,
	})
	@QRule(
		(val: string) => typeof val === 'string' && /\S+@\S+\.\S+/.test(val),
		'Invalid email'
	)
	declare email: string;

	@QGroup('Personal')
	@QField({ widget: 'textarea', label: 'Bio' })
	declare bio: string;

	@QGroup('Address')
	@QField({ widget: 'input', label: 'Street', required: true })
	declare street: string;

	@QGroup('Address')
	@QField({ widget: 'input', label: 'City', required: true })
	@QRule(
		(val: string) => typeof val === 'string' && val.length >= 2,
		'City too short'
	)
	declare city: string;

	@QGroup('Address')
	@QField({ widget: 'select', label: 'Country', required: true })
	declare country: string;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: complete form flow (cross-feature/B-3)', () => {
	describe('getFormSchema() respects group assignments', () => {
		test('Personal group fields are listed in schema', () => {
			const schema = FormProfileModel.getFormSchema();
			const personal = schema.filter(
				(entry) => entry.group === 'Personal'
			);
			const names = personal.map((entry) => entry.field);
			expect(names).toContain('username');
			expect(names).toContain('email');
			expect(names).toContain('bio');
		});

		test('Address group fields are listed in schema', () => {
			const schema = FormProfileModel.getFormSchema();
			const address = schema.filter((entry) => entry.group === 'Address');
			const names = address.map((entry) => entry.field);
			expect(names).toContain('street');
			expect(names).toContain('city');
			expect(names).toContain('country');
		});
	});

	describe('$qCheckRulesByGroup() validates only the specified group', () => {
		const data = {
			username: 'Alice',
			email: 'alice@example.com',
			bio: 'Hello!',
			street: 'Main St',
			city: 'X', // ❌ invalid
			country: 'USA',
		};

		test('Personal group is valid when personal fields are OK', () => {
			const model = new FormProfileModel(data);
			const results = $qCheckRulesByGroup(model);
			expect(results['Personal']?.valid).toBe(true);
		});

		test('Personal group errors do not include Address fields', () => {
			const model = new FormProfileModel(data);
			const results = $qCheckRulesByGroup(model);
			const personalErrors = results['Personal']?.errors ?? [];
			const cityErrors = personalErrors.filter(
				(err) => err.field === 'city'
			);
			expect(cityErrors.length).toBe(0);
		});

		test('Address group is invalid when city is invalid', () => {
			const model = new FormProfileModel(data);
			const results = $qCheckRulesByGroup(model);
			expect(results['Address']?.valid).toBe(false);
		});

		test('Address group error is for city field', () => {
			const model = new FormProfileModel(data);
			const results = $qCheckRulesByGroup(model);
			const fields = (results['Address']?.errors ?? []).map(
				(err) => err.field
			);
			expect(fields).toContain('city');
		});
	});

	describe('roundtrip: serialize → reconstruct → same schema', () => {
		test('getFormSchema() is stable after reconstruct', () => {
			const original = new FormProfileModel({
				username: 'Alice',
				email: 'alice@example.com',
				bio: 'Dev',
				street: 'Main',
				city: 'NY',
				country: 'USA',
			});
			const serialized = original.$qSerialize();
			const reconstructed = new FormProfileModel(serialized);
			const origSchema = FormProfileModel.getFormSchema();
			const reconSchema = reconstructed.$qGetFormSchema();
			expect(reconSchema.length).toBe(origSchema.length);
		});
	});

	describe('full form flow: validate → correct → re-validate → serialize', () => {
		test('invalid form → correct city → re-validate → serialize', () => {
			const invalid = new FormProfileModel({
				username: 'Alice',
				email: 'alice@example.com',
				bio: 'Hi',
				street: 'Main',
				city: 'A', // ❌
				country: 'USA',
			});
			const resultsBefore = $qCheckRulesByGroup(invalid);
			expect(resultsBefore['Address']?.valid).toBe(false);

			// Correct by creating a new instance with fixed data
			const fixed = invalid.$qCopy({ city: 'New York' });
			const resultsAfter = $qCheckRulesByGroup(fixed);
			expect(resultsAfter['Address']?.valid).toBe(true);

			// Can serialize properly
			const plain = fixed.$qSerialize();
			expect(plain['city']).toBe('New York');
		});
	});
});

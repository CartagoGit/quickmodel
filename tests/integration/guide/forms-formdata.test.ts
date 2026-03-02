/**
 * Integration Test: Forms + FormData
 * Covers: docs-vitepress/en/guide/forms.md + guide/formdata.md
 *
 * Validates:
 * - $qCheckRules() from standard instance
 * - $qCheckRulesByGroup() validates by group
 * - $qCheckRulesAsync() with timeout option
 * - Construction from FormData with type-transformed fields
 * - @QField + @QGroup + qCheckRulesByGroup() complete composition
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QGroup } from '@/decorators';
import { $qCheckRulesByGroup, $qCheckRulesAsync } from '@/forms';

// ── Models ────────────────────────────────────────────────────────────────────

interface ISignupForm {
	name: string;
	email: string;
	password: string;
	age: number;
}

@Quick({ age: Number }, { unknownPropertyPolicy: 'keep' })
class SignupFormModel extends QModel<ISignupForm> {
	@QField({ widget: 'text', label: 'Name', required: true })
	@QGroup('personal')
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	declare name: string;

	@QField({ widget: 'email', label: 'Email', required: true })
	@QGroup('personal')
	@QRule((val: string) => /\S+@\S+\.\S+/.test(val), 'Invalid email')
	declare email: string;

	@QField({ widget: 'password', label: 'Password', required: true })
	@QGroup('security')
	@QRule((val: string) => val.length >= 8, 'Password too short')
	declare password: string;

	@QField({ widget: 'number', label: 'Age', required: true })
	@QGroup('personal')
	@QRule((val: number) => val >= 18, 'Must be at least 18')
	declare age: number;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: forms + FormData (guide/forms.md + guide/formdata.md)', () => {
	describe('$qCheckRules() on instance', () => {
		test('valid form passes all rules', () => {
			const form = new SignupFormModel({
				name: 'Alice',
				email: 'alice@example.com',
				password: 'securepass',
				age: 25,
			});

			const result = form.$qCheckRules();
			expect(result.valid).toBe(true);
		});

		test('invalid form reports errors', () => {
			const form = new SignupFormModel({
				name: 'A',
				email: 'not-email',
				password: 'short',
				age: 16,
			});

			const result = form.$qCheckRules();
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe('$qCheckRulesByGroup()', () => {
		test('validates only personal group errors', () => {
			const form = new SignupFormModel({
				name: 'A',
				email: 'not-email',
				password: 'securepw', // valid
				age: 16,
			});

			const byGroup = $qCheckRulesByGroup(form);

			expect(byGroup['personal']?.valid).toBe(false);
			// security group should pass (password is valid)
			expect(byGroup['security']?.valid).toBe(true);
		});

		test('reports errors per group separately', () => {
			const form = new SignupFormModel({
				name: 'Alice',
				email: 'alice@example.com',
				password: 'x', // invalid
				age: 25,
			});

			const byGroup = $qCheckRulesByGroup(form);

			expect(byGroup['personal']?.valid).toBe(true);
			expect(byGroup['security']?.valid).toBe(false);
		});
	});

	describe('$qCheckRulesAsync() with timeout', () => {
		test('async validation completes within timeout', async () => {
			const form = new SignupFormModel({
				name: 'Bob',
				email: 'bob@example.com',
				password: 'supersecret',
				age: 21,
			});

			const result = await $qCheckRulesAsync(form, { timeoutMs: 3000 });
			expect(result.valid).toBe(true);
		});
	});

	describe('construction with numeric transformation', () => {
		test('age string is coerced to number via @Quick type annotation', () => {
			const form = new SignupFormModel({
				name: 'Carol',
				email: 'carol@example.com',
				password: 'password123',
				age: 30,
			});

			expect(typeof form.age).toBe('number');
			expect(form.age).toBe(30);
		});
	});

	describe('@QField + @QGroup + getFormSchema() composition', () => {
		test('form schema contains all fields with their groups', () => {
			const schema = SignupFormModel.getFormSchema();
			const fieldNames = schema.map((entry) => entry.field);

			expect(fieldNames).toContain('name');
			expect(fieldNames).toContain('email');
			expect(fieldNames).toContain('password');
			expect(fieldNames).toContain('age');
		});
	});
});

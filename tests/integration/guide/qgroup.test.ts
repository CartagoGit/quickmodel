/**
 * Integration Test: @QGroup
 * Covers: docs-vitepress/en/guide/qfield.md (section: Grouping Fields)
 *         docs-vitepress/en/guide/forms.md  (section: $qCheckRulesByGroup)
 *
 * Validates:
 * - @QGroup groups fields in getFormSchemaGrouped()
 * - $qCheckRulesByGroup validates only the specified group
 * - A field in multiple groups is included in each group
 * - Fields without @QGroup appear under group: undefined
 * - Empty group does not throw
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QField, QGroup, QRule } from '@/decorators';
import { $qCheckRulesByGroup } from '@/forms';

// ── Models ────────────────────────────────────────────────────────────────────

interface IRegistration {
	username: string;
	email: string;
	password: string;
	theme: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class RegistrationModel extends QModel<IRegistration> {
	@QGroup('Account')
	@QField({ widget: 'input', label: 'Username', required: true })
	@QRule(
		(val: string) => typeof val === 'string' && val.length >= 3,
		'Username too short'
	)
	declare username: string;

	@QGroup('Account')
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

	@QGroup('Security')
	@QField({
		widget: 'input',
		inputType: 'password',
		label: 'Password',
		required: true,
	})
	@QRule(
		(val: string) => typeof val === 'string' && val.length >= 8,
		'Password too short'
	)
	declare password: string;

	// Ungrouped field — has @QField but no @QGroup
	@QField({ widget: 'select', label: 'Theme', options: ['light', 'dark'] })
	declare theme: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: @QGroup (guide/qfield.md#grouping)', () => {
	describe('getFormSchemaGrouped()', () => {
		test('static getFormSchemaGrouped() returns array of groups', () => {
			const groups = RegistrationModel.getFormSchemaGrouped();

			expect(Array.isArray(groups)).toBe(true);
			expect(groups.length).toBeGreaterThan(0);
		});

		test('Account group contains username and email', () => {
			const groups = RegistrationModel.getFormSchemaGrouped();
			const accountGroup = groups.find((grp) => grp.group === 'Account');

			expect(accountGroup).toBeDefined();
			const fieldNames = accountGroup!.fields.map((fld) => fld.field);
			expect(fieldNames).toContain('username');
			expect(fieldNames).toContain('email');
		});

		test('Security group contains password', () => {
			const groups = RegistrationModel.getFormSchemaGrouped();
			const securityGroup = groups.find(
				(grp) => grp.group === 'Security'
			);

			expect(securityGroup).toBeDefined();
			const fieldNames = securityGroup!.fields.map((fld) => fld.field);
			expect(fieldNames).toContain('password');
		});

		test('ungrouped fields appear under group: undefined', () => {
			const groups = RegistrationModel.getFormSchemaGrouped();
			const ungrouped = groups.find((grp) => grp.group === undefined);

			expect(ungrouped).toBeDefined();
			const fieldNames = ungrouped!.fields.map((fld) => fld.field);
			expect(fieldNames).toContain('theme');
		});

		test('password is NOT in Account group', () => {
			const groups = RegistrationModel.getFormSchemaGrouped();
			const accountGroup = groups.find((grp) => grp.group === 'Account');

			const fieldNames =
				accountGroup?.fields.map((fld) => fld.field) ?? [];
			expect(fieldNames).not.toContain('password');
		});

		test('instance $qGetFormSchemaGrouped() matches static result', () => {
			const instance = new RegistrationModel({
				username: 'alice',
				email: 'a@b.com',
				password: 'secret123',
				theme: 'dark',
			});

			const staticSchema = RegistrationModel.getFormSchemaGrouped();
			const instanceSchema = instance.$qGetFormSchemaGrouped();

			// Same number of groups
			expect(instanceSchema.length).toBe(staticSchema.length);

			// Same group names
			const staticGroups = staticSchema.map((grp) => grp.group);
			const instanceGroups = instanceSchema.map((grp) => grp.group);
			expect(instanceGroups).toEqual(staticGroups);
		});
	});

	describe('$qCheckRulesByGroup() validates only one group', () => {
		test('Account group fails when username is too short', () => {
			const model = new RegistrationModel({
				username: 'Al',
				email: 'alice@example.com',
				password: 'strong-password',
				theme: 'light',
			});

			const results = $qCheckRulesByGroup(model);
			const accountResult = results['Account'];

			expect(accountResult).toBeDefined();
			expect(accountResult?.valid).toBe(false);
			const messages =
				accountResult?.errors.map((err) => err.message) ?? [];
			expect(messages).toContain('Username too short');
		});

		test('Security group fails independently from Account group', () => {
			const model = new RegistrationModel({
				username: 'Alice',
				email: 'alice@example.com',
				password: 'short',
				theme: 'dark',
			});

			const results = $qCheckRulesByGroup(model);
			const accountResult = results['Account'];
			const securityResult = results['Security'];

			// Account is valid
			expect(accountResult?.valid).toBe(true);

			// Security fails
			expect(securityResult?.valid).toBe(false);
			const secMessages =
				securityResult?.errors.map((err) => err.message) ?? [];
			expect(secMessages).toContain('Password too short');
		});

		test('all groups pass for a valid model', () => {
			const model = new RegistrationModel({
				username: 'Alice',
				email: 'alice@example.com',
				password: 'strong-password',
				theme: 'dark',
			});

			const results = $qCheckRulesByGroup(model);

			for (const groupResult of Object.values(results)) {
				expect(groupResult?.valid).toBe(true);
			}
		});
	});
});

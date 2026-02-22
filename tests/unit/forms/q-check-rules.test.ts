/**
 * @fileoverview TDD tests for `qGetGroups`, `qCheckRules` and `qCheckRulesByGroup`.
 *
 * These helpers are form-validation utilities that work on **any class** decorated
 * with `@QRule` / `@QGroup` — they do NOT require the class to extend `QModel`.
 *
 * ## Test structure
 *
 * - **Shared fixtures**: plain classes decorated with `@QRule` + `@QGroup`.
 * - **`qGetGroups`**: reads `@QGroup` metadata and returns distinct group names.
 * - **`qCheckRules`** (no filter): evaluates all `@QRule` predicates.
 * - **`qCheckRules`** (group filter): evaluates only rules belonging to a group.
 * - **`qCheckRulesByGroup`**: per-group `IQRulesResult` map.
 * - **Edge cases**: classes with no rules, no groups, mixed decorated / plain fields.
 */

import { describe, test, expect } from 'bun:test';
import 'reflect-metadata';
import { QRule } from '@/core/decorators/qrule.decorator';
import { QGroup } from '@/core/decorators/qgroup.decorator';
import { qGetGroups } from '@/core/helpers/q-get-groups';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesByGroup } from '@/core/helpers/q-check-rules-by-group';

// =============================================================================
// Shared test fixtures
// =============================================================================

/**
 * A plain form class — does NOT extend QModel.
 * Three groups: 'identity', 'security', and one ungrouped field.
 */
class ContactForm {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	@QGroup('identity')
	name = '';

	@QRule((val: string) => /^[^@]+@[^@]+\.[^@]+$/.test(val), 'Invalid email')
	@QGroup('identity')
	email = '';

	@QRule((val: string) => val.length >= 8, 'Password too short')
	@QRule((val: string) => /[A-Z]/.test(val), 'Must contain uppercase')
	@QGroup('security')
	password = '';

	// Ungrouped field — has @QRule but no @QGroup
	@QRule((val: string) => val.length > 0, 'Street required')
	street = '';
}

/** Class with only ungrouped rules (no @QGroup at all). */
class PlainRulesForm {
	@QRule((val: string) => val.length > 0, 'Name required')
	name = '';

	@QRule((val: number) => val >= 0, 'Must be non-negative')
	age = 0;
}

/** Class with no @QRule decorators at all. */
class EmptyForm {
	name = '';
}

// =============================================================================
// Inheritance fixtures
// =============================================================================

/** Base class with @QRule on `name`. */
class BaseForm {
	@QRule((val: string) => val.length >= 2, 'Name too short')
	@QGroup('identity')
	name = '';
}

/** Subclass that adds its own `@QRule`-decorated field but keeps parent's. */
class ChildForm extends BaseForm {
	@QRule((val: number) => val >= 18, 'Must be at least 18')
	@QGroup('identity')
	age = 0;
}

// =============================================================================
// qGetGroups
// =============================================================================

describe('qGetGroups', () => {
	test('returns an array of distinct @QGroup names', () => {
		const form = new ContactForm();
		const groups = qGetGroups(form);
		expect(groups).toContain('identity');
		expect(groups).toContain('security');
	});

	test('does not include undefined (ungrouped fields are excluded)', () => {
		const form = new ContactForm();
		const groups = qGetGroups(form);
		expect(groups).not.toContain(undefined);
		expect(groups.every((grp) => typeof grp === 'string')).toBe(true);
	});

	test('each group name appears only once', () => {
		const form = new ContactForm();
		const groups = qGetGroups(form);
		const unique = [...new Set(groups)];
		expect(groups).toEqual(unique);
	});

	test('returns exactly the declared groups (identity + security)', () => {
		const form = new ContactForm();
		const groups = qGetGroups(form);
		expect(groups.sort()).toEqual(['identity', 'security']);
	});

	test('returns empty array when no @QGroup is present', () => {
		const form = new PlainRulesForm();
		expect(qGetGroups(form)).toEqual([]);
	});

	test('returns empty array when no @QRule/@QGroup decorators at all', () => {
		const form = new EmptyForm();
		expect(qGetGroups(form)).toEqual([]);
	});
});

// =============================================================================
// qCheckRules — no group filter
// =============================================================================

describe('qCheckRules — no group filter', () => {
	test('returns valid:true when all rules pass', () => {
		const form = new ContactForm();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = qCheckRules(form);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('returns valid:false when any rule fails', () => {
		const form = new ContactForm();
		form.name = 'A'; // too short
		form.email = 'not-an-email';
		form.password = 'short'; // too short, no uppercase
		form.street = '';

		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	test('error contains field, message, and value', () => {
		const form = new ContactForm();
		form.name = 'A'; // fails: 'Name too short'
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = qCheckRules(form);
		const nameError = result.errors.find((err) => err.field === 'name');
		expect(nameError).toBeDefined();
		expect(nameError?.message).toBe('Name too short');
		expect(nameError?.value).toBe('A');
	});

	test('all failing rules across all fields are reported', () => {
		const form = new ContactForm();
		form.name = 'A'; // 1 error
		form.email = 'bad'; // 1 error
		form.password = 'abc'; // 2 errors (short + no uppercase)
		form.street = ''; // 1 error

		const result = qCheckRules(form);
		expect(result.errors).toHaveLength(5);
	});

	test('evaluates ALL fields including ungrouped', () => {
		const form = new ContactForm();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = ''; // this ungrouped field fails

		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		const streetError = result.errors.find((err) => err.field === 'street');
		expect(streetError).toBeDefined();
	});

	test('works on a class with no rules — returns valid:true', () => {
		const form = new EmptyForm();
		const result = qCheckRules(form);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

// =============================================================================
// qCheckRules — with group filter
// =============================================================================

describe('qCheckRules — group filter', () => {
	test('evaluates only rules from the specified group', () => {
		const form = new ContactForm();
		// identity fields are valid
		form.name = 'Alice';
		form.email = 'alice@example.com';
		// security and street are invalid — should be ignored
		form.password = 'weak';
		form.street = '';

		const result = qCheckRules(form, { group: 'identity' });
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('reports only errors for the specified group', () => {
		const form = new ContactForm();
		// identity fields are invalid
		form.name = 'A'; // too short
		form.email = 'not-valid'; // invalid
		// security is fine — should not appear in results
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = qCheckRules(form, { group: 'identity' });
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
		expect(result.errors.map((err) => err.field).sort()).toEqual([
			'email',
			'name',
		]);
	});

	test('ungrouped fields are NOT included when a group filter is given', () => {
		const form = new ContactForm();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = ''; // would fail, but is ungrouped

		const result = qCheckRules(form, { group: 'identity' });
		expect(result.errors.some((err) => err.field === 'street')).toBe(false);
	});

	test('returns valid:true for a group with no fields decorated with @QGroup', () => {
		const form = new PlainRulesForm();
		// PlainRulesForm has no @QGroup — asking for any group returns valid:true (no rules to fail)
		const result = qCheckRules(form, { group: 'somegroup' });
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('group filter is case-sensitive', () => {
		const form = new ContactForm();
		form.name = 'A'; // would fail under 'identity'
		form.email = 'a@b.com';
		form.password = 'Secret1!';
		form.street = '42';

		// 'Identity' (capital I) ≠ 'identity' — no fields match → valid
		const result = qCheckRules(form, { group: 'Identity' });
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

// =============================================================================
// qCheckRulesByGroup
// =============================================================================

describe('qCheckRulesByGroup', () => {
	test('returns one key per @QGroup group name', () => {
		const form = new ContactForm();
		const result = qCheckRulesByGroup(form);
		expect(Object.keys(result).sort()).toEqual(['identity', 'security']);
	});

	test('each entry is an IQRulesResult with valid and errors', () => {
		const form = new ContactForm();
		const result = qCheckRulesByGroup(form);
		for (const entry of Object.values(result)) {
			expect(typeof entry.valid).toBe('boolean');
			expect(Array.isArray(entry.errors)).toBe(true);
		}
	});

	test('groups with all-passing rules are valid:true', () => {
		const form = new ContactForm();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = qCheckRulesByGroup(form);
		expect(result['identity'].valid).toBe(true);
		expect(result['security'].valid).toBe(true);
	});

	test('groups with failing rules are valid:false', () => {
		const form = new ContactForm();
		form.name = 'A'; // identity fails
		form.email = 'alice@example.com';
		form.password = 'Secret1!'; // security passes
		form.street = '42 Main St';

		const result = qCheckRulesByGroup(form);
		expect(result['identity'].valid).toBe(false);
		expect(result['security'].valid).toBe(true);
	});

	test('errors are scoped to their group only', () => {
		const form = new ContactForm();
		form.name = 'A'; // identity error
		form.email = 'alice@example.com';
		form.password = 'weak'; // security errors
		form.street = ''; // ungrouped — should NOT appear in any group entry

		const result = qCheckRulesByGroup(form);
		expect(
			result['identity'].errors.every(
				(err) => err.field === 'name' || err.field === 'email'
			)
		).toBe(true);
		expect(
			result['security'].errors.every((err) => err.field === 'password')
		).toBe(true);

		// street is ungrouped — must not leak into any group
		for (const entry of Object.values(result)) {
			expect(entry.errors.some((err) => err.field === 'street')).toBe(
				false
			);
		}
	});

	test('returns empty object when no @QGroup decorators are present', () => {
		const form = new PlainRulesForm();
		const result = qCheckRulesByGroup(form);
		expect(Object.keys(result)).toHaveLength(0);
	});

	test('returns empty object when no decorators at all', () => {
		const form = new EmptyForm();
		const result = qCheckRulesByGroup(form);
		expect(Object.keys(result)).toHaveLength(0);
	});
});

// =============================================================================
// Edge cases — inheritance & multiple rules per field
// =============================================================================

describe('qCheckRules — inheritance', () => {
	test('subclass instance includes rules from the parent prototype', () => {
		const form = new ChildForm();
		form.name = 'Alice';
		form.age = 20;

		const result = qCheckRules(form);
		expect(result.valid).toBe(true);
	});

	test('parent @QRule failures are reported for a subclass instance', () => {
		const form = new ChildForm();
		form.name = 'A'; // fails parent rule
		form.age = 20;

		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		const nameError = result.errors.find((err) => err.field === 'name');
		expect(nameError?.message).toBe('Name too short');
	});

	test('subclass-only field rules are also evaluated', () => {
		const form = new ChildForm();
		form.name = 'Alice';
		form.age = 15; // fails subclass rule

		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		const ageError = result.errors.find((err) => err.field === 'age');
		expect(ageError?.message).toBe('Must be at least 18');
	});

	test('group filter works correctly with inherited fields', () => {
		const form = new ChildForm();
		form.name = 'A'; // identity fails
		form.age = 15; // identity also fails

		const result = qCheckRules(form, { group: 'identity' });
		expect(result.valid).toBe(false);
		const fields = result.errors.map((err) => err.field).sort();
		expect(fields).toEqual(['age', 'name']);
	});

	test('qGetGroups reflects groups from both parent and subclass', () => {
		const form = new ChildForm();
		const groups = qGetGroups(form);
		expect(groups).toContain('identity');
	});
});

describe('qCheckRulesByGroup — multiple @QRule per field', () => {
	test('all errors for a multi-rule field appear in its group result', () => {
		const form = new ContactForm();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		// password has 2 rules and both fail
		form.password = 'abc'; // short + no uppercase
		form.street = '42 Main St';

		const result = qCheckRulesByGroup(form);
		const securityErrors = result['security']?.errors ?? [];
		expect(securityErrors).toHaveLength(2);
		expect(securityErrors.every((err) => err.field === 'password')).toBe(
			true
		);
	});

	test('only the first group errors appear in its result, not other groups', () => {
		const form = new ContactForm();
		form.name = 'A'; // identity fails
		form.email = 'bad'; // identity fails
		form.password = 'abc'; // security fails
		form.street = '42';

		const result = qCheckRulesByGroup(form);
		// identity only has its own fields
		expect(
			result['identity']?.errors.every(
				(err) => err.field === 'name' || err.field === 'email'
			)
		).toBe(true);
		// security only has its own fields
		expect(
			result['security']?.errors.every((err) => err.field === 'password')
		).toBe(true);
	});
});

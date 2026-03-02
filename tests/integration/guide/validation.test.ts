/**
 * Integration Test: @QRule validation
 * Covers: docs-vitepress/en/guide/validation.md
 *
 * Validates:
 * - @QRule with $qCheckRules() on a valid model
 * - Multiple errors reported for an invalid model
 * - Multiple rules per field: all are checked
 * - $qCheckRulesAsync() with async predicates
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/decorators';

// ── Models ────────────────────────────────────────────────────────────────────

interface IRegistration {
	email: string;
	age: number;
	username: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class RegistrationModel extends QModel<IRegistration> {
	@QRule((val: string) => /\S+@\S+\.\S+/.test(val), 'Invalid email format')
	declare email: string;

	@QRule((val: number) => val >= 18, 'Must be at least 18')
	@QRule((val: number) => val <= 120, 'Age seems unrealistic')
	declare age: number;

	@QRule((val: string) => val.length >= 3, 'Username too short')
	@QRule(
		(val: string) => /^[a-z0-9_]+$/.test(val),
		'Only lowercase letters, digits, underscores'
	)
	declare username: string;
}

// ── Async model ───────────────────────────────────────────────────────────────

interface IDocument {
	title: string;
	content: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class DocumentModel extends QModel<IDocument> {
	@QRule(
		(val: string) => Promise.resolve(val.trim().length > 0),
		'Title required'
	)
	declare title: string;

	@QRule(
		(val: string) => Promise.resolve(val.length >= 10),
		'Content too short'
	)
	declare content: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: @QRule / validation (guide/validation.md)', () => {
	describe('valid model passes all rules', () => {
		test('$qCheckRules() returns valid:true for correct data', () => {
			const reg = new RegistrationModel({
				email: 'alice@example.com',
				age: 25,
				username: 'alice_99',
			});

			const result = reg.$qCheckRules();
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('multiple errors for invalid model', () => {
		test('$qCheckRules() reports all failing rules', () => {
			const reg = new RegistrationModel({
				email: 'not-an-email',
				age: 15,
				username: 'A B',
			});

			const result = reg.$qCheckRules();
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(2);

			const fields = result.errors.map((err) => err.field);
			expect(fields).toContain('email');
			expect(fields).toContain('age');
			expect(fields).toContain('username');
		});
	});

	describe('multiple rules per field', () => {
		test('all rules on field are evaluated independently', () => {
			const reg = new RegistrationModel({
				email: 'ok@ok.com',
				age: 200, // fails second rule (> 120)
				username: 'ab', // fails first rule (length < 3)
			});

			const result = reg.$qCheckRules();
			expect(result.valid).toBe(false);

			const ageErrors = result.errors.filter(
				(err) => err.field === 'age'
			);
			const usernameErrors = result.errors.filter(
				(err) => err.field === 'username'
			);

			expect(ageErrors.length).toBeGreaterThanOrEqual(1);
			expect(usernameErrors.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('$qCheckRulesAsync()', () => {
		test('async rules validate correctly', async () => {
			const doc = new DocumentModel({
				title: 'My Document',
				content: 'Long enough content here',
			});

			const result = await doc.$qCheckRulesAsync();
			expect(result.valid).toBe(true);
		});

		test('async rules report errors for invalid data', async () => {
			const doc = new DocumentModel({
				title: '',
				content: 'Short',
			});

			const result = await doc.$qCheckRulesAsync();
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
		});
	});
});

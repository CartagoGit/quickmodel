/**
 * Integration Test: i18n
 * Covers: docs-vitepress/en/guide/i18n.md
 *
 * Validates:
 * - QConfig.configure({ i18n: { resolver } }) translates error messages
 * - The resolver is called only for failing rules
 * - @QRule messages (keys) are passed through the resolver
 * - QConfig.reset() removes the resolver
 * - Multiple locales can be simulated by swapping the resolver
 */

import { afterEach, describe, expect, test } from 'bun:test';
import { QConfig, QModel, Quick } from '@/index';
import { QRule } from '@/decorators';

// ── Translation dictionaries ──────────────────────────────────────────────────

const translationsES: Record<string, string> = {
	'validation.name.minLength': 'El nombre debe tener al menos 3 caracteres',
	'validation.email.format': 'El formato del correo no es válido',
	'validation.age.min': 'La edad mínima es 18',
};

const translationsFR: Record<string, string> = {
	'validation.name.minLength': 'Le nom doit contenir au moins 3 caractères',
	'validation.email.format': "Le format de l'e-mail est invalide",
};

// ── Models ────────────────────────────────────────────────────────────────────

interface IUserForm {
	name: string;
	email: string;
	age: number;
}

@Quick({ age: Number }, { unknownPropertyPolicy: 'keep' })
class UserFormModel extends QModel<IUserForm> {
	@QRule(
		(val: string) => typeof val === 'string' && val.length >= 3,
		'validation.name.minLength'
	)
	declare name: string;

	@QRule(
		(val: string) => typeof val === 'string' && /\S+@\S+\.\S+/.test(val),
		'validation.email.format'
	)
	declare email: string;

	@QRule(
		(val: number) => typeof val === 'number' && val >= 18,
		'validation.age.min'
	)
	declare age: number;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: i18n (guide/i18n.md)', () => {
	afterEach(() => {
		QConfig.reset();
	});

	describe('resolver translates error messages', () => {
		test('Spanish resolver translates error keys', () => {
			QConfig.configure({
				i18n: {
					resolver: (key) => translationsES[key] ?? key,
				},
			});

			const result = new UserFormModel({
				name: 'Al',
				email: 'bad',
				age: 15,
			}).$qCheckRules();

			expect(result.valid).toBe(false);
			const messages = result.errors.map((err) => err.message);
			expect(messages).toContain(
				'El nombre debe tener al menos 3 caracteres'
			);
			expect(messages).toContain('El formato del correo no es válido');
			expect(messages).toContain('La edad mínima es 18');
		});

		test('French resolver translates error keys', () => {
			QConfig.configure({
				i18n: {
					resolver: (key) => translationsFR[key] ?? key,
				},
			});

			const result = new UserFormModel({
				name: 'Al',
				email: 'bad',
				age: 20,
			}).$qCheckRules();

			expect(result.valid).toBe(false);
			const messages = result.errors.map((err) => err.message);
			expect(messages).toContain(
				'Le nom doit contenir au moins 3 caractères'
			);
			expect(messages).toContain("Le format de l'e-mail est invalide");
		});
	});

	describe('resolver is called only for failing rules', () => {
		test('passing rules do not call the resolver', () => {
			let resolverCallCount = 0;

			QConfig.configure({
				i18n: {
					resolver: (key) => {
						resolverCallCount++;
						return translationsES[key] ?? key;
					},
				},
			});

			// All rules pass — resolver should not be called
			new UserFormModel({
				name: 'Alice',
				email: 'alice@example.com',
				age: 25,
			}).$qCheckRules();

			expect(resolverCallCount).toBe(0);
		});

		test('only failing rules call the resolver', () => {
			const calledWithKeys: string[] = [];

			QConfig.configure({
				i18n: {
					resolver: (key) => {
						calledWithKeys.push(key);
						return key;
					},
				},
			});

			// Only name fails
			new UserFormModel({
				name: 'Al',
				email: 'alice@example.com',
				age: 25,
			}).$qCheckRules();

			expect(calledWithKeys).toContain('validation.name.minLength');
			expect(calledWithKeys).not.toContain('validation.email.format');
			expect(calledWithKeys).not.toContain('validation.age.min');
		});
	});

	describe('QConfig.reset() removes the resolver', () => {
		test('after reset, raw keys are returned as messages', () => {
			QConfig.configure({
				i18n: {
					resolver: (key) => translationsES[key] ?? key,
				},
			});

			QConfig.reset();

			const result = new UserFormModel({
				name: 'Al',
				email: 'bad',
				age: 15,
			}).$qCheckRules();

			expect(result.valid).toBe(false);
			// Without resolver, the raw keys should be returned
			const messages = result.errors.map((err) => err.message);
			expect(messages).toContain('validation.name.minLength');
		});
	});

	describe('resolver on valid model returns no translation', () => {
		test('valid model does not trigger the resolver', () => {
			let called = false;
			QConfig.configure({
				i18n: {
					resolver: (key) => {
						called = true;
						return key;
					},
				},
			});

			const result = new UserFormModel({
				name: 'Alice',
				email: 'alice@example.com',
				age: 25,
			}).$qCheckRules();

			expect(result.valid).toBe(true);
			expect(called).toBe(false);
		});
	});
});

/**
 * TDD Tests: I18n de mensajes de validación — Propuesta E
 * Verifica que QConfig.i18n.resolver se invoca para traducir mensajes de @QRule.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Quick, QModel, QConfig } from '@/index';
import { QRule } from '@/decorators';
import type { IQConfig } from '@/core/config/quick.config';

// ─────────────────────────────────────────────────────────────────────────────
// Restore QConfig after each test
// ─────────────────────────────────────────────────────────────────────────────
let _savedI18n: IQConfig['i18n'];

beforeEach(() => {
	_savedI18n = QConfig.get().i18n;
});

afterEach(() => {
	QConfig.configure({ i18n: _savedI18n });
});

// ─────────────────────────────────────────────────────────────────────────────
// Modelos de prueba
// ─────────────────────────────────────────────────────────────────────────────

interface IUser {
	name: string;
	age: number;
}

@Quick()
class UserI18n extends QModel<IUser> {
	@QRule((val: string) => val.length >= 3, 'validation.name.minLength')
	declare name: string;

	@QRule((val: number) => val >= 0, 'validation.age.nonNegative')
	declare age: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('QConfig.i18n.resolver — sync checkRules()', () => {
	test('sin resolver, checkRules() devuelve la clave cruda como mensaje', () => {
		const user = new UserI18n({ name: 'AB', age: 5 });
		const result = user.$qCheckRules();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toBe('validation.name.minLength');
	});

	test('con resolver, el mensaje se traduce usando la clave', () => {
		QConfig.configure({
			i18n: {
				resolver: (key) => {
					const map: Record<string, string> = {
						'validation.name.minLength':
							'El nombre es demasiado corto',
						'validation.age.nonNegative':
							'La edad no puede ser negativa',
					};
					return map[key] ?? key;
				},
			},
		});

		const user = new UserI18n({ name: 'AB', age: 5 });
		const result = user.$qCheckRules();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toBe('El nombre es demasiado corto');
	});

	test('resolver no llamado cuando la regla pasa (sin errores)', () => {
		let called = false;
		QConfig.configure({
			i18n: {
				resolver: (key) => {
					called = true;
					return key;
				},
			},
		});

		const user = new UserI18n({ name: 'Alice', age: 30 });
		const result = user.$qCheckRules();
		expect(result.valid).toBe(true);
		expect(called).toBe(false);
	});

	test('rule con mensaje como función también pasa por el resolver', () => {
		@Quick()
		class FnMessageModel extends QModel<{ val: string }> {
			@QRule((str: string) => str.length > 0, () => 'validation.required')
			declare val: string;
		}

		QConfig.configure({
			i18n: {
				resolver: (key) =>
					key === 'validation.required' ? 'Campo requerido' : key,
			},
		});

		const obj = new FnMessageModel({ val: '' });
		const result = obj.$qCheckRules();
		expect(result.errors[0]?.message).toBe('Campo requerido');
	});

	test('múltiples errores, todos resueltos con el resolver', () => {
		QConfig.configure({
			i18n: {
				resolver: (key) => `[ES] ${key}`,
			},
		});
		const user = new UserI18n({ name: 'AB', age: -1 });
		const result = user.$qCheckRules();
		expect(result.valid).toBe(false);
		expect(
			result.errors.every((err) => err.message.startsWith('[ES] '))
		).toBe(true);
	});
});

describe('QConfig.i18n.resolver — async checkRulesAsync()', () => {
	test('con resolver, checkRulesAsync() también resuelve mensajes', async () => {
		QConfig.configure({
			i18n: {
				resolver: (key) => `ASYNC:${key}`,
			},
		});

		const user = new UserI18n({ name: 'AB', age: 5 });
		const result = await user.$qCheckRulesAsync();
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toMatch(/^ASYNC:/);
	});
});

describe('QConfig.i18n — aislamiento entre tests', () => {
	test('resolver del test anterior no afecta a este test (cleanup funciona)', () => {
		// No resolver set in this test
		const user = new UserI18n({ name: 'AB', age: 5 });
		const result = user.$qCheckRules();
		expect(result.errors[0]?.message).toBe('validation.name.minLength');
	});
});

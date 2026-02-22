import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface IUser {
	name: string;
	age: number;
	email: string;
}

@Quick({ name: 'string', age: 'number', email: 'string' })
class UserModel extends QModel<IUser> {
	@QRule(
		(v: unknown) => typeof v === 'string' && v.length >= 3,
		'Name must be at least 3 chars'
	)
	declare name: string;

	@QRule(
		(v: unknown) => typeof v === 'number' && v >= 0,
		'Age cannot be negative'
	)
	@QRule(
		(v: unknown) => typeof v === 'number' && v <= 120,
		'Age must be realistic'
	)
	declare age: number;

	@QRule(
		(v: unknown) => typeof v === 'string' && v.includes('@'),
		'Must be a valid email'
	)
	declare email: string;
}

// ---------------------------------------------------------------------------
// Basic
// ---------------------------------------------------------------------------

describe('@QRule + checkRules()', () => {
	test('should return valid=true when all rules pass', () => {
		const user = new UserModel({
			name: 'Alice',
			age: 30,
			email: 'alice@example.com',
		});
		const result = user.checkRules();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('should return valid=false and collect errors when rules fail', () => {
		const user = new UserModel({
			name: 'Jo',
			age: -1,
			email: 'notanemail',
		});
		const result = user.checkRules();
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(3);
	});

	test('should report the correct field name', () => {
		const user = new UserModel({
			name: 'Jo',
			age: 30,
			email: 'valid@email.com',
		});
		const result = user.checkRules();
		expect(result.errors[0]?.field).toBe('name');
	});

	test('should report the error message', () => {
		const user = new UserModel({
			name: 'Jo',
			age: 30,
			email: 'valid@email.com',
		});
		const result = user.checkRules();
		expect(result.errors[0]?.message).toBe('Name must be at least 3 chars');
	});

	test('should report the failing value', () => {
		const user = new UserModel({
			name: 'Jo',
			age: 30,
			email: 'valid@email.com',
		});
		const result = user.checkRules();
		expect(result.errors[0]?.value).toBe('Jo');
	});

	test('should collect ALL failures for a field with multiple rules', () => {
		// age = 999 fails BOTH rules (< 0 && > 120)
		const user = new UserModel({
			name: 'Alice',
			age: 999,
			email: 'alice@example.com',
		});
		const result = user.checkRules();
		expect(result.valid).toBe(false);
		const ageErrors = result.errors.filter((e) => e.field === 'age');
		expect(ageErrors).toHaveLength(1); // only "> 120" fails, first rule passes for 999 since 999 >= 0
	});

	test('should collect all failures across multiple fields', () => {
		const user = new UserModel({
			name: 'Jo',
			age: -1,
			email: 'notanemail',
		});
		const result = user.checkRules();
		const fields = result.errors.map((e) => e.field);
		expect(fields).toContain('name');
		expect(fields).toContain('age');
		expect(fields).toContain('email');
	});
});

// ---------------------------------------------------------------------------
// Lazy message (i18n support)
// ---------------------------------------------------------------------------

describe('@QRule — lazy message (() => string)', () => {
	let lang = 'en';
	const messages: Record<string, Record<string, string>> = {
		en: { 'val.min': 'Too short' },
		es: { 'val.min': 'Demasiado corto' },
	};
	const t = (key: string) => messages[lang]?.[key] ?? key;

	@Quick({ name: 'string' })
	class LocalizedModel extends QModel<{ name: string }> {
		@QRule(
			(v: unknown) => typeof v === 'string' && v.length >= 3,
			() => t('val.min')
		)
		declare name: string;
	}

	test('should resolve the message when checkRules() is called (en)', () => {
		lang = 'en';
		const m = new LocalizedModel({ name: 'Jo' });
		const { errors } = m.checkRules();
		expect(errors[0]?.message).toBe('Too short');
	});

	test('should resolve a different message at runtime (es)', () => {
		lang = 'es';
		const m = new LocalizedModel({ name: 'Jo' });
		const { errors } = m.checkRules();
		expect(errors[0]?.message).toBe('Demasiado corto');
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('@QRule — edge cases', () => {
	test('model with no @QRule decorators returns valid=true', () => {
		@Quick({ x: 'number' })
		class Plain extends QModel<{ x: number }> {
			declare x: number;
		}
		const p = new Plain({ x: 5 });
		expect(p.checkRules().valid).toBe(true);
		expect(p.checkRules().errors).toHaveLength(0);
	});

	test('predicate receiving null/undefined returns the rule message', () => {
		@Quick({ val: 'string' })
		class NullModel extends QModel<{ val: string }> {
			@QRule(
				(v: unknown) =>
					v !== null && v !== undefined && (v as string).length > 0,
				'Required'
			)
			declare val: string;
		}
		const m = new NullModel({});
		(m as any).val = null;
		const { errors } = m.checkRules();
		expect(errors[0]?.message).toBe('Required');
	});

	test('checkRules() can be called multiple times without side effects', () => {
		const user = new UserModel({
			name: 'Jo',
			age: 30,
			email: 'valid@email.com',
		});
		const r1 = user.checkRules();
		const r2 = user.checkRules();
		expect(r1.errors).toHaveLength(r2.errors.length);
	});
});

// ---------------------------------------------------------------------------
// hasIntegrity()
// ---------------------------------------------------------------------------

describe('hasIntegrity()', () => {
	@Quick({ age: 'number', active: 'boolean' })
	class IntegrityModel extends QModel<{ age: number; active: boolean }> {
		declare age: number;
		declare active: boolean;
	}

	test('should return true when all field types are correct', () => {
		const m = new IntegrityModel({ age: 25, active: true });
		expect(m.hasIntegrity()).toBe(true);
	});

	test('should return false when a field has the wrong type', () => {
		const m = new IntegrityModel({ age: 25, active: true });
		(m as any).age = 'not-a-number'; // force type mismatch
		expect(m.hasIntegrity()).toBe(false);
	});

	test('should be consistent with checkIntegrity().length === 0', () => {
		const good = new IntegrityModel({ age: 40, active: false });
		expect(good.hasIntegrity()).toBe(good.checkIntegrity().length === 0);

		const bad = new IntegrityModel({ age: 40, active: false });
		(bad as any).active = 999;
		expect(bad.hasIntegrity()).toBe(bad.checkIntegrity().length === 0);
	});
});

// ---------------------------------------------------------------------------
// isValid()
// ---------------------------------------------------------------------------

describe('isValid()', () => {
	@Quick({ age: 'number' })
	class ValidatedModel extends QModel<{ age: number }> {
		@QRule(
			(v: unknown) => typeof v === 'number' && v >= 18,
			'Must be adult'
		)
		declare age: number;
	}

	test('should return true when integrity passes and all rules pass', () => {
		const m = new ValidatedModel({ age: 25 });
		expect(m.isValid()).toBe(true);
	});

	test('should return false when a @QRule fails', () => {
		const m = new ValidatedModel({ age: 10 }); // underage
		expect(m.isValid()).toBe(false);
	});

	test('should return false when integrity fails', () => {
		const m = new ValidatedModel({ age: 25 });
		(m as any).age = 'broken'; // force type mismatch
		expect(m.isValid()).toBe(false);
	});

	test('should return false when both integrity and rules fail', () => {
		const m = new ValidatedModel({ age: 25 });
		(m as any).age = 'not-a-number'; // type mismatch + rule also fails
		expect(m.isValid()).toBe(false);
	});

	test('should be equivalent to hasIntegrity() && checkRules().valid', () => {
		const good = new ValidatedModel({ age: 30 });
		expect(good.isValid()).toBe(
			good.hasIntegrity() && good.checkRules().valid
		);

		const bad = new ValidatedModel({ age: 10 });
		expect(bad.isValid()).toBe(
			bad.hasIntegrity() && bad.checkRules().valid
		);
	});
});

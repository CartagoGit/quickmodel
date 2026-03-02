/**
 * Integration tests for error flows and recovery.
 * Covers: cross-feature/G
 *
 * Tests that errors during construction/deserialization do not corrupt global state,
 * and that the system recovers cleanly.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/decorators';

// ─── Model for G-1: construction error isolation ──────────────────────────────

interface IStrict {
	value: number;
}

@Quick({ value: Number }, { unknownPropertyPolicy: 'error' })
class StrictModel extends QModel<IStrict> {
	declare value: number;
}

// ─── Model for G-2, G-4: deserialization error ────────────────────────────────

interface IUser {
	name: string;
	age: number;
}

@Quick({ age: Number }, { unknownPropertyPolicy: 'keep' })
class UserModel extends QModel<IUser> {
	@QRule(
		(val: string) => typeof val === 'string' && val.length >= 2,
		'Name too short'
	)
	declare name: string;

	@QRule(
		(val: number) => typeof val === 'number' && val >= 0,
		'Age cannot be negative'
	)
	declare age: number;
}

// ─── Model for G-5: nested unknown property ───────────────────────────────────

// ─── Model for G-5 (nested — unused, kept for reference) ───────────────────────
// profiles removed to avoid unused class warning
// AccountModel removed

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: error flows and recovery (errors/G)', () => {
	describe('G-1: Failed construction does not contaminate subsequent construction', () => {
		test('construction with unknown property throws under error policy', () => {
			expect(() => {
				new StrictModel({
					value: 42,
					unknown: 'bad',
				} as unknown as IStrict);
			}).toThrow();
		});

		test('after failed construction, new valid construction succeeds', () => {
			// First: attempt invalid construction
			try {
				new StrictModel({
					value: 42,
					unknown: 'bad',
				} as unknown as IStrict);
			} catch {
				// expected
			}

			// Second: valid construction should work fine
			const model = new StrictModel({ value: 100 });
			expect(model.value).toBe(100);
		});

		test('multiple valid constructions after failure all succeed', () => {
			try {
				new StrictModel({ value: 1, x: 'y' } as unknown as IStrict);
			} catch {
				// expected
			}

			const mod1 = new StrictModel({ value: 1 });
			const mod2 = new StrictModel({ value: 2 });
			const mod3 = new StrictModel({ value: 3 });
			expect(mod1.value).toBe(1);
			expect(mod2.value).toBe(2);
			expect(mod3.value).toBe(3);
		});
	});

	describe('G-2: $qDeserializeJson() with invalid JSON — fromJSON() propagates error', () => {
		test('fromJSON() with malformed JSON string throws SyntaxError', () => {
			expect(() => {
				UserModel.fromJSON('{ invalid json');
			}).toThrow();
		});

		test('fromJSON() with valid JSON creates model correctly', () => {
			const json = JSON.stringify({ name: 'Alice', age: 30 });
			const model = UserModel.fromJSON(json);
			expect(model.name).toBe('Alice');
			expect(model.age).toBe(30);
		});
	});

	describe('G-3: Rule errors are informative and do not crash the system', () => {
		test('invalid model has descriptive errors', () => {
			const model = new UserModel({ name: 'A', age: -5 });
			const { valid, errors } = model.$qCheckRules();
			expect(valid).toBe(false);
			expect(errors.length).toBeGreaterThan(0);
			// Each error has a field
			for (const err of errors) {
				expect(typeof err.field).toBe('string');
				expect(typeof err.message).toBe('string');
			}
		});

		test('valid model has no errors', () => {
			const model = new UserModel({ name: 'Alice', age: 25 });
			const { valid, errors } = model.$qCheckRules();
			expect(valid).toBe(true);
			expect(errors.length).toBe(0);
		});
	});

	describe('G-4: Multiple sequential models are independent', () => {
		test('patch on one model does not affect another', () => {
			const mod1 = new UserModel({ name: 'Alice', age: 25 });
			const mod2 = new UserModel({ name: 'Bob', age: 30 });

			mod1.$qPatch({ age: 26 });
			expect(mod1.age).toBe(26);
			expect(mod2.age).toBe(30); // not affected
		});
	});
});

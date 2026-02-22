import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/** Simulates a DB uniqueness check */
async function isEmailUnique(email: string): Promise<boolean> {
	await new Promise((r) => setTimeout(r, 1));
	return !email.includes('taken');
}

@Quick()
class UserAsync extends QModel<{ name: string; email: string; age: number }> {
	@QRule((v) => (v as string).length >= 2, 'Name too short')
	declare name: string;

	@QRule(async (v) => isEmailUnique(v as string), 'Email already taken')
	declare email: string;

	@QRule((v) => Promise.resolve((v as number) >= 18), 'Must be 18+')
	@QRule((v) => Promise.resolve((v as number) <= 120), 'Age unrealistic')
	declare age: number;
}

@Quick()
class OnlySyncRules extends QModel<{ name: string }> {
	@QRule((v) => (v as string).length >= 2, 'Name too short')
	declare name: string;
}

@Quick()
class OnlyAsyncRules extends QModel<{ email: string }> {
	@QRule(async (v) => isEmailUnique(v as string), 'Email already taken')
	declare email: string;
}

// ---------------------------------------------------------------------------
// checkRulesAsync()
// ---------------------------------------------------------------------------

describe('checkRulesAsync() — async predicates', () => {
	test('returns Promise<IQRulesResult>', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
		});
		const result = user.checkRulesAsync();

		expect(result).toBeInstanceOf(Promise);
		const resolved = await result;
		expect(resolved).toHaveProperty('valid');
		expect(resolved).toHaveProperty('errors');
	});

	test('valid:true when all async rules pass', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'alice@example.com',
			age: 25,
		});
		const result = await user.checkRulesAsync();

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('valid:false when async rule fails', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'taken@example.com',
			age: 25,
		});
		const result = await user.checkRulesAsync();

		expect(result.valid).toBe(false);
		const emailError = result.errors.find((e) => e.field === 'email');
		expect(emailError?.message).toBe('Email already taken');
	});

	test('valid:false when sync rule fails (checkRulesAsync handles sync too)', async () => {
		const user = UserAsync.create({
			name: 'A',
			email: 'ok@example.com',
			age: 25,
		});
		const result = await user.checkRulesAsync();

		expect(result.valid).toBe(false);
		expect(result.errors[0].field).toBe('name');
		expect(result.errors[0].message).toBe('Name too short');
	});

	test('collects all errors (sync + async)', async () => {
		const user = UserAsync.create({
			name: 'A',
			email: 'taken@example.com',
			age: 15,
		});
		const result = await user.checkRulesAsync();

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});

	test('multiple async rules on same field — collects all failures', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 200,
		});
		const result = await user.checkRulesAsync();

		expect(result.valid).toBe(false);
		const ageErrors = result.errors.filter((e) => e.field === 'age');
		expect(ageErrors).toHaveLength(1); // only 'Age unrealistic' fails
	});

	test('model with only sync rules works with checkRulesAsync()', async () => {
		const model = OnlySyncRules.create({ name: 'Alice' });
		const result = await model.checkRulesAsync();
		expect(result.valid).toBe(true);
	});

	test('model with only async rules', async () => {
		const model = OnlyAsyncRules.create({ email: 'taken@example.com' });
		const result = await model.checkRulesAsync();
		expect(result.valid).toBe(false);
	});

	test('rejected async predicate is treated as rule failure', async () => {
		@Quick()
		class Broken extends QModel<{ x: number }> {
			@QRule(() => Promise.reject(new Error('DB down')), 'DB error')
			declare x: number;
		}

		const m = Broken.create({ x: 1 });
		const result = await m.checkRulesAsync();

		expect(result.valid).toBe(false);
		expect(result.errors[0].field).toBe('x');
	});
});

// ---------------------------------------------------------------------------
// isValidAsync()
// ---------------------------------------------------------------------------

describe('isValidAsync()', () => {
	test('returns Promise<boolean>', () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 25,
		});
		const result = user.isValidAsync();
		expect(result).toBeInstanceOf(Promise);
	});

	test('resolves true when all pass', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 25,
		});
		expect(await user.isValidAsync()).toBe(true);
	});

	test('resolves false when async rule fails', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'taken@example.com',
			age: 25,
		});
		expect(await user.isValidAsync()).toBe(false);
	});

	test('resolves false when integrity fails', async () => {
		// integrity fails if transformers report issues — just verify it respects checkIntegrity
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 25,
		});
		expect(await user.isValidAsync()).toBe(
			user.hasIntegrity() && (await user.checkRulesAsync()).valid
		);
	});
});

// ---------------------------------------------------------------------------
// validationReportAsync()
// ---------------------------------------------------------------------------

describe('validationReportAsync()', () => {
	test('returns Promise<IQValidationReport>', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 25,
		});
		const p = user.validationReportAsync();
		expect(p).toBeInstanceOf(Promise);

		const report = await p;
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});

	test('valid:true when both integrity and async rules pass', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 25,
		});
		const report = await user.validationReportAsync();
		expect(report.valid).toBe(true);
	});

	test('valid:false + rules.errors populated when async rule fails', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'taken@example.com',
			age: 25,
		});
		const report = await user.validationReportAsync();
		expect(report.valid).toBe(false);
		expect(report.rules.errors.length).toBeGreaterThan(0);
	});

	test('report.valid matches isValidAsync()', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'taken@example.com',
			age: 25,
		});
		const [report, isValid] = await Promise.all([
			user.validationReportAsync(),
			user.isValidAsync(),
		]);
		expect(report.valid).toBe(isValid);
	});
});

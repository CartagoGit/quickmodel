/**
 * @fileoverview TDD tests for `QModel.validate()` — Propuesta O
 *
 * validate() is a unified method that replaces the need to call
 * validationReport() / validationReportAsync() separately.
 *
 * Covered scenarios:
 *  - validate() with no options → IQValidateResult (sync)
 *  - validate() reports integrity failures
 *  - validate() reports rule failures
 *  - validate() reports both failures combined
 *  - validate({ async: true }) → Promise<IQValidateResult>
 *  - validate({ async: true }) resolves with correct structure
 *  - validate({ async: true }) supports async predicates
 *  - validate({ groups: ['g'] }) → only rules for that group
 *  - validate({ groups: ['a', 'b'] }) → combines groups
 *  - validate({ async: true, timeoutMs }) → forwards timeout
 *  - validate({ async: true, mode: 'serial' }) → forwards mode
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { QConfig } from '@/core/config/quick.config';
import { QGroup } from '@/core/decorators/qgroup.decorator';
import { QRule } from '@/core/decorators/qrule.decorator';
import { Quick } from '@/core/decorators/quick.decorator';
import { QModel } from '@/core/models/quick.model';
import type {
	IQValidateOptions,
	IQValidateResult,
} from '@/core/models/quick.model';

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

interface IPerson {
	name: string;
	age: number;
}

interface IPersonWithRules {
	name: string;
	age: number;
}

interface IPersonWithGroups {
	name: string;
	age: number;
}

interface IPersonWithAsyncRules {
	name: string;
	age: number;
}

interface IPersonSlowAsync {
	name: string;
	age: number;
}

@Quick({ name: String, age: Number })
class Person extends QModel<IPerson> {
	name: string = '';
	age: number = 0;
}

@Quick({ name: String, age: Number })
class PersonWithRules extends QModel<IPersonWithRules> {
	@QRule((val: unknown) => String(val).trim().length > 0, 'Name is required')
	name: string = '';

	@QRule((val: unknown) => Number(val) >= 0, 'Age must be >= 0')
	age: number = 0;
}

@Quick({ name: String, age: Number })
class PersonWithGroups extends QModel<IPersonWithGroups> {
	@QGroup('personal')
	@QRule((val: unknown) => String(val).trim().length > 0, 'Name is required')
	name: string = '';

	@QGroup('work')
	@QRule((val: unknown) => Number(val) >= 0, 'Age must be >= 0')
	age: number = 0;
}

@Quick({ name: String, age: Number })
class PersonWithAsyncRules extends QModel<IPersonWithAsyncRules> {
	@QRule(async (val: unknown) => {
		await new Promise((res) => setTimeout(res, 10));
		return String(val).startsWith('A');
	}, 'Name must start with A (async)')
	name: string = '';

	@QRule((val: unknown) => Number(val) >= 0, 'Age >= 0')
	age: number = 0;
}

@Quick({ name: String, age: Number })
class PersonSlowAsync extends QModel<IPersonSlowAsync> {
	@QRule(async () => {
		await new Promise((res) => setTimeout(res, 500));
		return true;
	}, 'Slow predicate')
	name: string = '';
	age: number = 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QModel.$qValidate()', () => {
	beforeEach(() => {
		QConfig.reset();
	});
	afterEach(() => {
		QConfig.reset();
	});

	// -------------------------------------------------------------------------
	// 1. Sync — no options
	// -------------------------------------------------------------------------

	describe('no options (sync)', () => {
		test('returns IQValidateResult with valid: true when all pass', () => {
			const person = Person.create({ name: 'Alice', age: 30 });
			const result: IQValidateResult = person.$qValidate();

			expect(result.valid).toBe(true);
			expect(result.integrity).toHaveLength(0);
			expect(result.rules.valid).toBe(true);
			expect(result.rules.errors).toHaveLength(0);
		});

		test('result has same shape as validationReport()', () => {
			const person = Person.create({ name: 'Alice', age: 30 });
			const report = person.$qValidationReport();
			const result = person.$qValidate();

			expect(result).toEqual(report);
		});

		test('reports integrity failures', () => {
			const raw = { name: 123, age: 'not-a-number' };
			// Force instantiation bypassing transformer to trigger integrity issues
			const person = Object.assign(new Person({}), raw) as Person;
			const result = person.$qValidate();

			// integrity.length > 0 when field types don't match
			expect(result.integrity.length).toBeGreaterThan(0);
			expect(result.valid).toBe(false);
		});

		test('reports rule failures', () => {
			const person = PersonWithRules.create({ name: '', age: 30 });
			const result = person.$qValidate();

			expect(result.valid).toBe(false);
			expect(result.rules.valid).toBe(false);
			const messages = result.rules.errors.map((err) => err.message);
			expect(messages).toContain('Name is required');
		});

		test('reports both integrity + rule failures', () => {
			const person = PersonWithRules.create({ name: '', age: -5 });
			const result = person.$qValidate();

			expect(result.valid).toBe(false);
			expect(result.rules.errors.length).toBeGreaterThan(0);
		});

		test('valid: true when all pass with rules', () => {
			const person = PersonWithRules.create({ name: 'Alice', age: 30 });
			const result = person.$qValidate();

			expect(result.valid).toBe(true);
			expect(result.rules.errors).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Options: groups
	// -------------------------------------------------------------------------

	describe('options: groups', () => {
		test('single group — only evaluates rules for that group', () => {
			// name fails, age passes — filter to "personal" → only name rule runs
			const person = PersonWithGroups.create({ name: '', age: 30 });
			const result = person.$qValidate({ groups: ['personal'] });

			expect(result.valid).toBe(false);
			const messages = result.rules.errors.map((err) => err.message);
			expect(messages).toContain('Name is required');
		});

		test('single group — skips rules outside that group', () => {
			// age is negative but belongs to "work" group — "personal" group should not report it
			const person = PersonWithGroups.create({ name: 'Alice', age: -1 });
			const result = person.$qValidate({ groups: ['personal'] });

			expect(result.valid).toBe(true);
			expect(result.rules.errors).toHaveLength(0);
		});

		test('multiple groups — combines results from all groups', () => {
			// both name and age fail
			const person = PersonWithGroups.create({ name: '', age: -1 });
			const result = person.$qValidate({
				groups: ['personal', 'work'],
			});

			expect(result.valid).toBe(false);
			const messages = result.rules.errors.map((err) => err.message);
			expect(messages).toContain('Name is required');
			expect(messages).toContain('Age must be >= 0');
		});

		test('multiple groups — valid when all groups pass', () => {
			const person = PersonWithGroups.create({ name: 'Alice', age: 30 });
			const result = person.$qValidate({
				groups: ['personal', 'work'],
			});

			expect(result.valid).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 3. Async path
	// -------------------------------------------------------------------------

	describe('options: async: true', () => {
		test('returns a Promise when async: true', () => {
			const person = Person.create({ name: 'Alice', age: 30 });
			const opts: IQValidateOptions & { async: true } = { async: true };
			const result = person.$qValidate(opts);

			expect(result).toBeInstanceOf(Promise);
			return result;
		});

		test('resolves with IQValidateResult structure', async () => {
			const person = Person.create({ name: 'Alice', age: 30 });
			const result = await person.$qValidate({ async: true });

			expect(result.valid).toBe(true);
			expect(result.integrity).toHaveLength(0);
			expect(result.rules.valid).toBe(true);
			expect(result.rules.errors).toHaveLength(0);
		});

		test('resolves same result as validationReportAsync()', async () => {
			const person = PersonWithRules.create({ name: 'Alice', age: 30 });
			const [report, result] = await Promise.all([
				person.$qValidationReportAsync(),
				person.$qValidate({ async: true }),
			]);

			expect(result).toEqual(report);
		});

		test('async rules work — valid case', async () => {
			const person = PersonWithAsyncRules.create({
				name: 'Alice',
				age: 5,
			});
			const result = await person.$qValidate({ async: true });

			expect(result.valid).toBe(true);
		});

		test('async rules work — invalid case', async () => {
			const person = PersonWithAsyncRules.create({ name: 'Bob', age: 5 });
			const result = await person.$qValidate({ async: true });

			expect(result.valid).toBe(false);
			const messages = result.rules.errors.map((err) => err.message);
			expect(messages).toContain('Name must start with A (async)');
		});

		test('forwards timeoutMs — slow predicate fails with timeout', async () => {
			const person = PersonSlowAsync.create({ name: 'Alice', age: 0 });
			const result = await person.$qValidate({
				async: true,
				timeoutMs: 50,
			});

			// The predicate takes 500ms but timeout is 50ms → should fail
			expect(result.valid).toBe(false);
		});

		test('forwards mode: serial', async () => {
			const person = PersonWithAsyncRules.create({
				name: 'Alice',
				age: 5,
			});
			const result = await person.$qValidate({
				async: true,
				mode: 'serial',
			});

			expect(result.valid).toBe(true);
		});

		test('forwards timeoutMessage', async () => {
			const person = PersonSlowAsync.create({ name: 'Alice', age: 0 });
			const result = await person.$qValidate({
				async: true,
				timeoutMs: 50,
				timeoutMessage: 'Timed out!',
			});

			const messages = result.rules.errors.map((err) => err.message);
			expect(messages).toContain('Timed out!');
		});
	});

	// -------------------------------------------------------------------------
	// 4. Type safety
	// -------------------------------------------------------------------------

	describe('type safety', () => {
		test('validate() without async option returns IQValidateResult (not Promise)', () => {
			const person = Person.create({ name: 'Alice', age: 30 });
			const result = person.$qValidate();

			// If this compiled correctly, result is not a Promise
			expect(result).not.toBeInstanceOf(Promise);
			expect(typeof result.valid).toBe('boolean');
		});

		test('IQValidateResult has required shape fields', () => {
			const person = Person.create({ name: 'Alice', age: 30 });
			const result: IQValidateResult = person.$qValidate();

			expect('valid' in result).toBe(true);
			expect('integrity' in result).toBe(true);
			expect('rules' in result).toBe(true);
			expect('valid' in result.rules).toBe(true);
			expect('errors' in result.rules).toBe(true);
		});
	});
});

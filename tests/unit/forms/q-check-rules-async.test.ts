/**
 * @fileoverview TDD tests for `qCheckRulesAsync`.
 *
 * Mirrors the coverage of `qCheckRules` plus the async-specific dimensions:
 * - Async predicates (Promises) are properly awaited
 * - Group filtering works the same as in the sync version
 * - `timeoutMs` triggers `timedOut: true` on slow predicates
 * - `timeoutMessage` overrides the rule message on timeout
 * - `mode: 'serial'` runs predicates sequentially (correct results guaranteed)
 * - `mode: 'parallel'` (default) runs predicates concurrently
 *
 * Works on **any class** — no need to extend `QModel`.
 */

import { describe, test, expect } from 'bun:test';
import 'reflect-metadata';
import { QRule } from '@/core/decorators/qrule.decorator';
import { QGroup } from '@/core/decorators/qgroup.decorator';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import { qCheckRulesByGroupAsync } from '@/core/helpers/q-check-rules-by-group-async';

// =============================================================================
// Shared test fixtures
// =============================================================================

/** Async delay helper. */
const delay = (delayMs: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, delayMs));

/**
 * Plain form class with mixed sync + async rules and @QGroup annotations.
 */
class ContactFormAsync {
	@QRule((val: string) => val.length >= 2, 'Name too short') // sync
	@QGroup('identity')
	name = '';

	@QRule(async (val: string) => {
		await delay(5);
		return /^[^@]+@[^@]+\.[^@]+$/.test(val);
	}, 'Invalid email') // async
	@QGroup('identity')
	email = '';

	@QRule(async (val: string) => {
		await delay(5);
		return val.length >= 8;
	}, 'Password too short') // async
	@QRule((val: string) => /[A-Z]/.test(val), 'Must contain uppercase') // sync
	@QGroup('security')
	password = '';

	// Ungrouped field with async rule
	@QRule(async (val: string) => {
		await delay(5);
		return val.length > 0;
	}, 'Street required')
	street = '';
}

/** Class with only sync rules and no @QGroup. */
class PlainSyncForm {
	@QRule((val: string) => val.length > 0, 'Name required')
	name = '';

	@QRule((val: number) => val >= 0, 'Must be non-negative')
	age = 0;
}

/** Class with no decorators. */
class EmptyForm {
	name = '';
}

// =============================================================================
// qCheckRulesAsync — no group filter
// =============================================================================

describe('qCheckRulesAsync — no group filter', () => {
	test('resolves valid:true when all sync + async rules pass', async () => {
		const form = new ContactFormAsync();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('resolves valid:false when any rule fails', async () => {
		const form = new ContactFormAsync();
		form.name = 'A';
		form.email = 'not-an-email';
		form.password = 'weak';
		form.street = '';

		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	test('error entry has field, message, value', async () => {
		const form = new ContactFormAsync();
		form.name = 'A';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = await qCheckRulesAsync(form);
		const errEntry = result.errors.find((err) => err.field === 'name');
		expect(errEntry).toBeDefined();
		expect(errEntry?.message).toBe('Name too short');
		expect(errEntry?.value).toBe('A');
	});

	test('evaluates ALL fields including ungrouped', async () => {
		const form = new ContactFormAsync();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = ''; // fails

		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'street')).toBe(true);
	});

	test('works on a class with no rules — returns valid:true', async () => {
		const form = new EmptyForm();
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('sync predicates work correctly in async context', async () => {
		const form = new PlainSyncForm();
		form.name = '';
		form.age = -1;

		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
	});
});

// =============================================================================
// qCheckRulesAsync — group filter
// =============================================================================

describe('qCheckRulesAsync — group filter', () => {
	test('evaluates only rules from the specified group', async () => {
		const form = new ContactFormAsync();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'weak'; // security fails — should be ignored
		form.street = ''; // ungrouped fails — should be ignored

		const result = await qCheckRulesAsync(form, { group: 'identity' });
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('reports only errors for the specified group', async () => {
		const form = new ContactFormAsync();
		form.name = 'A'; // identity fails
		form.email = 'not-valid'; // identity fails
		form.password = 'Secret1!'; // security passes
		form.street = '42 Main St';

		const result = await qCheckRulesAsync(form, { group: 'identity' });
		expect(result.valid).toBe(false);
		expect(result.errors.map((err) => err.field).sort()).toEqual([
			'email',
			'name',
		]);
	});

	test('ungrouped fields are excluded when group filter is given', async () => {
		const form = new ContactFormAsync();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = ''; // would fail but is ungrouped

		const result = await qCheckRulesAsync(form, { group: 'identity' });
		expect(result.errors.some((err) => err.field === 'street')).toBe(false);
	});

	test('unknown group returns valid:true with no errors', async () => {
		const form = new ContactFormAsync();
		form.name = 'A'; // would fail under 'identity'
		form.email = 'bad';
		form.password = 'weak';
		form.street = '';

		const result = await qCheckRulesAsync(form, { group: 'nonexistent' });
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

// =============================================================================
// qCheckRulesAsync — timeout
// =============================================================================

describe('qCheckRulesAsync — timeoutMs', () => {
	test('slow predicate triggers timedOut:true in the error', async () => {
		class SlowForm {
			@QRule(async (val: string) => {
				await delay(200);
				return val.length > 0;
			}, 'Slow rule')
			field = 'x';
		}

		const form = new SlowForm();
		const result = await qCheckRulesAsync(form, { timeoutMs: 30 });
		expect(result.valid).toBe(false);
		const errEntry = result.errors.find((err) => err.field === 'field');
		expect(errEntry?.timedOut).toBe(true);
		expect(errEntry?.message).toBe('Slow rule');
	});

	test('timeoutMessage overrides rule message on timeout', async () => {
		class SlowForm {
			@QRule(async (val: string) => {
				await delay(200);
				return val.length > 0;
			}, 'Original message')
			field = 'x';
		}

		const form = new SlowForm();
		const result = await qCheckRulesAsync(form, {
			timeoutMs: 30,
			timeoutMessage: 'Service unavailable',
		});
		const errEntry = result.errors.find((err) => err.field === 'field');
		expect(errEntry?.timedOut).toBe(true);
		expect(errEntry?.message).toBe('Service unavailable');
	});

	test('fast predicate does NOT trigger timedOut', async () => {
		class FastForm {
			@QRule(async (val: string) => {
				await delay(1);
				return val.length > 0;
			}, 'Fast rule')
			field = '';
		}

		const form = new FastForm();
		form.field = 'x';
		const result = await qCheckRulesAsync(form, { timeoutMs: 100 });
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('lazy timeoutMessage (function) is evaluated at call time', async () => {
		class SlowForm {
			@QRule(async () => {
				await delay(200);
				return false;
			}, 'Original')
			field = 'x';
		}

		const form = new SlowForm();
		const result = await qCheckRulesAsync(form, {
			timeoutMs: 30,
			timeoutMessage: () => 'Lazy timeout message',
		});
		const err = result.errors[0];
		expect(err?.message).toBe('Lazy timeout message');
	});
});

// =============================================================================
// qCheckRulesAsync — execution mode
// =============================================================================

describe('qCheckRulesAsync — mode: serial', () => {
	test('returns same result as parallel for independent rules', async () => {
		const form = new ContactFormAsync();
		form.name = 'A'; // fails
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const parallel = await qCheckRulesAsync(form);
		const serial = await qCheckRulesAsync(form, { mode: 'serial' });

		expect(serial.valid).toBe(parallel.valid);
		expect(serial.errors.map((err) => err.field)).toEqual(
			parallel.errors.map((err) => err.field)
		);
	});

	test('serial mode with timeout correctly flags slow predicates', async () => {
		class SerialForm {
			@QRule(async () => {
				await delay(200);
				return false;
			}, 'Slow A')
			fieldA = 'x';

			@QRule(async () => {
				await delay(200);
				return false;
			}, 'Slow B')
			fieldB = 'x';
		}

		const form = new SerialForm();
		const result = await qCheckRulesAsync(form, {
			mode: 'serial',
			timeoutMs: 30,
		});
		expect(result.errors).toHaveLength(2);
		expect(result.errors.every((err) => err.timedOut === true)).toBe(true);
	});
});

// =============================================================================
// Edge cases — group + timeoutMs combined, serial + group combined
// =============================================================================

describe('qCheckRulesAsync — group + timeoutMs combined', () => {
	test('only the targeted group is evaluated and timeout applies within it', async () => {
		class MixedGroupForm {
			@QRule(async (val: string) => {
				await delay(200);
				return val.length > 0;
			}, 'Identity slow')
			@QGroup('identity')
			fieldA = 'x';

			@QRule((val: string) => val.length > 0, 'Security fast')
			@QGroup('security')
			fieldB = '';
		}

		const form = new MixedGroupForm();
		// Only evaluate 'identity' with a short timeout — fieldB (security) must be ignored
		const result = await qCheckRulesAsync(form, {
			group: 'identity',
			timeoutMs: 30,
		});

		expect(result.valid).toBe(false);
		const identityErr = result.errors.find((err) => err.field === 'fieldA');
		expect(identityErr?.timedOut).toBe(true);
		// fieldB is in a different group — must NOT appear
		expect(result.errors.some((err) => err.field === 'fieldB')).toBe(false);
	});

	test('fast rule in targeted group passes even when timeout is configured', async () => {
		class FastGroupForm {
			@QRule(async (val: string) => {
				await delay(5);
				return val.length >= 2;
			}, 'Too short')
			@QGroup('identity')
			name = '';
		}

		const form = new FastGroupForm();
		form.name = 'Alice';
		const result = await qCheckRulesAsync(form, {
			group: 'identity',
			timeoutMs: 100,
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

describe('qCheckRulesAsync — mode: serial + group combined', () => {
	test('serial execution is limited to the specified group only', async () => {
		const form = new ContactFormAsync();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'weak'; // security fails — must be ignored
		form.street = ''; // ungrouped fails — must be ignored

		const result = await qCheckRulesAsync(form, {
			mode: 'serial',
			group: 'identity',
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('serial + group reports failures scoped to that group', async () => {
		const form = new ContactFormAsync();
		form.name = 'A'; // identity fails
		form.email = 'bad'; // identity fails
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = await qCheckRulesAsync(form, {
			mode: 'serial',
			group: 'identity',
		});
		expect(result.valid).toBe(false);
		expect(result.errors.map((err) => err.field).sort()).toEqual([
			'email',
			'name',
		]);
	});
});

// =============================================================================
// qCheckRulesByGroupAsync
// =============================================================================

describe('qCheckRulesByGroupAsync', () => {
	test('resolves one key per @QGroup group name', async () => {
		const form = new ContactFormAsync();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = await qCheckRulesByGroupAsync(form);
		expect(Object.keys(result).sort()).toEqual(['identity', 'security']);
	});

	test('each entry is a valid IQRulesResult', async () => {
		const form = new ContactFormAsync();
		const result = await qCheckRulesByGroupAsync(form);
		for (const entry of Object.values(result)) {
			expect(typeof entry.valid).toBe('boolean');
			expect(Array.isArray(entry.errors)).toBe(true);
		}
	});

	test('groups with passing rules resolve valid:true', async () => {
		const form = new ContactFormAsync();
		form.name = 'Alice';
		form.email = 'alice@example.com';
		form.password = 'Secret1!';
		form.street = '42 Main St';

		const result = await qCheckRulesByGroupAsync(form);
		expect(result['identity']?.valid).toBe(true);
		expect(result['security']?.valid).toBe(true);
	});

	test('groups with failing async rules resolve valid:false', async () => {
		const form = new ContactFormAsync();
		form.name = 'A'; // identity fails
		form.email = 'alice@example.com';
		form.password = 'Secret1!'; // security passes
		form.street = '42 Main St';

		const result = await qCheckRulesByGroupAsync(form);
		expect(result['identity']?.valid).toBe(false);
		expect(result['security']?.valid).toBe(true);
	});

	test('errors are scoped to their group (no cross-contamination)', async () => {
		const form = new ContactFormAsync();
		form.name = 'A'; // identity error
		form.email = 'alice@example.com';
		form.password = 'weak'; // security errors
		form.street = ''; // ungrouped — must not appear in any group

		const result = await qCheckRulesByGroupAsync(form);
		expect(
			result['identity']?.errors.every(
				(err) => err.field === 'name' || err.field === 'email'
			)
		).toBe(true);
		expect(
			result['security']?.errors.every((err) => err.field === 'password')
		).toBe(true);
		for (const entry of Object.values(result)) {
			expect(entry.errors.some((err) => err.field === 'street')).toBe(
				false
			);
		}
	});

	test('timeoutMs option propagates to each group evaluation', async () => {
		class SlowGroupForm {
			@QRule(async (val: string) => {
				await delay(200);
				return val.length > 0;
			}, 'Identity slow')
			@QGroup('identity')
			fieldA = 'x';
		}

		const form = new SlowGroupForm();
		const result = await qCheckRulesByGroupAsync(form, { timeoutMs: 30 });
		expect(result['identity']?.valid).toBe(false);
		expect(result['identity']?.errors[0]?.timedOut).toBe(true);
	});

	test('returns empty object when no @QGroup decorators are present', async () => {
		const form = new PlainSyncForm();
		const result = await qCheckRulesByGroupAsync(form);
		expect(Object.keys(result)).toHaveLength(0);
	});

	test('returns empty object when no decorators at all', async () => {
		const form = new EmptyForm();
		const result = await qCheckRulesByGroupAsync(form);
		expect(Object.keys(result)).toHaveLength(0);
	});
});

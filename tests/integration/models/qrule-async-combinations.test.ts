/**
 * Comprehensive async QRule combination tests.
 *
 * Matrix covered:
 *   timeout config  : none | equal for all | different per field | zero
 *   predicate speed : instant | fast | slow | very slow
 *   predicate outcome: passes | fails | crashes (throws)
 *   field count     : single | multiple (mixed rules per field)
 *   rule count/field: one | many
 *
 * Every describe block is self-contained — models are defined inline so
 * the combinations are readable without scrolling to a distant fixture.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { QModel, Quick, QRule } from '@/index';
import type { IQRulesAsyncOptions } from '@/index';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Resolves with `result` after `delayMs` ms */
function after(delayMs: number, result: boolean): () => Promise<boolean> {
	return () =>
		new Promise((resolve) => setTimeout(() => resolve(result), delayMs));
}

/** Rejects after `delayMs` ms */
function crash(delayMs: number): () => Promise<boolean> {
	return () =>
		new Promise<boolean>((_, reject) =>
			setTimeout(() => reject(new Error('crash')), delayMs)
		);
}

/** Resolves instantly (microtask) */
const instant = (result: boolean) => (): Promise<boolean> =>
	Promise.resolve(result);

// ---------------------------------------------------------------------------
// 1. No timeout configured — every predicate waits as long as needed
// ---------------------------------------------------------------------------

describe('no timeoutMs — all predicates awaited to completion', () => {
	@Quick({ name: 'string', email: 'string' })
	class NoTimeoutModel extends QModel<{ name: string; email: string }> {
		@QRule(after(40, true), 'Name taken') // 40 ms — passes
		declare name: string;

		@QRule(after(80, false), 'Email taken') // 80 ms — fails logically
		declare email: string;
	}

	test(
		'all predicates resolve fully; logical failures reported without timedOut',
		async () => {
			const model = NoTimeoutModel.create({
				name: 'alice',
				email: 'taken@x.com',
			});
			const result = await model.checkRulesAsync();

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.field).toBe('email');
			expect(result.errors[0]?.timedOut).toBeUndefined();
		},
		{ timeout: 500 }
	);

	test(
		'all predicates pass — valid:true',
		async () => {
			@Quick({ code: 'string' })
			class AllPassModel extends QModel<{ code: string }> {
				@QRule(after(20, true), 'Code err A')
				@QRule(after(35, true), 'Code err B')
				declare code: string;
			}

			const model = AllPassModel.create({ code: 'ok' });
			expect((await model.checkRulesAsync()).valid).toBe(true);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 2. Equal timeoutMs for all predicates
// ---------------------------------------------------------------------------

describe('equal timeoutMs — uniform budget', () => {
	const opts: IQRulesAsyncOptions = {
		timeoutMs: 50,
		timeoutMessage: 'timed out',
	};

	test(
		'fast rules (20 ms) pass within 50 ms budget',
		async () => {
			@Quick({ name: 'string' })
			class FastModel extends QModel<{ name: string }> {
				@QRule(after(20, true), 'Name err')
				declare name: string;
			}

			const result = await FastModel.create({
				name: 'alice',
			}).checkRulesAsync(opts);
			expect(result.valid).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'slow rules (100 ms) exceed 50 ms budget — all timedOut',
		async () => {
			@Quick({ name: 'string', email: 'string' })
			class SlowModel extends QModel<{ name: string; email: string }> {
				@QRule(after(100, true), 'Name err')
				declare name: string;

				@QRule(after(100, true), 'Email err')
				declare email: string;
			}

			const result = await SlowModel.create({
				name: 'alice',
				email: 'ok@x.com',
			}).checkRulesAsync(opts);
			expect(result.valid).toBe(false);
			expect(result.errors.every((err) => err.timedOut === true)).toBe(
				true
			);
			expect(result.errors).toHaveLength(2);
		},
		{ timeout: 500 }
	);

	test(
		'mix: fast field passes, slow field times out',
		async () => {
			@Quick({ fast: 'string', slow: 'string' })
			class MixedModel extends QModel<{ fast: string; slow: string }> {
				@QRule(after(10, true), 'Fast err')
				declare fast: string;

				@QRule(after(200, true), 'Slow err')
				declare slow: string;
			}

			const result = await MixedModel.create({
				fast: 'ok',
				slow: 'ok',
			}).checkRulesAsync(opts);
			expect(result.valid).toBe(false);

			const fastErr = result.errors.find((err) => err.field === 'fast');
			const slowErr = result.errors.find((err) => err.field === 'slow');

			expect(fastErr).toBeUndefined(); // passed within budget
			expect(slowErr?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'logical failure within budget: timedOut absent, message from rule',
		async () => {
			@Quick({ age: 'number' })
			class AgeModel extends QModel<{ age: number }> {
				@QRule(async (value: number) => {
					await Bun.sleep(10);
					return value >= 18;
				}, 'Too young')
				declare age: number;
			}

			const result = await AgeModel.create({ age: 15 }).checkRulesAsync(
				opts
			);
			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBeUndefined();
			expect(result.errors[0]?.message).toBe('Too young');
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 3. Different timeoutMs per call (reusing same model, different budgets)
// ---------------------------------------------------------------------------

describe('varying timeoutMs across calls on the same model', () => {
	// Predicates: name resolves in 30 ms, email in 80 ms, age sync
	@Quick({ name: 'string', email: 'string', age: 'number' })
	class VaryModel extends QModel<{
		name: string;
		email: string;
		age: number;
	}> {
		@QRule(after(30, true), 'Name taken')
		declare name: string;

		@QRule(after(80, true), 'Email taken')
		declare email: string;

		@QRule((value: number) => value >= 18, 'Too young')
		declare age: number;
	}

	let model: InstanceType<typeof VaryModel>;
	beforeAll(() => {
		model = VaryModel.create({ name: 'alice', email: 'ok@x.com', age: 25 });
	});

	test(
		'budget 20 ms — both async rules time out',
		async () => {
			const result = await model.checkRulesAsync({ timeoutMs: 20 });
			const timedOut = result.errors.filter((err) => err.timedOut);
			expect(timedOut.map((err) => err.field).sort()).toEqual([
				'email',
				'name',
			]);
		},
		{ timeout: 500 }
	);

	test(
		'budget 50 ms — name passes (30 ms), email times out (80 ms)',
		async () => {
			const result = await model.checkRulesAsync({ timeoutMs: 50 });
			expect(
				result.errors.find((err) => err.field === 'name')
			).toBeUndefined();
			expect(
				result.errors.find((err) => err.field === 'email')?.timedOut
			).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'budget 120 ms — both async rules pass, sync rule passes',
		async () => {
			const result = await model.checkRulesAsync({ timeoutMs: 120 });
			expect(result.valid).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'no budget — all resolve fully, valid:true',
		async () => {
			const result = await model.checkRulesAsync();
			expect(result.valid).toBe(true);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 4. Multiple rules per field — partial timeout within the same field
// ---------------------------------------------------------------------------

describe('multiple rules per field — independent timeout per predicate', () => {
	test(
		'first rule passes, second rule times out on same field',
		async () => {
			@Quick({ email: 'string' })
			class MultiRuleField extends QModel<{ email: string }> {
				@QRule(after(10, true), 'Format invalid') // fast, passes
				@QRule(after(200, true), 'Email taken') // slow, times out
				declare email: string;
			}

			const result = await MultiRuleField.create({
				email: 'ok@x.com',
			}).checkRulesAsync({
				timeoutMs: 50,
				timeoutMessage: 'Service unavailable',
			});

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.field).toBe('email');
			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe('Service unavailable');
		},
		{ timeout: 500 }
	);

	test(
		'first rule fails logically, second rule times out — both errors collected',
		async () => {
			@Quick({ email: 'string' })
			class DoubleFailField extends QModel<{ email: string }> {
				@QRule(after(10, false), 'Format invalid') // fast, logical failure
				@QRule(after(200, true), 'Email taken') // slow, timeout
				declare email: string;
			}

			const result = await DoubleFailField.create({
				email: 'bad',
			}).checkRulesAsync({ timeoutMs: 50 });

			expect(result.errors).toHaveLength(2);
			const formatErr = result.errors.find(
				(err) => err.message === 'Format invalid'
			);
			const takenErr = result.errors.find(
				(err) => err.message === 'Email taken'
			);

			expect(formatErr?.timedOut).toBeUndefined();
			expect(takenErr?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'all rules on field time out — one error per rule',
		async () => {
			@Quick({ token: 'string' })
			class AllRulesTimeout extends QModel<{ token: string }> {
				@QRule(after(200, true), 'Auth A')
				@QRule(after(200, true), 'Auth B')
				@QRule(after(200, true), 'Auth C')
				declare token: string;
			}

			const result = await AllRulesTimeout.create({
				token: 'abc',
			}).checkRulesAsync({ timeoutMs: 50 });

			expect(result.errors.every((err) => err.timedOut === true)).toBe(
				true
			);
			expect(result.errors).toHaveLength(3);
		},
		{ timeout: 500 }
	);

	test(
		'all rules on field pass within budget — no errors',
		async () => {
			@Quick({ token: 'string' })
			class AllRulesPass extends QModel<{ token: string }> {
				@QRule(after(10, true), 'Auth A')
				@QRule(after(15, true), 'Auth B')
				@QRule(after(20, true), 'Auth C')
				declare token: string;
			}

			const result = await AllRulesPass.create({
				token: 'abc',
			}).checkRulesAsync({ timeoutMs: 100 });

			expect(result.valid).toBe(true);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 5. Crash (reject) vs timeout — must not conflate the two
// ---------------------------------------------------------------------------

describe('crash vs timeout semantics', () => {
	test(
		'fast crash (5 ms) within 50 ms budget — failure but NOT timedOut',
		async () => {
			@Quick({ token: 'string' })
			class CrashModel extends QModel<{ token: string }> {
				@QRule(crash(5), 'Service down')
				declare token: string;
			}

			const result = await CrashModel.create({
				token: 'abc',
			}).checkRulesAsync({ timeoutMs: 50 });

			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBeUndefined();
			expect(result.errors[0]?.message).toBe('Service down');
		},
		{ timeout: 500 }
	);

	test(
		'slow crash (200 ms) — timeout wins before crash arrives',
		async () => {
			@Quick({ token: 'string' })
			class SlowCrashModel extends QModel<{ token: string }> {
				@QRule(crash(200), 'Service down')
				declare token: string;
			}

			const result = await SlowCrashModel.create({
				token: 'abc',
			}).checkRulesAsync({ timeoutMs: 50 });

			// Timeout fires first — timedOut:true, message from rule (no timeoutMessage given)
			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe('Service down');
		},
		{ timeout: 500 }
	);

	test(
		'field with crash rule + timeout rule — both produce distinct errors',
		async () => {
			@Quick({ data: 'string' })
			class CompoundModel extends QModel<{ data: string }> {
				@QRule(crash(10), 'Auth failed') // crashes fast
				@QRule(after(200, true), 'Data taken') // times out
				declare data: string;
			}

			const result = await CompoundModel.create({
				data: 'val',
			}).checkRulesAsync({ timeoutMs: 50 });

			expect(result.errors).toHaveLength(2);
			const crashErr = result.errors.find(
				(err) => err.message === 'Auth failed'
			);
			const timeoutErr = result.errors.find(
				(err) => err.message === 'Data taken'
			);

			expect(crashErr?.timedOut).toBeUndefined();
			expect(timeoutErr?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 6. Instant (microtask) predicates — never timeout regardless of budget
// ---------------------------------------------------------------------------

describe('instant predicates — never affected by timeoutMs', () => {
	test(
		'instant pass — valid:true even with 1 ms budget',
		async () => {
			@Quick({ val: 'string' })
			class InstantPass extends QModel<{ val: string }> {
				@QRule(instant(true), 'Err')
				declare val: string;
			}

			const result = await InstantPass.create({
				val: 'ok',
			}).checkRulesAsync({ timeoutMs: 1 });
			expect(result.valid).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'instant fail — logical error, no timedOut',
		async () => {
			@Quick({ val: 'string' })
			class InstantFail extends QModel<{ val: string }> {
				@QRule(instant(false), 'Always fails')
				declare val: string;
			}

			const result = await InstantFail.create({
				val: 'ok',
			}).checkRulesAsync({ timeoutMs: 1 });
			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBeUndefined();
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 7. Sync rules mixed with async rules — sync never timedOut
// ---------------------------------------------------------------------------

describe('sync and async rules coexist — sync unaffected by timeoutMs', () => {
	@Quick({ name: 'string', age: 'number', email: 'string' })
	class MixedSyncAsync extends QModel<{
		name: string;
		age: number;
		email: string;
	}> {
		@QRule((value: string) => value.length >= 3, 'Name too short') // sync
		@QRule(after(200, true), 'Name taken') // async, slow
		declare name: string;

		@QRule((value: number) => value >= 18, 'Too young') // sync
		declare age: number;

		@QRule(after(200, true), 'Email taken') // async, slow
		declare email: string;
	}

	test(
		'tight budget: sync rules evaluated correctly, slow async rules time out',
		async () => {
			const model = MixedSyncAsync.create({
				name: 'Jo',
				age: 15,
				email: 'ok@x.com',
			});
			const result = await model.checkRulesAsync({
				timeoutMs: 50,
				timeoutMessage: 'Timeout',
			});

			// Sync failures: name too short + age too young
			const nameShort = result.errors.find(
				(err) => err.message === 'Name too short'
			);
			const tooYoung = result.errors.find(
				(err) => err.message === 'Too young'
			);
			// Async timeouts: name taken + email taken
			const nameTaken = result.errors.find(
				(err) => err.message === 'Timeout' && err.field === 'name'
			);
			const emailTaken = result.errors.find(
				(err) => err.field === 'email' && err.timedOut
			);

			expect(nameShort?.timedOut).toBeUndefined();
			expect(tooYoung?.timedOut).toBeUndefined();
			expect(nameTaken?.timedOut).toBe(true);
			expect(emailTaken?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'generous budget: all async rules resolve, sync failures still reported',
		async () => {
			const model = MixedSyncAsync.create({
				name: 'Jo',
				age: 15,
				email: 'ok@x.com',
			});
			const result = await model.checkRulesAsync({ timeoutMs: 400 });

			// async rules passed (name taken / email taken = no errors for those)
			expect(result.errors.find((err) => err.timedOut)).toBeUndefined();
			// sync failures remain
			expect(
				result.errors.find((err) => err.message === 'Name too short')
			).toBeDefined();
			expect(
				result.errors.find((err) => err.message === 'Too young')
			).toBeDefined();
		},
		{ timeout: 600 }
	);
});

// ---------------------------------------------------------------------------
// 8. timeoutMessage variants
// ---------------------------------------------------------------------------

describe('timeoutMessage — static, lazy, absent', () => {
	function makeSlowModel() {
		@Quick({ val: 'string' })
		class SlowFieldModel extends QModel<{ val: string }> {
			@QRule(after(200, true), 'Rule default message')
			declare val: string;
		}
		return SlowFieldModel;
	}

	test(
		'static timeoutMessage overrides rule message on timeout',
		async () => {
			const SlowModel = makeSlowModel();
			const result = await SlowModel.create({
				val: 'ok',
			}).checkRulesAsync({
				timeoutMs: 30,
				timeoutMessage: 'Static override',
			});

			expect(result.errors[0]?.message).toBe('Static override');
		},
		{ timeout: 500 }
	);

	test(
		'lazy timeoutMessage (() => string) evaluated at call time',
		async () => {
			const SlowModel = makeSlowModel();
			let locale = 'en';
			const translations: Record<string, string> = {
				en: 'Service unavailable',
				es: 'Servicio no disponible',
			};

			locale = 'es';
			const result = await SlowModel.create({
				val: 'ok',
			}).checkRulesAsync({
				timeoutMs: 30,
				timeoutMessage: () => translations[locale] ?? 'unavailable',
			});

			expect(result.errors[0]?.message).toBe('Servicio no disponible');
		},
		{ timeout: 500 }
	);

	test(
		'no timeoutMessage — rule original message used on timeout',
		async () => {
			const SlowModel = makeSlowModel();
			const result = await SlowModel.create({
				val: 'ok',
			}).checkRulesAsync({ timeoutMs: 30 });

			expect(result.errors[0]?.message).toBe('Rule default message');
			expect(result.errors[0]?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'no timeoutMs at all — logical failure uses rule message, no timedOut',
		async () => {
			@Quick({ val: 'string' })
			class LogicalFailModel extends QModel<{ val: string }> {
				@QRule(after(20, false), 'Logical error')
				declare val: string;
			}

			const result = await LogicalFailModel.create({
				val: 'ok',
			}).checkRulesAsync();
			expect(result.errors[0]?.message).toBe('Logical error');
			expect(result.errors[0]?.timedOut).toBeUndefined();
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 9. Full combinatorial — many fields, heterogeneous delays and outcomes
// ---------------------------------------------------------------------------

describe('full combination: heterogeneous delays, timeouts, outcomes', () => {
	/**
	 * Model with 5 fields, each with a different scenario:
	 *   fieldA: instant pass
	 *   fieldB: fast pass (20 ms) within budget
	 *   fieldC: fast fail (20 ms) — logical failure within budget
	 *   fieldD: slow pass (150 ms) — exceeds 60 ms budget → timedOut
	 *   fieldE: crash (15 ms)     — reject within budget → failure, not timedOut
	 */
	@Quick({
		fieldA: 'string',
		fieldB: 'string',
		fieldC: 'string',
		fieldD: 'string',
		fieldE: 'string',
	})
	class FullComboModel extends QModel<{
		fieldA: string;
		fieldB: string;
		fieldC: string;
		fieldD: string;
		fieldE: string;
	}> {
		@QRule(instant(true), 'A: instant pass')
		declare fieldA: string;

		@QRule(after(20, true), 'B: fast pass')
		declare fieldB: string;

		@QRule(after(20, false), 'C: fast fail')
		declare fieldC: string;

		@QRule(after(150, true), 'D: slow → timeout')
		declare fieldD: string;

		@QRule(crash(15), 'E: crash')
		declare fieldE: string;
	}

	const budget: IQRulesAsyncOptions = {
		timeoutMs: 60,
		timeoutMessage: 'Timed out',
	};

	let result: Awaited<
		ReturnType<InstanceType<typeof FullComboModel>['checkRulesAsync']>
	>;

	beforeAll(async () => {
		const model = FullComboModel.create({
			fieldA: 'val',
			fieldB: 'val',
			fieldC: 'val',
			fieldD: 'val',
			fieldE: 'val',
		});
		result = await model.checkRulesAsync(budget);
	});

	test('fieldA (instant pass) — no error', () => {
		expect(
			result.errors.find((err) => err.field === 'fieldA')
		).toBeUndefined();
	});

	test('fieldB (fast pass) — no error', () => {
		expect(
			result.errors.find((err) => err.field === 'fieldB')
		).toBeUndefined();
	});

	test('fieldC (fast logical fail) — error without timedOut', () => {
		const err = result.errors.find((err) => err.field === 'fieldC');
		expect(err).toBeDefined();
		expect(err?.timedOut).toBeUndefined();
		expect(err?.message).toBe('C: fast fail');
	});

	test('fieldD (slow → times out) — timedOut:true with custom message', () => {
		const err = result.errors.find((err) => err.field === 'fieldD');
		expect(err?.timedOut).toBe(true);
		expect(err?.message).toBe('Timed out');
	});

	test('fieldE (crash within budget) — error without timedOut', () => {
		const err = result.errors.find((err) => err.field === 'fieldE');
		expect(err).toBeDefined();
		expect(err?.timedOut).toBeUndefined();
		expect(err?.message).toBe('E: crash');
	});

	test('valid:false — any failure makes the model invalid', () => {
		expect(result.valid).toBe(false);
	});

	test('exactly 3 errors total (C + D + E)', () => {
		expect(result.errors).toHaveLength(3);
	});

	test(
		'all predicates ran in parallel — elapsed ≈ max(timeout, 60 ms)',
		async () => {
			const model = FullComboModel.create({
				fieldA: 'v',
				fieldB: 'v',
				fieldC: 'v',
				fieldD: 'v',
				fieldE: 'v',
			});
			const start = Date.now();
			await model.checkRulesAsync(budget);
			const elapsed = Date.now() - start;

			// Sequential would be: 0+20+20+60+15 ≈ 115 ms.
			// Parallel caps at timeoutMs (60 ms).
			expect(elapsed).toBeLessThan(120);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 10. isValidAsync and validationReportAsync propagate options correctly
// ---------------------------------------------------------------------------

describe('isValidAsync and validationReportAsync with all option variants', () => {
	@Quick({ email: 'string', age: 'number' })
	class PropagationModel extends QModel<{ email: string; age: number }> {
		@QRule(after(150, true), 'Email taken') // always would pass but slow
		declare email: string;

		@QRule((value: number) => value >= 18, 'Too young') // sync, fails for age < 18
		declare age: number;
	}

	test(
		'isValidAsync — tight budget → false (slow rule times out)',
		async () => {
			const model = PropagationModel.create({
				email: 'ok@x.com',
				age: 25,
			});
			expect(await model.isValidAsync({ timeoutMs: 30 })).toBe(false);
		},
		{ timeout: 500 }
	);

	test(
		'isValidAsync — generous budget → true (all rules pass)',
		async () => {
			const model = PropagationModel.create({
				email: 'ok@x.com',
				age: 25,
			});
			expect(await model.isValidAsync({ timeoutMs: 300 })).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'isValidAsync — no budget → true (waits for all)',
		async () => {
			const model = PropagationModel.create({
				email: 'ok@x.com',
				age: 25,
			});
			expect(await model.isValidAsync()).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'isValidAsync — sync rule fails regardless of budget',
		async () => {
			const model = PropagationModel.create({
				email: 'ok@x.com',
				age: 10,
			});
			expect(await model.isValidAsync({ timeoutMs: 300 })).toBe(false);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync — tight budget: timedOut in report.rules, integrity not affected',
		async () => {
			const model = PropagationModel.create({
				email: 'ok@x.com',
				age: 25,
			});
			const report = await model.validationReportAsync({ timeoutMs: 30 });

			expect(report.valid).toBe(false);
			expect(report.integrity).toHaveLength(0); // no type mismatches
			expect(report.rules.errors[0]?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync — generous budget: report.valid:true',
		async () => {
			const model = PropagationModel.create({
				email: 'ok@x.com',
				age: 25,
			});
			const report = await model.validationReportAsync({
				timeoutMs: 300,
			});
			expect(report.valid).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync — lazy timeoutMessage reflected in report',
		async () => {
			const model = PropagationModel.create({
				email: 'ok@x.com',
				age: 25,
			});
			const report = await model.validationReportAsync({
				timeoutMs: 30,
				timeoutMessage: () => 'report timeout',
			});

			expect(report.rules.errors[0]?.message).toBe('report timeout');
		},
		{ timeout: 500 }
	);
});

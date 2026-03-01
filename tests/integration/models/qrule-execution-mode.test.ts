/**
 * Tests for the `mode` option in `checkRulesAsync()`.
 *
 * Matrix covered:
 *   mode            : undefined (default=parallel) | 'parallel' | 'serial'
 *   outcome         : all pass | all fail | mixed | all timeout | crash
 *   side-effects    : execution order, run count
 *   timing          : parallel O(max) vs serial O(Σ)
 *   timeoutMs + mode: serial + timeout stacks, parallel + timeout caps at max
 *   helpers         : isValidAsync, validationReportAsync
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/decorators';

// ---------------------------------------------------------------------------
// Helpers
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
			setTimeout(() => reject(new Error('boom')), delayMs)
		);
}

// ---------------------------------------------------------------------------
// 1. Default behavior (no mode option) — still parallel
// ---------------------------------------------------------------------------

describe('default mode (undefined) — behaves as parallel', () => {
	@Quick({ alpha: 'string', beta: 'string', gamma: 'string' })
	class DefaultModel extends QModel<{
		alpha: string;
		beta: string;
		gamma: string;
	}> {
		@QRule(after(50, true), 'A err')
		declare alpha: string;

		@QRule(after(50, true), 'B err')
		declare beta: string;

		@QRule(after(50, true), 'C err')
		declare gamma: string;
	}

	test(
		'three 50 ms rules without mode finish in ~50 ms (parallel)',
		async () => {
			const model = DefaultModel.create({
				alpha: 'x',
				beta: 'x',
				gamma: 'x',
			});
			const start = Date.now();
			const result = await model.$qm.checkRulesAsync(); // no mode
			const elapsed = Date.now() - start;

			expect(result.valid).toBe(true);
			// Sequential would be ≥ 150 ms; parallel finishes near 50 ms
			expect(elapsed).toBeLessThan(120);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 2. Explicit mode: 'parallel'
// ---------------------------------------------------------------------------

describe("mode: 'parallel' — explicit opt-in mirrors default", () => {
	@Quick({ valX: 'string', valY: 'string' })
	class ExplicitParallelModel extends QModel<{ valX: string; valY: string }> {
		@QRule(after(50, true), 'X err')
		declare valX: string;

		@QRule(after(50, true), 'Y err')
		declare valY: string;
	}

	test(
		'two 50 ms rules with mode:parallel finish in ~50 ms',
		async () => {
			const model = ExplicitParallelModel.create({
				valX: 'a',
				valY: 'b',
			});
			const start = Date.now();
			await model.$qm.checkRulesAsync({ mode: 'parallel' });
			const elapsed = Date.now() - start;

			expect(elapsed).toBeLessThan(100);
		},
		{ timeout: 500 }
	);

	test(
		'mode:parallel produces same errors as no-mode',
		async () => {
			@Quick({ val: 'string' })
			class SameModel extends QModel<{ val: string }> {
				@QRule(after(10, false), 'Validation err')
				declare val: string;
			}

			const model = SameModel.create({ val: 'val' });
			const [noMode, explicitParallel] = await Promise.all([
				model.$qm.checkRulesAsync(),
				model.$qm.checkRulesAsync({ mode: 'parallel' }),
			]);

			expect(noMode.valid).toBe(explicitParallel.valid);
			expect(noMode.errors).toEqual(explicitParallel.errors);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 3. mode: 'serial' — basic correctness
// ---------------------------------------------------------------------------

describe("mode: 'serial' — basic correctness", () => {
	test(
		'all rules pass in serial — valid:true',
		async () => {
			@Quick({ name: 'string', email: 'string' })
			class AllPassSerial extends QModel<{
				name: string;
				email: string;
			}> {
				@QRule(after(20, true), 'Name err')
				declare name: string;

				@QRule(after(20, true), 'Email err')
				declare email: string;
			}

			const result = await AllPassSerial.create({
				name: 'alice',
				email: 'a@x.com',
			}).checkRulesAsync({ mode: 'serial' });

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		},
		{ timeout: 500 }
	);

	test(
		'all rules fail in serial — all errors collected',
		async () => {
			@Quick({ fieldA: 'string', fieldB: 'string', fieldC: 'string' })
			class AllFailSerial extends QModel<{
				fieldA: string;
				fieldB: string;
				fieldC: string;
			}> {
				@QRule(after(10, false), 'A err')
				declare fieldA: string;

				@QRule(after(10, false), 'B err')
				declare fieldB: string;

				@QRule(after(10, false), 'C err')
				declare fieldC: string;
			}

			const result = await AllFailSerial.create({
				fieldA: 'x',
				fieldB: 'x',
				fieldC: 'x',
			}).checkRulesAsync({ mode: 'serial' });

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(3);
			expect(result.errors.map((error) => error.message)).toEqual([
				'A err',
				'B err',
				'C err',
			]);
		},
		{ timeout: 500 }
	);

	test(
		'mix of pass and fail — only failures returned',
		async () => {
			@Quick({ pass: 'string', fail: 'string', pass2: 'string' })
			class MixedSerial extends QModel<{
				pass: string;
				fail: string;
				pass2: string;
			}> {
				@QRule(after(10, true), 'Pass1 err')
				declare pass: string;

				@QRule(after(10, false), 'Fail err')
				declare fail: string;

				@QRule(after(10, true), 'Pass2 err')
				declare pass2: string;
			}

			const result = await MixedSerial.create({
				pass: 'x',
				fail: 'x',
				pass2: 'x',
			}).checkRulesAsync({ mode: 'serial' });

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.message).toBe('Fail err');
		},
		{ timeout: 500 }
	);

	test(
		'sync rules work correctly in serial mode',
		async () => {
			@Quick({ age: 'number', name: 'string' })
			class SyncSerial extends QModel<{ age: number; name: string }> {
				@QRule((value: number) => value >= 18, 'Too young')
				declare age: number;

				@QRule((value: string) => value.length >= 3, 'Name too short')
				declare name: string;
			}

			const result = await SyncSerial.create({
				age: 16,
				name: 'Jo',
			}).checkRulesAsync({ mode: 'serial' });

			expect(result.errors.map((err) => err.message).sort()).toEqual([
				'Name too short',
				'Too young',
			]);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 4. Execution order — serial guarantees field-declaration order
// ---------------------------------------------------------------------------

describe("mode: 'serial' — execution order is deterministic", () => {
	test(
		'predicates run in field-declaration order (side-effects prove it)',
		async () => {
			const order: string[] = [];

			@Quick({ first: 'string', second: 'string', third: 'string' })
			class OrderModel extends QModel<{
				first: string;
				second: string;
				third: string;
			}> {
				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								order.push('A');
								resolve(true);
							}, 30)
						),
					'First err'
				)
				declare first: string;

				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								order.push('B');
								resolve(true);
							}, 10)
						),
					'Second err'
				)
				declare second: string;

				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								order.push('C');
								resolve(true);
							}, 20)
						),
					'Third err'
				)
				declare third: string;
			}

			await OrderModel.create({
				first: 'a',
				second: 'b',
				third: 'c',
			}).checkRulesAsync({ mode: 'serial' });

			// Despite different delays, serial mode respects declaration order: A → B → C
			expect(order).toEqual(['A', 'B', 'C']);
		},
		{ timeout: 500 }
	);

	test(
		'parallel mode does NOT guarantee execution order (fastest settles first)',
		async () => {
			const order: string[] = [];

			@Quick({ slow: 'string', fast: 'string' })
			class ParallelOrderModel extends QModel<{
				slow: string;
				fast: string;
			}> {
				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								order.push('slow');
								resolve(true);
							}, 50)
						),
					'Slow err'
				)
				declare slow: string;

				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								order.push('fast');
								resolve(true);
							}, 5)
						),
					'Fast err'
				)
				declare fast: string;
			}

			await ParallelOrderModel.create({
				slow: 'a',
				fast: 'b',
			}).checkRulesAsync({ mode: 'parallel' });

			// In parallel mode the fast predicate fires its side-effect first
			expect(order[0]).toBe('fast');
			expect(order[1]).toBe('slow');
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 5. Timing — serial O(Σ) vs parallel O(max)
// ---------------------------------------------------------------------------

describe('timing: serial O(Σ) vs parallel O(max)', () => {
	/** Three rules each taking 40 ms. Serial ≈ 120 ms, parallel ≈ 40 ms. */
	@Quick({ ruleOne: 'string', ruleTwo: 'string', ruleTre: 'string' })
	class TimingModel extends QModel<{
		ruleOne: string;
		ruleTwo: string;
		ruleTre: string;
	}> {
		@QRule(after(40, true), 'R1 err')
		declare ruleOne: string;

		@QRule(after(40, true), 'R2 err')
		declare ruleTwo: string;

		@QRule(after(40, true), 'R3 err')
		declare ruleTre: string;
	}

	const instance = TimingModel.create({
		ruleOne: 'x',
		ruleTwo: 'x',
		ruleTre: 'x',
	});

	test(
		'serial mode: total time ≥ Σ individual times',
		async () => {
			const start = Date.now();
			await instance.$qm.checkRulesAsync({ mode: 'serial' });
			const elapsed = Date.now() - start;

			// 3 × 40 ms = 120 ms minimum for serial
			expect(elapsed).toBeGreaterThanOrEqual(100);
		},
		{ timeout: 500 }
	);

	test(
		'parallel mode: total time ≈ max individual time',
		async () => {
			const start = Date.now();
			await instance.$qm.checkRulesAsync({ mode: 'parallel' });
			const elapsed = Date.now() - start;

			// All three fire simultaneously — should finish in ~40 ms
			expect(elapsed).toBeLessThan(90);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 6. Serial mode + timeoutMs
// ---------------------------------------------------------------------------

describe("mode: 'serial' + timeoutMs", () => {
	test(
		'each slow predicate times out independently in serial',
		async () => {
			@Quick({ fieldA: 'string', fieldB: 'string' })
			class SlowSerial extends QModel<{
				fieldA: string;
				fieldB: string;
			}> {
				@QRule(after(200, true), 'A err')
				declare fieldA: string;

				@QRule(after(200, true), 'B err')
				declare fieldB: string;
			}

			const result = await SlowSerial.create({
				fieldA: 'v',
				fieldB: 'v',
			}).checkRulesAsync({ mode: 'serial', timeoutMs: 50 });

			expect(result.errors.every((err) => err.timedOut === true)).toBe(
				true
			);
			expect(result.errors).toHaveLength(2);
		},
		{ timeout: 500 }
	);

	test(
		'serial + timeout: total time ≈ N × timeoutMs (each waits up to its budget)',
		async () => {
			@Quick({ fieldA: 'string', fieldB: 'string', fieldC: 'string' })
			class ThreeSlowSerial extends QModel<{
				fieldA: string;
				fieldB: string;
				fieldC: string;
			}> {
				@QRule(after(200, true), 'A err')
				declare fieldA: string;

				@QRule(after(200, true), 'B err')
				declare fieldB: string;

				@QRule(after(200, true), 'C err')
				declare fieldC: string;
			}

			const start = Date.now();
			await ThreeSlowSerial.create({
				fieldA: 'v',
				fieldB: 'v',
				fieldC: 'v',
			}).checkRulesAsync({ mode: 'serial', timeoutMs: 40 });
			const elapsed = Date.now() - start;

			// Serial + timeout: 3 × 40 ms = 120 ms minimum
			// (vs parallel + timeout which would be ~40 ms total)
			expect(elapsed).toBeGreaterThanOrEqual(100);
		},
		{ timeout: 500 }
	);

	test(
		'parallel + timeout stays near max(timeoutMs) even with many fields',
		async () => {
			@Quick({ fieldA: 'string', fieldB: 'string', fieldC: 'string' })
			class ThreeSlowParallel extends QModel<{
				fieldA: string;
				fieldB: string;
				fieldC: string;
			}> {
				@QRule(after(200, true), 'A err')
				declare fieldA: string;

				@QRule(after(200, true), 'B err')
				declare fieldB: string;

				@QRule(after(200, true), 'C err')
				declare fieldC: string;
			}

			const start = Date.now();
			await ThreeSlowParallel.create({
				fieldA: 'v',
				fieldB: 'v',
				fieldC: 'v',
			}).checkRulesAsync({ mode: 'parallel', timeoutMs: 40 });
			const elapsed = Date.now() - start;

			// All three timeouts fire simultaneously → total ≈ 40 ms
			expect(elapsed).toBeLessThan(100);
		},
		{ timeout: 500 }
	);

	test(
		'serial fast rule passes, slow rule times out — with custom message',
		async () => {
			@Quick({ fast: 'string', slow: 'string' })
			class OneTimeoutSerial extends QModel<{
				fast: string;
				slow: string;
			}> {
				@QRule(after(10, true), 'Fast rule')
				declare fast: string;

				@QRule(after(300, true), 'Slow rule')
				declare slow: string;
			}

			const result = await OneTimeoutSerial.create({
				fast: 'v',
				slow: 'v',
			}).checkRulesAsync({
				mode: 'serial',
				timeoutMs: 50,
				timeoutMessage: 'Serial timeout',
			});

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe('Serial timeout');
			expect(result.errors[0]?.field).toBe('slow');
		},
		{ timeout: 500 }
	);

	test(
		'serial logical failure within timeout budget — no timedOut flag',
		async () => {
			@Quick({ val: 'string' })
			class LogicalFailSerial extends QModel<{ val: string }> {
				@QRule(after(10, false), 'Format invalid')
				declare val: string;
			}

			const result = await LogicalFailSerial.create({
				val: 'bad',
			}).checkRulesAsync({ mode: 'serial', timeoutMs: 50 });

			expect(result.errors[0]?.timedOut).toBeUndefined();
			expect(result.errors[0]?.message).toBe('Format invalid');
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 7. Serial mode + crash (reject)
// ---------------------------------------------------------------------------

describe("mode: 'serial' — crash semantics", () => {
	test(
		'fast crash within budget — failure but NOT timedOut',
		async () => {
			@Quick({ token: 'string' })
			class CrashSerial extends QModel<{ token: string }> {
				@QRule(crash(5), 'Auth failed')
				declare token: string;
			}

			const result = await CrashSerial.create({
				token: 'abc',
			}).checkRulesAsync({ mode: 'serial', timeoutMs: 50 });

			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBeUndefined();
			expect(result.errors[0]?.message).toBe('Auth failed');
		},
		{ timeout: 500 }
	);

	test(
		'slow crash — timeout wins before crash in serial too',
		async () => {
			@Quick({ token: 'string' })
			class SlowCrashSerial extends QModel<{ token: string }> {
				@QRule(crash(300), 'Auth failed')
				declare token: string;
			}

			const result = await SlowCrashSerial.create({
				token: 'abc',
			}).checkRulesAsync({ mode: 'serial', timeoutMs: 50 });

			expect(result.errors[0]?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'multiple fields — crash + timeout + pass all collected correctly in serial',
		async () => {
			@Quick({ fieldA: 'string', fieldB: 'string', fieldC: 'string' })
			class MultiCrashSerial extends QModel<{
				fieldA: string;
				fieldB: string;
				fieldC: string;
			}> {
				@QRule(crash(5), 'Crash A') // fast crash → failure, no timedOut
				declare fieldA: string;

				@QRule(after(300, true), 'Slow B') // times out
				declare fieldB: string;

				@QRule(after(10, true), 'Pass C') // passes
				declare fieldC: string;
			}

			const result = await MultiCrashSerial.create({
				fieldA: 'v',
				fieldB: 'v',
				fieldC: 'v',
			}).checkRulesAsync({ mode: 'serial', timeoutMs: 50 });

			expect(result.errors).toHaveLength(2);

			const crashErr = result.errors.find(
				(err) => err.field === 'fieldA'
			);
			const timeoutErr = result.errors.find(
				(err) => err.field === 'fieldB'
			);

			expect(crashErr?.timedOut).toBeUndefined();
			expect(timeoutErr?.timedOut).toBe(true);
			expect(
				result.errors.find((err) => err.field === 'fieldC')
			).toBeUndefined();
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 8. Multiple rules on the same field — serial mode
// ---------------------------------------------------------------------------

describe("mode: 'serial' — multiple rules per field", () => {
	test(
		'rules on same field run sequentially in decorator-application order (bottom-up)',
		async () => {
			const calls: number[] = [];

			@Quick({ email: 'string' })
			class TwoRulesField extends QModel<{ email: string }> {
				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								calls.push(1);
								resolve(true);
							}, 20)
						),
					'Format invalid'
				)
				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								calls.push(2);
								resolve(false);
							}, 20)
						),
					'Email taken'
				)
				declare email: string;
			}

			const result = await TwoRulesField.create({
				email: 'ok@x.com',
			}).checkRulesAsync({ mode: 'serial' });

			// Decorators are applied bottom-up, so the inner (@QRule #2) is stored first.
			// Serial mode respects metadata storage order: [2, 1]
			expect(calls).toEqual([2, 1]);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.message).toBe('Email taken');
		},
		{ timeout: 500 }
	);

	test(
		'three rules on field — all time out in serial',
		async () => {
			@Quick({ data: 'string' })
			class ThreeRulesTimeout extends QModel<{ data: string }> {
				@QRule(after(200, true), 'Check A')
				@QRule(after(200, true), 'Check B')
				@QRule(after(200, true), 'Check C')
				declare data: string;
			}

			const result = await ThreeRulesTimeout.create({
				data: 'v',
			}).checkRulesAsync({ mode: 'serial', timeoutMs: 50 });

			expect(result.errors.every((err) => err.timedOut === true)).toBe(
				true
			);
			expect(result.errors).toHaveLength(3);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// 9. Serial vs parallel — same deterministic outcomes
// ---------------------------------------------------------------------------

describe('serial vs parallel — identical outcomes for deterministic predicates', () => {
	@Quick({ name: 'string', age: 'number', code: 'string' })
	class DeterministicModel extends QModel<{
		name: string;
		age: number;
		code: string;
	}> {
		@QRule((value: string) => value.length >= 3, 'Name too short')
		declare name: string;

		@QRule((value: number) => value >= 18, 'Too young')
		declare age: number;

		@QRule(after(10, false), 'Code taken')
		declare code: string;
	}

	const instance = DeterministicModel.create({
		name: 'Jo',
		age: 16,
		code: 'abc',
	});

	let serialResult: Awaited<ReturnType<typeof instance.checkRulesAsync>>;
	let parallelResult: Awaited<ReturnType<typeof instance.checkRulesAsync>>;

	beforeAll(async () => {
		[serialResult, parallelResult] = await Promise.all([
			instance.$qm.checkRulesAsync({ mode: 'serial' }),
			instance.$qm.checkRulesAsync({ mode: 'parallel' }),
		]);
	});

	test('both modes return same valid:false', () => {
		expect(serialResult.valid).toBe(parallelResult.valid);
		expect(serialResult.valid).toBe(false);
	});

	test('both modes return same number of errors', () => {
		expect(serialResult.errors).toHaveLength(parallelResult.errors.length);
	});

	test('both modes report the same fields', () => {
		const serialFields = serialResult.errors.map((err) => err.field).sort();
		const parallelFields = parallelResult.errors
			.map((err) => err.field)
			.sort();
		expect(serialFields).toEqual(parallelFields);
	});

	test('both modes report the same messages', () => {
		const serial = serialResult.errors.map((err) => err.message).sort();
		const parallel = parallelResult.errors.map((err) => err.message).sort();
		expect(serial).toEqual(parallel);
	});
});

// ---------------------------------------------------------------------------
// 10. isValidAsync and validationReportAsync propagate mode
// ---------------------------------------------------------------------------

describe('isValidAsync and validationReportAsync respect mode option', () => {
	@Quick({ email: 'string', age: 'number' })
	class PropModel extends QModel<{ email: string; age: number }> {
		@QRule(after(150, true), 'Email taken')
		declare email: string;

		@QRule((value: number) => value >= 18, 'Too young')
		declare age: number;
	}

	test(
		'isValidAsync — serial, generous budget → true',
		async () => {
			const model = PropModel.create({ email: 'ok@x.com', age: 25 });
			expect(
				await model.$qm.isValidAsync({ mode: 'serial', timeoutMs: 300 })
			).toBe(true);
		},
		{ timeout: 600 }
	);

	test(
		'isValidAsync — serial, tight budget → false (timeout)',
		async () => {
			const model = PropModel.create({ email: 'ok@x.com', age: 25 });
			expect(
				await model.$qm.isValidAsync({ mode: 'serial', timeoutMs: 30 })
			).toBe(false);
		},
		{ timeout: 500 }
	);

	test(
		'isValidAsync — parallel, tight budget → false (timeout)',
		async () => {
			const model = PropModel.create({ email: 'ok@x.com', age: 25 });
			expect(
				await model.$qm.isValidAsync({
					mode: 'parallel',
					timeoutMs: 30,
				})
			).toBe(false);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync — serial mode: timedOut in report.rules',
		async () => {
			const model = PropModel.create({ email: 'ok@x.com', age: 25 });
			const report = await model.$qm.validationReportAsync({
				mode: 'serial',
				timeoutMs: 30,
			});

			expect(report.valid).toBe(false);
			expect(report.rules.errors[0]?.timedOut).toBe(true);
			expect(report.integrity).toHaveLength(0);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync — parallel mode: timedOut in report.rules',
		async () => {
			const model = PropModel.create({ email: 'ok@x.com', age: 25 });
			const report = await model.$qm.validationReportAsync({
				mode: 'parallel',
				timeoutMs: 30,
			});

			expect(report.valid).toBe(false);
			expect(report.rules.errors[0]?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync — serial, no timeout, sync fail: valid:false',
		async () => {
			const model = PropModel.create({ email: 'ok@x.com', age: 10 });
			const report = await model.$qm.validationReportAsync({
				mode: 'serial',
			});

			// sync rule fails; async rule eventually passes (no timeout)
			expect(report.rules.errors[0]?.message).toBe('Too young');
			expect(report.rules.errors[0]?.timedOut).toBeUndefined();
		},
		{ timeout: 600 }
	);
});

// ---------------------------------------------------------------------------
// 11. Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
	test(
		'model with no @QRule fields — serial and parallel both return valid:true',
		async () => {
			@Quick({ name: 'string' })
			class NoRulesModel extends QModel<{ name: string }> {
				declare name: string;
			}

			const model = NoRulesModel.create({ name: 'alice' });

			const [serialRes, parallelRes] = await Promise.all([
				model.$qm.checkRulesAsync({ mode: 'serial' }),
				model.$qm.checkRulesAsync({ mode: 'parallel' }),
			]);

			expect(serialRes.valid).toBe(true);
			expect(parallelRes.valid).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'single field — serial and parallel produce identical result',
		async () => {
			@Quick({ val: 'string' })
			class SingleFieldModel extends QModel<{ val: string }> {
				@QRule(after(20, false), 'Always fails')
				declare val: string;
			}

			const model = SingleFieldModel.create({ val: 'ok' });
			const [serialRes, parallelRes] = await Promise.all([
				model.$qm.checkRulesAsync({ mode: 'serial' }),
				model.$qm.checkRulesAsync({ mode: 'parallel' }),
			]);

			expect(serialRes).toEqual(parallelRes);
		},
		{ timeout: 500 }
	);

	test(
		'lazy timeoutMessage evaluated per-predicate in serial',
		async () => {
			let count = 0;

			@Quick({ fieldA: 'string', fieldB: 'string' })
			class LazyMessageSerial extends QModel<{
				fieldA: string;
				fieldB: string;
			}> {
				@QRule(after(200, true), 'A err')
				declare fieldA: string;

				@QRule(after(200, true), 'B err')
				declare fieldB: string;
			}

			const result = await LazyMessageSerial.create({
				fieldA: 'v',
				fieldB: 'v',
			}).checkRulesAsync({
				mode: 'serial',
				timeoutMs: 50,
				timeoutMessage: () => {
					count++;
					return `Timeout #${count}`;
				},
			});

			expect(result.errors).toHaveLength(2);
			// Lazy function called independently for each timed-out predicate
			expect(result.errors[0]?.message).toBe('Timeout #1');
			expect(result.errors[1]?.message).toBe('Timeout #2');
		},
		{ timeout: 500 }
	);

	test(
		'serial + no timeoutMs — slow rules awaited fully, no timedOut',
		async () => {
			@Quick({ slow: 'string' })
			class SerialNoTimeout extends QModel<{ slow: string }> {
				@QRule(after(60, true), 'Slow rule')
				declare slow: string;
			}

			const result = await SerialNoTimeout.create({
				slow: 'v',
			}).checkRulesAsync({ mode: 'serial' });

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		},
		{ timeout: 500 }
	);
});

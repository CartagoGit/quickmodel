import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QRule } from '@/index';
import type { IQRulesAsyncOptions } from '@/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulates a service call that resolves after `delayMs` milliseconds */
function slowCheck(delayMs: number, result: boolean): () => Promise<boolean> {
	return () =>
		new Promise((resolve) => setTimeout(() => resolve(result), delayMs));
}

/** Service that always rejects after `delayMs` ms (e.g. DB connection lost) */
function crashingCheck(delayMs: number): () => Promise<boolean> {
	return () =>
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error('Service unavailable')), delayMs)
		);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

@Quick({ username: 'string', email: 'string', age: 'number' })
class UserRegistration extends QModel<{
	username: string;
	email: string;
	age: number;
}> {
	/** Fast local check — always within budget */
	@QRule((value: string) => value.length >= 3, 'Username too short')
	@QRule(slowCheck(30, true), 'Username already taken') // 30 ms — within 200 ms budget
	declare username: string;

	/** Slow remote check — intentionally exceeds a tight budget */
	@QRule(slowCheck(150, true), 'Email already registered') // 150 ms — exceeds 50 ms budget
	declare email: string;

	/** Sync rule — never affected by timeout */
	@QRule((value: number) => value >= 18, 'Must be 18 or older')
	declare age: number;
}

// ---------------------------------------------------------------------------
// Integration: timeout per-predicate behaviour
// ---------------------------------------------------------------------------

describe('QRule timeout — integration (real delays)', () => {
	const tightOptions: IQRulesAsyncOptions = {
		timeoutMs: 50,
		timeoutMessage: 'Validation service timed out — please retry',
	};

	test(
		'fast predicate (30 ms) resolves within 50 ms budget — no timeout error',
		async () => {
			const user = UserRegistration.create({
				username: 'alice',
				email: 'alice@example.com',
				age: 25,
			});

			const result = await user.checkRulesAsync(tightOptions);

			// email times out, but username rule #2 passes within budget
			const usernameErrors = result.errors.filter(
				(err) => err.field === 'username'
			);
			expect(usernameErrors.every((err) => !err.timedOut)).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'slow predicate (150 ms) exceeds 50 ms budget — timedOut:true with custom message',
		async () => {
			const user = UserRegistration.create({
				username: 'alice',
				email: 'alice@example.com',
				age: 25,
			});

			const result = await user.checkRulesAsync(tightOptions);

			const emailErr = result.errors.find((err) => err.field === 'email');
			expect(emailErr).toBeDefined();
			expect(emailErr?.timedOut).toBe(true);
			expect(emailErr?.message).toBe(
				'Validation service timed out — please retry'
			);
		},
		{ timeout: 500 }
	);

	test(
		'sync rule is never affected by timeoutMs',
		async () => {
			const user = UserRegistration.create({
				username: 'alice',
				email: 'alice@example.com',
				age: 15, // fails the sync rule
			});

			const result = await user.checkRulesAsync(tightOptions);

			const ageErr = result.errors.find((err) => err.field === 'age');
			expect(ageErr).toBeDefined();
			expect(ageErr?.timedOut).toBeUndefined();
			expect(ageErr?.message).toBe('Must be 18 or older');
		},
		{ timeout: 500 }
	);

	test(
		'without timeoutMs, slow predicate resolves fully and rule passes',
		async () => {
			const user = UserRegistration.create({
				username: 'alice',
				email: 'alice@example.com',
				age: 25,
			});

			const result = await user.checkRulesAsync(); // no timeout

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		},
		{ timeout: 500 }
	);

	test(
		'timedOut errors count as failures — valid:false when any rule times out',
		async () => {
			const user = UserRegistration.create({
				username: 'alice',
				email: 'alice@example.com',
				age: 25,
			});

			const result = await user.checkRulesAsync(tightOptions);

			expect(result.valid).toBe(false);
		},
		{ timeout: 500 }
	);

	test(
		'isValidAsync returns false when any predicate times out',
		async () => {
			const user = UserRegistration.create({
				username: 'alice',
				email: 'alice@example.com',
				age: 25,
			});

			const valid = await user.isValidAsync(tightOptions);
			expect(valid).toBe(false);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync surfaces timedOut errors in report.rules',
		async () => {
			const user = UserRegistration.create({
				username: 'alice',
				email: 'alice@example.com',
				age: 25,
			});

			const report = await user.validationReportAsync(tightOptions);

			expect(report.valid).toBe(false);
			const timedOutErrors = report.rules.errors.filter(
				(err) => err.timedOut
			);
			expect(timedOutErrors.length).toBeGreaterThan(0);
			expect(timedOutErrors[0]?.field).toBe('email');
		},
		{ timeout: 500 }
	);

	test(
		'crashing predicate (reject) treated as failure — not timedOut',
		async () => {
			@Quick({ token: 'string' })
			class AuthModel extends QModel<{ token: string }> {
				@QRule(crashingCheck(10), 'Auth service unavailable')
				declare token: string;
			}

			const model = AuthModel.create({ token: 'abc123' });
			const result = await model.checkRulesAsync({ timeoutMs: 200 });

			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBeUndefined(); // rejection ≠ timeout
			expect(result.errors[0]?.message).toBe('Auth service unavailable');
		},
		{ timeout: 500 }
	);

	test(
		'lazy timeoutMessage resolved at call time for each timed-out field',
		async () => {
			let serviceName = 'email-service';

			@Quick({ email: 'string' })
			class EmailModel extends QModel<{ email: string }> {
				@QRule(slowCheck(150, true), 'fallback')
				declare email: string;
			}

			const model = EmailModel.create({ email: 'test@example.com' });
			const result = await model.checkRulesAsync({
				timeoutMs: 30,
				timeoutMessage: () => `${serviceName} did not respond in time`,
			});

			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe(
				'email-service did not respond in time'
			);

			// Verify lazy evaluation: change service name and re-validate
			serviceName = 'auth-service';
			const result2 = await model.checkRulesAsync({
				timeoutMs: 30,
				timeoutMessage: () => `${serviceName} did not respond in time`,
			});
			expect(result2.errors[0]?.message).toBe(
				'auth-service did not respond in time'
			);
		},
		{ timeout: 500 }
	);
});

// ---------------------------------------------------------------------------
// QRule timeout — "fire and forget" semantics
//
// These tests cover the key contract: once timeoutMs fires, the validation
// result is CLOSED immediately. We do not care whether the original promise
// eventually resolves or rejects later — the answer has already been given.
//
// This is critical for real-world scenarios like:
//   - DB uniqueness check that hangs (the UI cannot wait indefinitely)
//   - Auth service with network latency spike
//   - Third-party API that is slow but not dead
// ---------------------------------------------------------------------------

describe('QRule timeout — abandon semantics (predicate resolves late but is ignored)', () => {
	test(
		'predicate that would resolve true but arrives after timeout → timedOut error, not valid:true',
		async () => {
			// The predicate WOULD pass if we waited — but we do not wait
			@Quick({ email: 'string' })
			class LateButValidModel extends QModel<{ email: string }> {
				@QRule(
					slowCheck(200, true), // resolves with TRUE after 200 ms
					'Email check failed'
				)
				declare email: string;
			}

			const model = LateButValidModel.create({ email: 'ok@example.com' });

			// Budget: 40 ms — predicate arrives at 200 ms — already abandoned
			const result = await model.checkRulesAsync({
				timeoutMs: 40,
				timeoutMessage: 'Service too slow — please retry',
			});

			// Must be invalid even though the predicate would eventually say "true"
			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe(
				'Service too slow — please retry'
			);
		},
		{ timeout: 500 }
	);

	test(
		'predicate that would resolve false but arrives after timeout → timedOut flag, not a plain failure',
		async () => {
			// The predicate WOULD fail logically — but we also hit the timeout first
			@Quick({ email: 'string' })
			class LateAndInvalidModel extends QModel<{ email: string }> {
				@QRule(
					slowCheck(200, false), // resolves with FALSE after 200 ms
					'Email already taken'
				)
				declare email: string;
			}

			const model = LateAndInvalidModel.create({
				email: 'taken@example.com',
			});
			const result = await model.checkRulesAsync({
				timeoutMs: 40,
				timeoutMessage: 'Took too long',
			});

			expect(result.valid).toBe(false);
			// timedOut wins: we never got the actual result
			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe('Took too long');
		},
		{ timeout: 500 }
	);

	test(
		'multiple slow predicates on different fields — all abandoned independently and in parallel',
		async () => {
			const callLog: string[] = [];

			@Quick({ alpha: 'string', beta: 'string', gamma: 'string' })
			class MultiSlowModel extends QModel<{
				alpha: string;
				beta: string;
				gamma: string;
			}> {
				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								callLog.push('alpha');
								resolve(true);
							}, 120)
						),
					'Alpha timed out'
				)
				declare alpha: string;

				@QRule(
					() =>
						new Promise<boolean>((resolve) =>
							setTimeout(() => {
								callLog.push('beta');
								resolve(true);
							}, 160)
						),
					'Beta timed out'
				)
				declare beta: string;

				@QRule(
					(value: string) => value.length > 0, // sync — always passes immediately
					'Gamma empty'
				)
				declare gamma: string;
			}

			const model = MultiSlowModel.create({
				alpha: 'val',
				beta: 'val',
				gamma: 'val',
			});

			const start = Date.now();
			const result = await model.checkRulesAsync({
				timeoutMs: 50,
				timeoutMessage: 'Field timed out',
			});
			const elapsed = Date.now() - start;

			// Both slow fields should be timedOut
			const timedOutFields = result.errors
				.filter((err) => err.timedOut)
				.map((err) => err.field);
			expect(timedOutFields).toContain('alpha');
			expect(timedOutFields).toContain('beta');

			// Sync rule on gamma should still pass — no error for it
			expect(
				result.errors.find((err) => err.field === 'gamma')
			).toBeUndefined();

			// All predicates race in parallel — total time ≈ timeoutMs (50 ms),
			// not sum of each predicate's timeout
			expect(elapsed).toBeLessThan(120);
		},
		{ timeout: 500 }
	);

	test(
		'checkRulesAsync resolves in ~timeoutMs total, not sum of all predicate delays',
		async () => {
			// Three predicates each taking 100 ms — sequential await would take ~300 ms.
			// With timeout at 50 ms each they should all be abandoned within ~50 ms total
			// because the race per predicate runs but we cap each at 50 ms.
			@Quick({ fieldA: 'string', fieldB: 'string', fieldC: 'string' })
			class HeavyModel extends QModel<{
				fieldA: string;
				fieldB: string;
				fieldC: string;
			}> {
				@QRule(slowCheck(100, true), 'A too slow')
				declare fieldA: string;

				@QRule(slowCheck(100, true), 'B too slow')
				declare fieldB: string;

				@QRule(slowCheck(100, true), 'C too slow')
				declare fieldC: string;
			}

			const model = HeavyModel.create({
				fieldA: 'ok',
				fieldB: 'ok',
				fieldC: 'ok',
			});

			const start = Date.now();
			const result = await model.checkRulesAsync({ timeoutMs: 50 });
			const elapsed = Date.now() - start;

			// All three timed out
			expect(result.errors.filter((err) => err.timedOut)).toHaveLength(3);

			// NOTE: predicates run in PARALLEL — all three timeout races fire simultaneously,
			// so elapsed ≈ timeoutMs (50 ms), not 3 × 50 ms = 150 ms.
			expect(elapsed).toBeLessThan(150);
		},
		{ timeout: 1000 }
	);
});

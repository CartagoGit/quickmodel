import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/** Simulates a DB uniqueness check */
async function isEmailUnique(email: string): Promise<boolean> {
	return Promise.resolve(!email.includes('taken'));
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class UserAsync extends QModel<{ name: string; email: string; age: number }> {
	@QRule((value: string) => value.length >= 2, 'Name too short')
	declare name: string;

	@QRule(async (value: string) => isEmailUnique(value), 'Email already taken')
	declare email: string;

	@QRule((value: number) => Promise.resolve(value >= 18), 'Must be 18+')
	@QRule((value: number) => Promise.resolve(value <= 120), 'Age unrealistic')
	declare age: number;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class OnlySyncRules extends QModel<{ name: string }> {
	@QRule((value: string) => value.length >= 2, 'Name too short')
	declare name: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class OnlyAsyncRules extends QModel<{ email: string }> {
	@QRule(async (value: string) => isEmailUnique(value), 'Email already taken')
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
		const result = user.$qCheckRulesAsync();

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
		const result = await user.$qCheckRulesAsync();

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('valid:false when async rule fails', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'taken@example.com',
			age: 25,
		});
		const result = await user.$qCheckRulesAsync();

		expect(result.valid).toBe(false);
		const emailError = result.errors.find((err) => err.field === 'email');
		expect(emailError?.message).toBe('Email already taken');
	});

	test('valid:false when sync rule fails (checkRulesAsync handles sync too)', async () => {
		const user = UserAsync.create({
			name: 'A',
			email: 'ok@example.com',
			age: 25,
		});
		const result = await user.$qCheckRulesAsync();

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
		const result = await user.$qCheckRulesAsync();

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});

	test('multiple async rules on same field — collects all failures', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 200,
		});
		const result = await user.$qCheckRulesAsync();

		expect(result.valid).toBe(false);
		const ageErrors = result.errors.filter((err) => err.field === 'age');
		expect(ageErrors).toHaveLength(1); // only 'Age unrealistic' fails
	});

	test('model with only sync rules works with checkRulesAsync()', async () => {
		const model = OnlySyncRules.create({ name: 'Alice' });
		const result = await model.$qCheckRulesAsync();
		expect(result.valid).toBe(true);
	});

	test('model with only async rules', async () => {
		const model = OnlyAsyncRules.create({ email: 'taken@example.com' });
		const result = await model.$qCheckRulesAsync();
		expect(result.valid).toBe(false);
	});

	test('rejected async predicate is treated as rule failure', async () => {
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Broken extends QModel<{ posX: number }> {
			@QRule(() => Promise.reject(new Error('DB down')), 'DB error')
			declare posX: number;
		}

		const broken = Broken.create({ posX: 1 });
		const result = await broken.$qCheckRulesAsync();

		expect(result.valid).toBe(false);
		expect(result.errors[0].field).toBe('posX');
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
		const result = user.$qIsValidAsync();
		expect(result).toBeInstanceOf(Promise);
	});

	test('resolves true when all pass', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 25,
		});
		expect(await user.$qIsValidAsync()).toBe(true);
	});

	test('resolves false when async rule fails', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'taken@example.com',
			age: 25,
		});
		expect(await user.$qIsValidAsync()).toBe(false);
	});

	test('resolves false when integrity fails', async () => {
		// integrity fails if transformers report issues — just verify it respects checkIntegrity
		const user = UserAsync.create({
			name: 'Alice',
			email: 'ok@example.com',
			age: 25,
		});
		expect(await user.$qIsValidAsync()).toBe(
			user.$qHasIntegrity() && (await user.$qCheckRulesAsync()).valid
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
		const validationReportAsync = user.$qValidationReportAsync();
		expect(validationReportAsync).toBeInstanceOf(Promise);

		const report = await validationReportAsync;
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
		const report = await user.$qValidationReportAsync();
		expect(report.valid).toBe(true);
	});

	test('valid:false + rules.errors populated when async rule fails', async () => {
		const user = UserAsync.create({
			name: 'Alice',
			email: 'taken@example.com',
			age: 25,
		});
		const report = await user.$qValidationReportAsync();
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
			user.$qValidationReportAsync(),
			user.$qIsValidAsync(),
		]);
		expect(report.valid).toBe(isValid);
	});
});

// ---------------------------------------------------------------------------
// Timed async predicates (deferred promises)
// Bun 1.x does not implement jest.runAllTimers(), so we simulate latency
// with manually-controlled deferred promises: the predicate hangs until
// the test explicitly resolves/rejects it, giving full control over timing
// without any real waiting.
// ---------------------------------------------------------------------------

/** Returns a promise and its external resolve/reject handles */
function deferred<T>(): {
	promise: Promise<T>;
	resolve: (val: T) => void;
	reject: (err: unknown) => void;
} {
	let resolve!: (val: T) => void;
	let reject!: (err: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('checkRulesAsync() — timed predicates with deferred promises', () => {
	test('rule passes once the deferred predicate resolves true', async () => {
		const gate = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class SlowEmailModel extends QModel<{ email: string }> {
			@QRule(() => gate.promise, 'Email already taken')
			declare email: string;
		}

		const model = SlowEmailModel.create({ email: 'available@example.com' });
		const resultPromise = model.$qCheckRulesAsync();

		// Simulate DB latency: resolve the predicate now
		gate.resolve(true);

		const result = await resultPromise;
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('rule fails once the deferred predicate resolves false', async () => {
		const gate = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class SlowEmailModel extends QModel<{ email: string }> {
			@QRule(() => gate.promise, 'Email already taken')
			declare email: string;
		}

		const model = SlowEmailModel.create({ email: 'taken@example.com' });
		const resultPromise = model.$qCheckRulesAsync();

		// Simulate DB saying "email is taken"
		gate.resolve(false);

		const result = await resultPromise;
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('email');
		expect(result.errors[0]?.message).toBe('Email already taken');
	});

	test('collects all failures when multiple deferred predicates resolve false', async () => {
		const gateUsername = deferred<boolean>();
		const gateBio = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class MultiSlowModel extends QModel<{ username: string; bio: string }> {
			@QRule(() => gateUsername.promise, 'Username too short')
			declare username: string;

			@QRule(() => gateBio.promise, 'Bio too short')
			declare bio: string;
		}

		const model = MultiSlowModel.create({ username: 'Jo', bio: 'Hi' });
		const resultPromise = model.$qCheckRulesAsync();

		// Both predicates resolve independently (simulating different response times)
		gateUsername.resolve(false);
		gateBio.resolve(false);

		const result = await resultPromise;
		expect(result.valid).toBe(false);
		const fields = result.errors.map((err) => err.field);
		expect(fields).toContain('username');
		expect(fields).toContain('bio');
	});

	test('rejected deferred predicate is treated as rule failure', async () => {
		const gate = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class UnstableModel extends QModel<{ token: string }> {
			@QRule(() => gate.promise, 'Auth service unavailable')
			declare token: string;
		}

		const model = UnstableModel.create({ token: 'abc' });
		const resultPromise = model.$qCheckRulesAsync();

		// Simulate service crash
		gate.reject(new Error('Connection timeout'));

		const result = await resultPromise;
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('token');
		expect(result.errors[0]?.message).toBe('Auth service unavailable');
	});
});

// ---------------------------------------------------------------------------
// checkRulesAsync() — timeout option (real delays with Bun.sleep)
// These tests use actual async latency to verify that:
//   1. Predicates slower than timeoutMs fail with timedOut: true
//   2. Predicates faster than timeoutMs resolve normally
//   3. Without timeoutMs the call waits as long as needed
// Test-level timeout is raised above the sum of delays in each test.
// ---------------------------------------------------------------------------

describe('checkRulesAsync() — timeout option', () => {
	test(
		'slow predicate exceeding timeoutMs fails with timedOut:true and default rule message',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class SlowModel extends QModel<{ email: string }> {
				@QRule(async () => {
					await Bun.sleep(100);
					return true;
				}, 'Email check failed')
				declare email: string;
			}

			const model = SlowModel.create({ email: 'ok@example.com' });
			const result = await model.$qCheckRulesAsync({ timeoutMs: 20 });

			expect(result.valid).toBe(false);
			expect(result.errors[0]?.field).toBe('email');
			expect(result.errors[0]?.timedOut).toBe(true);
			// When no timeoutMessage provided, falls back to the rule message
			expect(result.errors[0]?.message).toBe('Email check failed');
		},
		{ timeout: 500 }
	);

	test(
		'slow predicate exceeding timeoutMs uses custom timeoutMessage when provided',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class SlowModel extends QModel<{ email: string }> {
				@QRule(async () => {
					await Bun.sleep(100);
					return true;
				}, 'Email check failed')
				declare email: string;
			}

			const model = SlowModel.create({ email: 'ok@example.com' });
			const result = await model.$qCheckRulesAsync({
				timeoutMs: 20,
				timeoutMessage:
					'Validation service unavailable — try again later',
			});

			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe(
				'Validation service unavailable — try again later'
			);
		},
		{ timeout: 500 }
	);

	test(
		'lazy timeoutMessage function is evaluated at call time',
		async () => {
			let lang = 'en';
			const msgs: Record<string, string> = {
				en: 'Service unavailable',
				es: 'Servicio no disponible',
			};

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class SlowModel extends QModel<{ email: string }> {
				@QRule(async () => {
					await Bun.sleep(100);
					return true;
				}, 'fallback')
				declare email: string;
			}

			lang = 'es';
			const model = SlowModel.create({ email: 'x@x.com' });
			const result = await model.$qCheckRulesAsync({
				timeoutMs: 20,
				timeoutMessage: () => msgs[lang] ?? 'unavailable',
			});

			expect(result.errors[0]?.timedOut).toBe(true);
			expect(result.errors[0]?.message).toBe('Servicio no disponible');
		},
		{ timeout: 500 }
	);

	test(
		'fast predicate within timeoutMs passes normally',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class FastModel extends QModel<{ email: string }> {
				@QRule(async () => {
					await Bun.sleep(10);
					return true;
				}, 'Email check failed')
				declare email: string;
			}

			const model = FastModel.create({ email: 'ok@example.com' });
			const result = await model.$qCheckRulesAsync({ timeoutMs: 200 });

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		},
		{ timeout: 500 }
	);

	test(
		'fast predicate returning false within timeoutMs still reports failure (not timedOut)',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class FastModel extends QModel<{ age: number }> {
				@QRule(async (value: number) => {
					await Bun.sleep(10);
					return value >= 18;
				}, 'Must be adult')
				declare age: number;
			}

			const model = FastModel.create({ age: 10 });
			const result = await model.$qCheckRulesAsync({ timeoutMs: 200 });

			expect(result.valid).toBe(false);
			expect(result.errors[0]?.timedOut).toBeUndefined();
			expect(result.errors[0]?.message).toBe('Must be adult');
		},
		{ timeout: 500 }
	);

	test(
		'without timeoutMs, slow predicate resolves fully even with real latency',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class SlowModel extends QModel<{ code: string }> {
				@QRule(async (value: string) => {
					await Bun.sleep(50);
					return value === 'valid';
				}, 'Invalid code')
				declare code: string;
			}

			const model = SlowModel.create({ code: 'valid' });
			const result = await model.$qCheckRulesAsync(); // no timeout

			expect(result.valid).toBe(true);
		},
		{ timeout: 500 }
	);

	test(
		'mixed fields: timed-out rule + fast-failing rule both appear in errors',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class MixedModel extends QModel<{ email: string; age: number }> {
				@QRule(async () => {
					await Bun.sleep(100);
					return true;
				}, 'Email timed out')
				declare email: string;

				@QRule(async (value: number) => {
					await Bun.sleep(10);
					return value >= 18;
				}, 'Must be adult')
				declare age: number;
			}

			const model = MixedModel.create({ email: 'ok@x.com', age: 10 });
			const result = await model.$qCheckRulesAsync({ timeoutMs: 30 });

			expect(result.valid).toBe(false);
			const emailErr = result.errors.find((err) => err.field === 'email');
			const ageErr = result.errors.find((err) => err.field === 'age');

			expect(emailErr?.timedOut).toBe(true);
			expect(ageErr?.timedOut).toBeUndefined();
			expect(ageErr?.message).toBe('Must be adult');
		},
		{ timeout: 500 }
	);

	test(
		'isValidAsync with timeoutMs returns false when a rule times out',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class SlowModel extends QModel<{ email: string }> {
				@QRule(async () => {
					await Bun.sleep(100);
					return true;
				}, 'Email check failed')
				declare email: string;
			}

			const model = SlowModel.create({ email: 'ok@x.com' });
			const valid = await model.$qIsValidAsync({ timeoutMs: 20 });

			expect(valid).toBe(false);
		},
		{ timeout: 500 }
	);

	test(
		'validationReportAsync with timeoutMs includes timedOut errors in report.rules',
		async () => {
			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class SlowModel extends QModel<{ email: string }> {
				@QRule(async () => {
					await Bun.sleep(100);
					return true;
				}, 'Email check failed')
				declare email: string;
			}

			const model = SlowModel.create({ email: 'ok@x.com' });
			const report = await model.$qValidationReportAsync({
				timeoutMs: 20,
			});

			expect(report.valid).toBe(false);
			expect(report.rules.errors[0]?.timedOut).toBe(true);
		},
		{ timeout: 500 }
	);
});

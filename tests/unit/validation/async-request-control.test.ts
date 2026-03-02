/**
 * @fileoverview TDD tests for async request-control features in $qCheckRulesAsync:
 *   - AbortSignal support (signal)
 *   - Global timeout (globalTimeoutMs)
 *   - Per-predicate retry (retry)
 *   - Result caching (cache)
 *   - In-flight deduplication (dedupe)
 *   - Field-level async validation ($qCheckFieldAsync)
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';
import { $qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a promise and its external resolve/reject handles. */
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

/** Simple async delay. */
const sleep = (waitMs: number): Promise<void> =>
	new Promise<void>((res) => setTimeout(res, waitMs));

// ─────────────────────────────────────────────────────────────────────────────
// Feature 1: AbortSignal
// ─────────────────────────────────────────────────────────────────────────────

describe('$qCheckRulesAsync() — AbortSignal support', () => {
	test('throws AbortError when signal is already aborted before the call', async () => {
		const ctrl = new AbortController();
		ctrl.abort();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelAbort extends QModel<{ name: string }> {
			@QRule((val: string) => val.length >= 2, 'Too short')
			declare name: string;
		}
		const mdl = ModelAbort.create({ name: 'ok-name' });

		const thrown1 = await mdl
			.$qCheckRulesAsync({ signal: ctrl.signal })
			.catch((err: unknown) => err);
		expect(thrown1).toMatchObject({ name: 'AbortError' });
	});

	test('throws AbortError when signal is aborted while predicates are in-flight', async () => {
		const ctrl = new AbortController();
		const gate = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelAbortInFlight extends QModel<{ email: string }> {
			@QRule(() => gate.promise, 'Will never finish')
			declare email: string;
		}
		const mdl = ModelAbortInFlight.create({ email: 'test@test.com' });

		const resultPromise = mdl.$qCheckRulesAsync({ signal: ctrl.signal });

		// Abort while in-flight
		ctrl.abort();
		gate.resolve(true);

		const thrown2 = await resultPromise.catch((err: unknown) => err);
		expect(thrown2).toMatchObject({ name: 'AbortError' });
	});

	test('succeeds normally when signal is not aborted', async () => {
		const ctrl = new AbortController();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelNoAbort extends QModel<{ score: number }> {
			@QRule((val: number) => val >= 0, 'Must be positive')
			declare score: number;
		}
		const mdl = ModelNoAbort.create({ score: 10 });
		const result = await mdl.$qCheckRulesAsync({ signal: ctrl.signal });
		expect(result.valid).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 2: globalTimeoutMs
// ─────────────────────────────────────────────────────────────────────────────

describe('$qCheckRulesAsync() — globalTimeoutMs', () => {
	test('throws TimeoutError when total validation exceeds globalTimeoutMs', async () => {
		const gate = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelGlobalTimeout extends QModel<{ val: string }> {
			@QRule(() => gate.promise, 'Hangs forever')
			declare val: string;
		}
		const mdl = ModelGlobalTimeout.create({ val: 'x' });

		const resultPromise = mdl.$qCheckRulesAsync({ globalTimeoutMs: 30 });
		// Let the timer fire
		await sleep(50);
		gate.resolve(true);

		const thrown3 = await resultPromise.catch((err: unknown) => err);
		expect(thrown3).toMatchObject({ name: 'TimeoutError' });
	});

	test('resolves normally when all predicates complete before globalTimeoutMs', async () => {
		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelFast extends QModel<{ age: number }> {
			@QRule(async (val: number) => {
				await sleep(5);
				return val >= 0;
			}, 'Must be positive')
			declare age: number;
		}
		const mdl = ModelFast.create({ age: 5 });
		const result = await mdl.$qCheckRulesAsync({ globalTimeoutMs: 500 });
		expect(result.valid).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 3: retry
// ─────────────────────────────────────────────────────────────────────────────

describe('$qCheckRulesAsync() — retry on rejection', () => {
	test('retries a rejecting predicate up to retry count and eventually passes', async () => {
		let callCount = 0;

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelRetryPass extends QModel<{ code: string }> {
			@QRule(() => {
				callCount++;
				if (callCount < 3) throw new Error('Transient error');
				return true;
			}, 'Code invalid')
			declare code: string;
		}
		const mdl = ModelRetryPass.create({ code: 'abc' });
		const result = await mdl.$qCheckRulesAsync({ retry: 2 });
		expect(result.valid).toBe(true);
		expect(callCount).toBe(3);
	});

	test('returns failure after all retries are exhausted', async () => {
		let callCount = 0;

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelRetryFail extends QModel<{ pin: string }> {
			@QRule(() => {
				callCount++;
				throw new Error('Always fails');
			}, 'Pin invalid')
			declare pin: string;
		}
		const mdl = ModelRetryFail.create({ pin: '0000' });
		const result = await mdl.$qCheckRulesAsync({ retry: 2 });
		expect(result.valid).toBe(false);
		expect(callCount).toBe(3); // 1 initial + 2 retries
	});

	test('retry with delayMs waits between attempts', async () => {
		let callCount = 0;
		const timestamps: number[] = [];

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelRetryDelay extends QModel<{ tok: string }> {
			@QRule(() => {
				callCount++;
				timestamps.push(Date.now());
				if (callCount < 2) throw new Error('Fail once');
				return true;
			}, 'Token invalid')
			declare tok: string;
		}
		const mdl = ModelRetryDelay.create({ tok: 'abc' });
		const result = await mdl.$qCheckRulesAsync({
			retry: { count: 1, delayMs: 50 },
		});
		expect(result.valid).toBe(true);
		expect(callCount).toBe(2);
		expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(40);
	});

	test('abort signal cancels pending retries immediately', async () => {
		let callCount = 0;
		const ctrl = new AbortController();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelRetryAbort extends QModel<{ val: string }> {
			@QRule(() => {
				callCount++;
				throw new Error('network error');
			}, 'Retry aborted')
			declare val: string;
		}
		const mdl = ModelRetryAbort.create({ val: 'test' });

		const resultPromise = mdl.$qCheckRulesAsync({
			retry: { count: 5, delayMs: 200 },
			signal: ctrl.signal,
		});
		// Abort before retries finish
		await sleep(10);
		ctrl.abort();

		const thrown4 = await resultPromise.catch((err: unknown) => err);
		expect(thrown4).toMatchObject({ name: 'AbortError' });
		// Should have called far fewer than 6 times
		expect(callCount).toBeLessThan(6);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 4: cache
// ─────────────────────────────────────────────────────────────────────────────

describe('$qCheckRulesAsync() — result caching', () => {
	test('cache:true — predicate runs only once for the same value', async () => {
		let callCount = 0;

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelCache extends QModel<{ username: string }> {
			@QRule(
				async (val: string) => {
					callCount++;
					await sleep(5);
					return val !== 'taken';
				},
				'Username taken',
				{ cache: true }
			)
			declare username: string;
		}
		const mdl = ModelCache.create({ username: 'alice' });

		const first = await mdl.$qCheckRulesAsync();
		const second = await mdl.$qCheckRulesAsync();
		expect(first.valid).toBe(true);
		expect(second.valid).toBe(true);
		expect(callCount).toBe(1); // served from cache on second call
	});

	test('cache:true — different values bypass the cache', async () => {
		let callCount = 0;

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelCacheDiff extends QModel<{ slug: string }> {
			@QRule(
				(val: string) => {
					callCount++;
					return val !== 'taken-slug';
				},
				'Slug taken',
				{ cache: true }
			)
			declare slug: string;
		}
		const mdl = ModelCacheDiff.create({ slug: 'free-slug' });
		await mdl.$qCheckRulesAsync();
		mdl.slug = 'another-slug';
		await mdl.$qCheckRulesAsync();
		expect(callCount).toBe(2);
	});

	test('cache: { maxAgeMs } — entry expires after the TTL', async () => {
		let callCount = 0;

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelCacheTTL extends QModel<{ city: string }> {
			@QRule(
				(val: string) => {
					callCount++;
					return val.length > 0;
				},
				'City required',
				{ cache: { maxAgeMs: 40 } }
			)
			declare city: string;
		}
		const mdl = ModelCacheTTL.create({ city: 'Madrid' });
		await mdl.$qCheckRulesAsync(); // call 1
		await mdl.$qCheckRulesAsync(); // served from cache
		await sleep(60);
		await mdl.$qCheckRulesAsync(); // TTL expired → call 2
		expect(callCount).toBe(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 5: dedupe
// ─────────────────────────────────────────────────────────────────────────────

describe('$qCheckRulesAsync() — in-flight deduplication', () => {
	test('dedupe:true — concurrent calls share the same underlying Promise', async () => {
		let callCount = 0;
		const gate = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelDedupe extends QModel<{ email: string }> {
			@QRule(
				() => {
					callCount++;
					return gate.promise;
				},
				'Email taken',
				{ dedupe: true }
			)
			declare email: string;
		}
		const mdlA = ModelDedupe.create({ email: 'user@example.com' });
		const mdlB = ModelDedupe.create({ email: 'user@example.com' });

		// Launch concurrently
		const promiseA = mdlA.$qCheckRulesAsync();
		const promiseB = mdlB.$qCheckRulesAsync();
		gate.resolve(true);

		const [resA, resB] = await Promise.all([promiseA, promiseB]);
		expect(resA.valid).toBe(true);
		expect(resB.valid).toBe(true);
		// Only one predicate call for both instances with same value
		expect(callCount).toBe(1);
	});

	test('dedupe:true — different values do NOT share the same Promise', async () => {
		let callCount = 0;

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class ModelDedupeDistinct extends QModel<{ ref: string }> {
			@QRule(
				(val: string) => {
					callCount++;
					return val !== 'blocked';
				},
				'Ref blocked',
				{ dedupe: true }
			)
			declare ref: string;
		}
		const mdlA = ModelDedupeDistinct.create({ ref: 'alpha' });
		const mdlB = ModelDedupeDistinct.create({ ref: 'beta' });

		await Promise.all([mdlA.$qCheckRulesAsync(), mdlB.$qCheckRulesAsync()]);
		expect(callCount).toBe(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 6: $qCheckFieldAsync
// ─────────────────────────────────────────────────────────────────────────────

describe('$qCheckFieldAsync(field)', () => {
	@Quick({}, { unknownPropertyPolicy: 'keep' })
	class UserForm extends QModel<{ name: string; email: string }> {
		@QRule((val: string) => val.length >= 3, 'Name too short')
		declare name: string;

		@QRule((val: string) => val.includes('@'), 'Email invalid')
		declare email: string;
	}

	test('validates only the specified field — only its rules run', async () => {
		const form = UserForm.create({ name: 'Jo', email: 'valid@test.com' });
		const result = await form.$qCheckFieldAsync('name');
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('name');
	});

	test('adjacent field errors do not appear when filtering by field', async () => {
		// email is valid, name is invalid
		const form = UserForm.create({ name: 'Jo', email: 'notanemail' });
		const nameResult = await form.$qCheckFieldAsync('name');
		expect(nameResult.errors.every((err) => err.field === 'name')).toBe(
			true
		);
	});

	test('returns valid:true when the specified field passes its rules', async () => {
		const form = UserForm.create({ name: 'Alice', email: 'bad' });
		const nameResult = await form.$qCheckFieldAsync('name');
		expect(nameResult.valid).toBe(true);
	});

	test('propagates async options (timeoutMs) to the field check', async () => {
		const gate = deferred<boolean>();

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class FormWithSlow extends QModel<{ tag: string }> {
			@QRule(() => gate.promise, 'Tag taken')
			declare tag: string;
		}
		const form = FormWithSlow.create({ tag: 'slow-tag' });
		const result = await form.$qCheckFieldAsync('tag', { timeoutMs: 30 });
		gate.resolve(true);
		expect(result.errors[0]?.timedOut).toBe(true);
	});

	test('standalone $qCheckRulesAsync with field option behaves identically', async () => {
		const form = UserForm.create({ name: 'Jo', email: 'valid@test.com' });
		const fromMethod = await form.$qCheckFieldAsync('name');
		const fromHelper = await $qCheckRulesAsync(form, { field: 'name' });
		expect(fromMethod).toEqual(fromHelper);
	});
});

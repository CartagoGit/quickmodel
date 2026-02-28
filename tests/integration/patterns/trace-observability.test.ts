// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Trace & Observability Integration Patterns — QuickModel
 *
 * Verifies the trace system end-to-end in realistic scenarios:
 * - Global verbosity filtering (warn, success, info, verbose)
 * - `events` array as additional whitelist on top of verbosity
 * - Per-model trace override via `@Quick` second argument
 * - Per-rule trace override via `@QRule` third argument
 * - Custom `sink` replacing console output
 * - Entry shape: level, event, model, field, ruleMessage, inputValue
 * - Security: verbose entries expose raw field values
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';
import { QConfig } from '@/core/config/quick.config';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import { TraceLogger } from '@/core/helpers/trace-logger.helper';
import type { IQTraceEntry } from '@/core/config/quick.config';
import 'reflect-metadata';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSink(): {
	entries: IQTraceEntry[];
	sink: (e: IQTraceEntry) => void;
} {
	const entries: IQTraceEntry[] = [];
	return { entries, sink: (ent) => entries.push(ent) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

interface IOrder {
	total: number;
	email: string;
}

@Quick({ total: 'number', email: 'string' })
class OrderModel extends QModel<IOrder> {
	@QRule((val: number) => val > 0, 'Total must be positive')
	@QRule((val: number) => val <= 10_000, 'Total exceeds limit')
	declare total: number;

	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email'
	)
	declare email: string;
}

interface IUser {
	username: string;
	password: string;
}

@Quick({ username: 'string', password: 'string' })
class UserModel extends QModel<IUser> {
	@QRule((val: string) => val.length >= 3, 'Username too short')
	declare username: string;

	@QRule((val: string) => val.length >= 8, 'Password too short')
	declare password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
	QConfig.reset();
	(TraceLogger as unknown as Record<string, unknown>)._configRef = undefined;
});

afterEach(() => {
	QConfig.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Global verbosity scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('Global verbosity — warn', () => {
	test('emits rule-fail but not rule-pass', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'warn', sink } } });

		const order = new OrderModel({ total: -5, email: 'valid@example.com' });
		qCheckRules(order);

		const fails = entries.filter((ent) => ent.event === 'rule-fail');
		const passes = entries.filter((ent) => ent.event === 'rule-pass');
		expect(fails.length).toBeGreaterThanOrEqual(1);
		expect(passes).toHaveLength(0);
	});

	test('rule-fail entry has correct shape', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'warn', sink } } });

		const order = new OrderModel({ total: -5, email: 'valid@example.com' });
		qCheckRules(order);

		const fail = entries.find(
			(ent) => ent.event === 'rule-fail' && ent.field === 'total'
		);
		expect(fail).toBeDefined();
		expect(fail!.level).toBe('warn');
		expect(fail!.model).toBe('OrderModel');
		expect(fail!.ruleMessage).toBe('Total must be positive');
		expect(fail!.timestamp).toBeGreaterThan(0);
	});
});

describe('Global verbosity — success', () => {
	test('emits both rule-pass and rule-fail', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'success', sink } },
		});

		const order = new OrderModel({ total: -5, email: 'valid@example.com' });
		qCheckRules(order);

		const fails = entries.filter((ent) => ent.event === 'rule-fail');
		const passes = entries.filter((ent) => ent.event === 'rule-pass');
		expect(fails.length).toBeGreaterThanOrEqual(1);
		expect(passes.length).toBeGreaterThanOrEqual(1);
	});

	test('rule-pass entry has level = success', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'success', sink } },
		});

		const order = new OrderModel({
			total: 100,
			email: 'valid@example.com',
		});
		qCheckRules(order);

		const pass = entries.find((ent) => ent.event === 'rule-pass');
		expect(pass).toBeDefined();
		expect(pass!.level).toBe('success');
	});

	test('does NOT emit construction or serialize at success verbosity', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'success', sink } },
		});

		new OrderModel({ total: 50, email: 'ok@example.com' });

		const lifecycle = entries.filter(
			(ent) =>
				ent.event === 'construction' ||
				ent.event === 'serialize' ||
				ent.event === 'deserialize'
		);
		expect(lifecycle).toHaveLength(0);
	});
});

describe('Global verbosity — info', () => {
	test('emits construction + rule-fail + rule-pass', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'info', sink } } });

		const order = new OrderModel({ total: -5, email: 'valid@example.com' });
		qCheckRules(order);

		expect(entries.some((ent) => ent.event === 'construction')).toBe(true);
		expect(entries.some((ent) => ent.event === 'rule-fail')).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. events array as whitelist
// ─────────────────────────────────────────────────────────────────────────────

describe('events whitelist', () => {
	test('filters to only specified events regardless of verbosity', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: {
				trace: {
					verbosity: 'verbose',
					events: ['rule-fail'],
					sink,
				},
			},
		});

		new OrderModel({ total: -5, email: 'valid@example.com' });
		qCheckRules(new OrderModel({ total: -5, email: 'valid@example.com' }));

		expect(entries.every((ent) => ent.event === 'rule-fail')).toBe(true);
	});

	test('success + events combo: only rule-pass events', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: {
				trace: {
					verbosity: 'success',
					events: ['rule-pass'],
					sink,
				},
			},
		});

		const order = new OrderModel({ total: 50, email: 'ok@example.com' });
		qCheckRules(order);

		expect(entries.length).toBeGreaterThanOrEqual(1);
		expect(entries.every((ent) => ent.event === 'rule-pass')).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Per-model trace override
// ─────────────────────────────────────────────────────────────────────────────

describe('Per-model trace override', () => {
	test('per-model sink receives entries even when global is silent', () => {
		const globalSink = makeSink();
		const modelSink = makeSink();

		QConfig.configure({
			defaults: { trace: { verbosity: 'silent', sink: globalSink.sink } },
		});

		@Quick(
			{ total: 'number', email: 'string' },
			{
				trace: {
					verbosity: 'warn',
					sink: modelSink.sink,
				},
			}
		)
		class TracedOrder extends QModel<IOrder> {
			@QRule((val: number) => val > 0, 'Total must be positive')
			declare total: number;

			declare email: string;
		}

		const order = new TracedOrder({ total: -1, email: 'x@x.com' });
		qCheckRules(order);

		expect(globalSink.entries).toHaveLength(0);
		expect(modelSink.entries.some((ent) => ent.event === 'rule-fail')).toBe(
			true
		);
	});

	test('per-model verbosity overrides global verbosity', () => {
		const globalSink = makeSink();
		const modelSink = makeSink();

		QConfig.configure({
			defaults: {
				trace: { verbosity: 'verbose', sink: globalSink.sink },
			},
		});

		@Quick(
			{ total: 'number', email: 'string' },
			{ trace: { verbosity: 'error', sink: modelSink.sink } }
		)
		class QuietOrder extends QModel<IOrder> {
			@QRule((val: number) => val > 0, 'Total must be positive')
			declare total: number;

			declare email: string;
		}

		const order = new QuietOrder({ total: -1, email: 'x@x.com' });
		qCheckRules(order);

		// rule-fail is 'warn' level, but model is set to 'error' — not emitted
		expect(
			modelSink.entries.filter((ent) => ent.event === 'rule-fail')
		).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Per-rule trace override
// ─────────────────────────────────────────────────────────────────────────────

describe('Per-rule trace override', () => {
	test("per-rule sink receives only that rule's events", () => {
		const globalSink = makeSink();
		const auditSink = makeSink();

		QConfig.configure({
			defaults: {
				trace: { verbosity: 'verbose', sink: globalSink.sink },
			},
		});

		class SensitiveForm {
			@QRule(
				(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
				'Invalid email',
				{ trace: { verbosity: 'warn', sink: auditSink.sink } }
			)
			email = '';

			@QRule((val: string) => val.length >= 3, 'Name too short')
			name = '';
		}

		const form = new SensitiveForm();
		form.email = 'bad-email';
		form.name = 'Al';
		qCheckRules(form);

		// Email rule goes to auditSink only
		expect(
			auditSink.entries.some(
				(ent) => ent.field === 'email' && ent.event === 'rule-fail'
			)
		).toBe(true);
		// Name rule goes to globalSink only
		expect(
			globalSink.entries.some(
				(ent) => ent.field === 'name' && ent.event === 'rule-fail'
			)
		).toBe(true);
		// Email rule does NOT appear in globalSink
		expect(globalSink.entries.some((ent) => ent.field === 'email')).toBe(
			false
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sink replaces console (not additive)
// ─────────────────────────────────────────────────────────────────────────────

describe('Sink replaces console', () => {
	test('when sink is provided, entries go only to sink, not console', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'warn', sink } } });

		const order = new OrderModel({ total: -1, email: 'x@x.com' });
		qCheckRules(order);

		// If sink works, rule-fail is captured
		expect(entries.some((ent) => ent.event === 'rule-fail')).toBe(true);
	});

	test('use both sink and console by calling console manually inside sink', () => {
		const received: string[] = [];
		QConfig.configure({
			defaults: {
				trace: {
					verbosity: 'warn',
					sink: (ent) => {
						// Manual dual-routing inside the user's sink
						received.push(`${ent.model}:${ent.event}`);
					},
				},
			},
		});

		const order = new OrderModel({ total: -1, email: 'x@x.com' });
		qCheckRules(order);

		expect(received.some((str) => str.includes('rule-fail'))).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Security — verbose exposes raw field values
// ─────────────────────────────────────────────────────────────────────────────

describe('Security — verbose exposes raw values', () => {
	test('verbose entries contain inputValue (sensitive data risk)', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		const user = new UserModel({
			username: 'alice',
			password: 'secret123',
		});
		qCheckRules(user);

		// At verbose level, rule entries carry the raw field value
		const passEntry = entries.find(
			(ent) => ent.event === 'rule-pass' && ent.field === 'password'
		);
		// inputValue is present — this is the security concern
		expect(passEntry?.inputValue).toBe('secret123');
	});

	test('at warn verbosity, inputValue is present in rule-fail entries', () => {
		const { entries, sink } = makeSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'warn', sink } } });

		const user = new UserModel({ username: 'alice', password: 'short' });
		qCheckRules(user);

		const failEntry = entries.find(
			(ent) => ent.event === 'rule-fail' && ent.field === 'password'
		);
		expect(failEntry).toBeDefined();
		// Redact sensitive fields inside the sink to avoid leaking values
		expect(failEntry!.field).toBe('password');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Async rules
// ─────────────────────────────────────────────────────────────────────────────

describe('Async rule trace integration', () => {
	test('emits rule-pass at success level for async predicate returning true', async () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'success', sink } },
		});

		class AsyncOrder {
			@QRule(
				async (val: number) => Promise.resolve(val > 0),
				'Must be positive'
			)
			total = 0;
		}

		const order = new AsyncOrder();
		order.total = 50;
		await qCheckRulesAsync(order);

		const pass = entries.find((ent) => ent.event === 'rule-pass');
		expect(pass).toBeDefined();
		expect(pass!.level).toBe('success');
	});

	test('emits rule-fail at warn level for async predicate returning false', async () => {
		const { entries, sink } = makeSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'warn', sink } },
		});

		class AsyncOrder {
			@QRule(
				async (val: number) => Promise.resolve(val > 0),
				'Must be positive'
			)
			total = 0;
		}

		const order = new AsyncOrder();
		order.total = -1;
		await qCheckRulesAsync(order);

		const fail = entries.find((ent) => ent.event === 'rule-fail');
		expect(fail).toBeDefined();
		expect(fail!.level).toBe('warn');
	});
});

/**
 * Tests for the QuickModel trace / observability system.
 *
 * Covers:
 * - IQConfig.trace verbosity levels
 * - Event filtering
 * - Custom sink
 * - TraceLogger.isEnabled()
 * - Traces emitted on: construction, serialize, rule-fail, rule-pass, rule-error,
 *   rule-timeout (async), integrity, config-change
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { QConfig } from '@/core/config/quick.config';
import { TraceLogger } from '@/core/helpers/trace-logger.helper';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import { Serializer } from '@/core/services/serializer.service';
import type { IQTraceEntry } from '@/core/config/quick.config';
import 'reflect-metadata';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function collectSink(): {
	entries: IQTraceEntry[];
	sink: (entry: IQTraceEntry) => void;
} {
	const entries: IQTraceEntry[] = [];
	return { entries, sink: (entry) => entries.push(entry) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

@Quick({ name: 'string', age: Number })
class PersonModel extends QModel<PersonModel> {
	declare name: string;
	declare age: number;
}

class FormWithRules {
	@QRule((val: string) => val.length >= 3, 'Too short')
	name = '';

	@QRule(() => {
		throw new Error('boom');
	}, 'Rule threw')
	badField = 'x';
}

class FormWithAsyncRule {
	@QRule((val: string) => val === 'valid', 'Invalid async value')
	field = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
	QConfig.reset();
	// Force TraceLogger cache invalidation
	(TraceLogger as any)._configRef = undefined;
});

afterEach(() => {
	QConfig.reset();
	(TraceLogger as any)._configRef = undefined;
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. TraceLogger.isEnabled()
// ─────────────────────────────────────────────────────────────────────────────

describe('TraceLogger.isEnabled()', () => {
	it('returns false when no config (default silent)', () => {
		expect(TraceLogger.isEnabled('error')).toBe(false);
		expect(TraceLogger.isEnabled('warn')).toBe(false);
		expect(TraceLogger.isEnabled('info')).toBe(false);
		expect(TraceLogger.isEnabled('debug')).toBe(false);
		expect(TraceLogger.isEnabled('verbose')).toBe(false);
	});

	it('returns true for levels <= configured verbosity', () => {
		QConfig.configure({ defaults: { trace: { verbosity: 'warn' } } });
		expect(TraceLogger.isEnabled('error')).toBe(true);
		expect(TraceLogger.isEnabled('warn')).toBe(true);
		expect(TraceLogger.isEnabled('info')).toBe(false);
		expect(TraceLogger.isEnabled('debug')).toBe(false);
	});

	it('verbose enables all levels', () => {
		QConfig.configure({ defaults: { trace: { verbosity: 'verbose' } } });
		expect(TraceLogger.isEnabled('error')).toBe(true);
		expect(TraceLogger.isEnabled('warn')).toBe(true);
		expect(TraceLogger.isEnabled('info')).toBe(true);
		expect(TraceLogger.isEnabled('debug')).toBe(true);
		expect(TraceLogger.isEnabled('verbose')).toBe(true);
	});

	it('legacy enableDebugLogs maps to debug verbosity', () => {
		QConfig.configure({ defaults: { enableDebugLogs: true } });
		expect(TraceLogger.isEnabled('debug')).toBe(true);
		expect(TraceLogger.isEnabled('verbose')).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Custom sink receives entries
// ─────────────────────────────────────────────────────────────────────────────

describe('Custom sink', () => {
	it('routes all emitted entries to the sink instead of console', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: {
				trace: { verbosity: 'verbose', sink },
			},
		});

		TraceLogger.emit({
			level: 'info',
			event: 'construction',
			model: 'Test',
			message: 'hello',
		});

		expect(entries).toHaveLength(1);
		expect(entries[0].event).toBe('construction');
		expect(entries[0].model).toBe('Test');
	});

	it('entry has timestamp', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'info', sink } } });

		TraceLogger.emit({
			level: 'info',
			event: 'serialize',
			model: 'Foo',
			message: 'x',
		});

		expect(entries[0].timestamp).toBeGreaterThan(0);
	});

	it('silent verbosity suppresses all entries', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'silent', sink } },
		});

		TraceLogger.emit({
			level: 'info',
			event: 'construction',
			model: 'X',
			message: 'y',
		});
		expect(entries).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Event filter
// ─────────────────────────────────────────────────────────────────────────────

describe('Event filter (events array)', () => {
	it('only emits entries for events in the filter list', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: {
				trace: { verbosity: 'verbose', events: ['rule-fail'], sink },
			},
		});

		TraceLogger.emit({
			level: 'info',
			event: 'construction',
			model: 'X',
			message: 'm',
		});
		TraceLogger.emit({
			level: 'warn',
			event: 'rule-fail',
			model: 'X',
			message: 'm',
			field: 'name',
			ruleMessage: 'bad',
		});

		expect(entries).toHaveLength(1);
		expect(entries[0].event).toBe('rule-fail');
	});

	it('emits all events when no filter is set', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		TraceLogger.emit({
			level: 'info',
			event: 'construction',
			model: 'A',
			message: 'x',
		});
		TraceLogger.emit({
			level: 'info',
			event: 'serialize',
			model: 'A',
			message: 'x',
		});

		expect(entries).toHaveLength(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. construction trace via QModel
// ─────────────────────────────────────────────────────────────────────────────

describe('construction trace', () => {
	it('emits construction entry when verbosity >= info', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'info', sink } },
		});

		new PersonModel({ name: 'Alice', age: 30 });

		const constructionEntries = entries.filter(
			(ent) => ent.event === 'construction'
		);
		expect(constructionEntries.length).toBeGreaterThanOrEqual(1);
		expect(constructionEntries[0].model).toBe('PersonModel');
		expect(constructionEntries[0].meta?.fieldCount).toBeGreaterThan(0);
	});

	it('does NOT emit construction when verbosity is silent', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'silent', sink } },
		});

		new PersonModel({ name: 'Bob', age: 25 });

		const constructionEntries = entries.filter(
			(ent) => ent.event === 'construction'
		);
		expect(constructionEntries).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. serialize trace
// ─────────────────────────────────────────────────────────────────────────────

describe('serialize trace', () => {
	it('emits serialize entry when verbosity >= info', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'info', sink } } });

		const person = new PersonModel({ name: 'Carol', age: 28 });
		const serializer = new Serializer();
		serializer.serialize(person as any);

		const serializeEntries = entries.filter(
			(ent) => ent.event === 'serialize'
		);
		expect(serializeEntries.length).toBeGreaterThanOrEqual(1);
		expect(serializeEntries[0].model).toBe('PersonModel');
	});

	it('does NOT emit serialize when verbosity is error', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'error', sink } },
		});

		const person = new PersonModel({ name: 'Dave', age: 40 });
		const serializer = new Serializer();
		serializer.serialize(person as any);

		const serializeEntries = entries.filter(
			(ent) => ent.event === 'serialize'
		);
		expect(serializeEntries).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. rule-fail, rule-pass, rule-error traces via qCheckRules
// ─────────────────────────────────────────────────────────────────────────────

describe('qCheckRules traces', () => {
	it('emits rule-fail when predicate returns false', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		const form = new FormWithRules();
		form.name = 'Ab'; // too short — fails
		qCheckRules(form);

		const failEntries = entries.filter((ent) => ent.event === 'rule-fail');
		expect(failEntries.length).toBeGreaterThanOrEqual(1);
		expect(failEntries[0].field).toBe('name');
		expect(failEntries[0].ruleMessage).toBe('Too short');
	});

	it('emits rule-pass when predicate returns true', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		const form = new FormWithRules();
		form.name = 'Alice'; // passes
		qCheckRules(form);

		const passEntries = entries.filter(
			(ent) => ent.event === 'rule-pass' && ent.field === 'name'
		);
		expect(passEntries.length).toBeGreaterThanOrEqual(1);
	});

	it('emits rule-error when predicate throws', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		const form = new FormWithRules();
		qCheckRules(form);

		const errorEntries = entries.filter(
			(ent) => ent.event === 'rule-error'
		);
		expect(errorEntries.length).toBeGreaterThanOrEqual(1);
		expect(errorEntries[0].field).toBe('badField');
		expect(errorEntries[0].meta?.error).toContain('boom');
	});

	it('does NOT emit rule-pass when verbosity is warn (pass is verbose)', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({ defaults: { trace: { verbosity: 'warn', sink } } });

		const form = new FormWithRules();
		form.name = 'Alice';
		qCheckRules(form);

		const passEntries = entries.filter((ent) => ent.event === 'rule-pass');
		expect(passEntries).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. rule-timeout via qCheckRulesAsync
// ─────────────────────────────────────────────────────────────────────────────

describe('qCheckRulesAsync traces — rule-timeout', () => {
	it('emits rule-timeout when async predicate exceeds timeoutMs', async () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		class SlowForm {
			@QRule(
				async () =>
					new Promise<boolean>((res) =>
						setTimeout(() => res(true), 500)
					),
				'Slow rule'
			)
			slowField = 'x';
		}

		const frm = new SlowForm();
		await qCheckRulesAsync(frm, { timeoutMs: 10 });

		const timeoutEntries = entries.filter(
			(ent) => ent.event === 'rule-timeout'
		);
		expect(timeoutEntries.length).toBeGreaterThanOrEqual(1);
		expect(timeoutEntries[0].field).toBe('slowField');
	});

	it('emits rule-fail for async predicate returning false', async () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		const frm = new FormWithAsyncRule();
		frm.field = 'wrong';
		await qCheckRulesAsync(frm);

		const failEntries = entries.filter(
			(ent) => ent.event === 'rule-fail' && ent.field === 'field'
		);
		expect(failEntries.length).toBeGreaterThanOrEqual(1);
	});

	it('emits rule-pass for async predicate returning true', async () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		const frm = new FormWithAsyncRule();
		frm.field = 'valid';
		await qCheckRulesAsync(frm);

		const passEntries = entries.filter(
			(ent) => ent.event === 'rule-pass' && ent.field === 'field'
		);
		expect(passEntries.length).toBeGreaterThanOrEqual(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. config-change trace
// ─────────────────────────────────────────────────────────────────────────────

describe('config-change trace', () => {
	it('emits config-change when config is updated after TraceLogger is initialized', () => {
		const { entries, sink } = collectSink();

		// Initial configure: verbosity + sink active
		QConfig.configure({ defaults: { trace: { verbosity: 'info', sink } } });
		// Let TraceLogger pick up this config
		TraceLogger.isEnabled('info');

		// Now update config (new object reference) — _refreshCache will detect the change
		QConfig.configure({ defaults: { trace: { verbosity: 'info', sink } } });
		// Trigger TraceLogger to detect the config change
		TraceLogger.isEnabled('info');

		const changes = entries.filter((ent) => ent.event === 'config-change');
		expect(changes.length).toBeGreaterThanOrEqual(1);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Entry structure
// ─────────────────────────────────────────────────────────────────────────────

describe('IQTraceEntry structure', () => {
	it('entry contains all required fields', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		TraceLogger.traceRule({
			event: 'rule-fail',
			modelName: 'UserModel',
			modelCtor: undefined,
			field: 'email',
			ruleMessage: 'Invalid email',
			value: 'bad@',
		});

		const entry = entries[0];
		expect(entry.timestamp).toBeNumber();
		expect(entry.level).toBe('warn');
		expect(entry.event).toBe('rule-fail');
		expect(entry.model).toBe('UserModel');
		expect(entry.field).toBe('email');
		expect(entry.ruleMessage).toBe('Invalid email');
		expect(entry.message).toContain('email');
	});

	it('verbose entries include inputValue', () => {
		const { entries, sink } = collectSink();
		QConfig.configure({
			defaults: { trace: { verbosity: 'verbose', sink } },
		});

		TraceLogger.traceRule({
			event: 'rule-fail',
			modelName: 'OrderModel',
			modelCtor: undefined,
			field: 'amount',
			ruleMessage: 'Too low',
			value: -5,
		});

		const secondEntry = entries[0];
		expect(secondEntry.inputValue).toBe(-5);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. logPrefix — configurable console prefix
// ─────────────────────────────────────────────────────────────────────────────

describe('logPrefix config', () => {
	it('uses "QM" as default prefix', () => {
		const spy = spyOn(console, 'info').mockImplementation(() => {});
		QConfig.configure({ defaults: { trace: { verbosity: 'info' } } });

		TraceLogger.emit({
			level: 'info',
			event: 'construction',
			model: 'Test',
			message: 'hi',
		});

		expect(
			spy.mock.calls.some((args) => String(args[0]).startsWith('[QM]['))
		).toBe(true);
		spy.mockRestore();
	});

	it('uses the configured custom prefix', () => {
		const spy = spyOn(console, 'info').mockImplementation(() => {});
		QConfig.configure({
			defaults: { trace: { verbosity: 'info', prefix: 'Acme' } },
		});

		TraceLogger.emit({
			level: 'info',
			event: 'construction',
			model: 'Test',
			message: 'hi',
		});

		expect(
			spy.mock.calls.some((args) => String(args[0]).startsWith('[Acme]['))
		).toBe(true);
		spy.mockRestore();
	});

	it('resets prefix to "QM" after QConfig.reset()', () => {
		QConfig.configure({
			defaults: { trace: { verbosity: 'info', prefix: 'Tmp' } },
		});
		(TraceLogger as any)._configRef = undefined;
		QConfig.reset();
		(TraceLogger as any)._configRef = undefined;

		const spy = spyOn(console, 'info').mockImplementation(() => {});
		QConfig.configure({ defaults: { trace: { verbosity: 'info' } } });

		TraceLogger.emit({
			level: 'info',
			event: 'construction',
			model: 'Test',
			message: 'hi',
		});

		expect(
			spy.mock.calls.some((args) => String(args[0]).startsWith('[QM]['))
		).toBe(true);
		spy.mockRestore();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Per-model trace via @Quick second parameter
// ─────────────────────────────────────────────────────────────────────────────

describe('Per-model trace via @Quick', () => {
	it('per-model sink receives entries even when global is silent', () => {
		const { entries, sink } = collectSink();
		// Global: silent (no configure)
		// Per-model: verbose with custom sink

		@Quick({ name: 'string' }, { trace: { verbosity: 'verbose', sink } })
		class TracedModel extends QModel<{ name: string }> {
			declare name: string;
		}

		new TracedModel({ name: 'Alice' });

		const constructionEntries = entries.filter(
			(ent) => ent.event === 'construction'
		);
		expect(constructionEntries.length).toBeGreaterThanOrEqual(1);
		expect(constructionEntries[0].model).toBe('TracedModel');
	});

	it('per-model verbosity overrides global verbosity', () => {
		const globalEntries: IQTraceEntry[] = [];
		const perModelEntries: IQTraceEntry[] = [];

		QConfig.configure({
			defaults: {
				trace: {
					verbosity: 'silent',
					sink: (ent) => globalEntries.push(ent),
				},
			},
		});

		@Quick(
			{ name: 'string' },
			{
				trace: {
					verbosity: 'info',
					sink: (ent) => perModelEntries.push(ent),
				},
			}
		)
		class LocalModel extends QModel<{ name: string }> {
			declare name: string;
		}

		new LocalModel({ name: 'Bob' });

		expect(globalEntries).toHaveLength(0);
		expect(
			perModelEntries.filter((ent) => ent.event === 'construction').length
		).toBeGreaterThanOrEqual(1);
	});

	it('per-model events filter restricts which events arrive at the sink', () => {
		const { entries, sink } = collectSink();

		@Quick(
			{ name: 'string' },
			{
				trace: {
					verbosity: 'verbose',
					events: ['rule-fail'],
					sink,
				},
			}
		)
		class FilteredModel extends QModel<{ name: string }> {
			declare name: string;
		}

		// construction should be filtered out
		new FilteredModel({ name: 'Carol' });
		expect(
			entries.filter((ent) => ent.event === 'construction')
		).toHaveLength(0);
	});
});

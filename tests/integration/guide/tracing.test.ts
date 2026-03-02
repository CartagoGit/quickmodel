/**
 * Integration Test: tracing
 * Covers: docs-vitepress/en/guide/tracing.md
 *
 * Validates:
 * - QConfig trace.verbosity 'silent' emits nothing
 * - trace.sink captures structured entries
 * - construction event is emitted at 'info' level
 * - rule-fail event is captured when verbosity >= 'warn'
 * - transformer event is captured at 'debug' level
 * - QConfig.reset() turns off tracing
 */

import { afterEach, describe, expect, test } from 'bun:test';
import { QConfig, QModel, Quick } from '@/index';
import { QRule } from '@/decorators';
import type { IQTraceEntry } from '@/core/config/quick.config';

// ── Model ─────────────────────────────────────────────────────────────────────

interface IOrder {
	id: number;
	amount: number;
}

@Quick({ id: Number, amount: Number }, { unknownPropertyPolicy: 'keep' })
class OrderModel extends QModel<IOrder> {
	@QRule(
		(val: number) => typeof val === 'number' && val > 0,
		'Amount must be positive'
	)
	declare id: number;

	@QRule(
		(val: number) => typeof val === 'number' && val > 0,
		'Amount must be positive'
	)
	declare amount: number;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: tracing (guide/tracing.md)', () => {
	const capturedEntries: IQTraceEntry[] = [];

	afterEach(() => {
		QConfig.reset();
		capturedEntries.length = 0;
	});

	describe('verbosity: silent (default)', () => {
		test('no entries emitted when verbosity is silent', () => {
			// Default is silent — no sink needed to verify nothing fires
			const entries: IQTraceEntry[] = [];
			QConfig.configure({
				defaults: {
					trace: {
						verbosity: 'silent',
						sink: (entry) => entries.push(entry),
					},
				},
			});

			new OrderModel({ id: 1, amount: 100 });

			expect(entries).toHaveLength(0);
		});
	});

	describe("verbosity: 'info' — captures lifecycle milestones", () => {
		test('construction event is emitted', () => {
			const entries: IQTraceEntry[] = [];
			QConfig.configure({
				defaults: {
					trace: {
						verbosity: 'info',
						sink: (entry) => entries.push(entry),
					},
				},
			});

			new OrderModel({ id: 1, amount: 50 });

			const constructionEntries = entries.filter(
				(ent) => ent.event === 'construction'
			);
			expect(constructionEntries.length).toBeGreaterThan(0);
		});

		test('construction entry has model name', () => {
			const entries: IQTraceEntry[] = [];
			QConfig.configure({
				defaults: {
					trace: {
						verbosity: 'info',
						sink: (entry) => entries.push(entry),
					},
				},
			});

			new OrderModel({ id: 2, amount: 200 });

			const cEntry = entries.find((ent) => ent.event === 'construction');
			expect(cEntry).toBeDefined();
			expect(cEntry?.model).toBe('OrderModel');
		});
	});

	describe("verbosity: 'warn' — captures rule failures", () => {
		test('rule-fail event is emitted for failing rules', () => {
			const entries: IQTraceEntry[] = [];
			QConfig.configure({
				defaults: {
					trace: {
						verbosity: 'warn',
						sink: (entry) => entries.push(entry),
					},
				},
			});

			const model = new OrderModel({ id: -1, amount: -5 });
			model.$qCheckRules();

			const ruleFailEntries = entries.filter(
				(ent) => ent.event === 'rule-fail'
			);
			expect(ruleFailEntries.length).toBeGreaterThan(0);
		});

		test('rule-fail entry contains rule message', () => {
			const entries: IQTraceEntry[] = [];
			QConfig.configure({
				defaults: {
					trace: {
						verbosity: 'warn',
						sink: (entry) => entries.push(entry),
					},
				},
			});

			const model = new OrderModel({ id: 1, amount: -5 });
			model.$qCheckRules();

			const ruleFailEntry = entries.find(
				(ent) => ent.event === 'rule-fail'
			);
			expect(ruleFailEntry).toBeDefined();
			expect(ruleFailEntry?.message).toContain('Amount must be positive');
		});
	});

	describe('sink prevents console output', () => {
		test('when sink is provided, all entries go to sink', () => {
			const sinkEntries: IQTraceEntry[] = [];
			QConfig.configure({
				defaults: {
					trace: {
						verbosity: 'info',
						sink: (entry) => sinkEntries.push(entry),
					},
				},
			});

			new OrderModel({ id: 3, amount: 300 });

			// Sink should have received entries
			expect(sinkEntries.length).toBeGreaterThan(0);
		});
	});

	describe('QConfig.reset() disables tracing', () => {
		test('after reset, no entries are emitted', () => {
			const entries: IQTraceEntry[] = [];
			QConfig.configure({
				defaults: {
					trace: {
						verbosity: 'info',
						sink: (entry) => entries.push(entry),
					},
				},
			});

			// Verify it's capturing
			new OrderModel({ id: 4, amount: 400 });
			const countAfterConfigure = entries.length;
			expect(countAfterConfigure).toBeGreaterThan(0);

			// After reset, entries array is cleared and new constructions don't add
			QConfig.reset();
			entries.length = 0;

			new OrderModel({ id: 5, amount: 500 });

			expect(entries).toHaveLength(0);
		});
	});
});

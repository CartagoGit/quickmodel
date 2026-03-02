/**
 * Integration Test: unknown-property-policy
 * Covers: docs-vitepress/en/guide/unknown-property-policy.md
 *
 * Validates:
 * - 'strip' policy removes unknown fields silently
 * - 'keep' policy preserves unknown fields in serialized output
 * - 'error' policy throws on unknown fields
 * - Per-class override vs. global QConfig
 */

import { afterEach, describe, expect, test } from 'bun:test';
import { QConfig, QModel, Quick } from '@/index';

// ── Models ────────────────────────────────────────────────────────────────────

interface ISimple {
	name: string;
}

@Quick({ name: String })
class StrictStripModel extends QModel<ISimple> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'strip',
	});
	declare name: string;
}

@Quick({ name: String })
class KeepExtraModel extends QModel<ISimple> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep',
	});
	declare name: string;
}

@Quick({ name: String })
class ErrorOnExtraModel extends QModel<ISimple> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'error',
	});
	declare name: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: unknown-property-policy (guide/unknown-property-policy.md)', () => {
	afterEach(() => {
		QConfig.reset();
	});

	describe("'strip' policy", () => {
		test('extra fields are silently removed from serialized output', () => {
			const mdl = new StrictStripModel({
				name: 'Alice',
				extra: 'ignored',
			} as never);
			const output = mdl.$qSerialize();

			expect(output['name']).toBe('Alice');
			expect('extra' in output).toBe(false);
		});

		test('model instance does not retain the extra field', () => {
			const mdl = new StrictStripModel({
				name: 'Bob',
				unknown: 42,
			} as never);

			expect(mdl.name).toBe('Bob');
			expect(
				(mdl as unknown as Record<string, unknown>)['unknown'] // @quickmodel-rule-ignore: no-as-unknown
			).toBeUndefined();
		});
	});

	describe("'keep' policy", () => {
		test('extra fields are preserved in serialized output', () => {
			const mdl = new KeepExtraModel({
				name: 'Carol',
				extra: 'preserved',
			} as never);
			const output = mdl.$qSerialize();

			expect(output['name']).toBe('Carol');
			expect(output['extra']).toBe('preserved');
		});

		test('extra numeric and boolean fields are kept', () => {
			const mdl = new KeepExtraModel({
				name: 'Dave',
				score: 99,
				active: true,
			} as never);
			const output = mdl.$qSerialize();

			expect(output['score']).toBe(99);
			expect(output['active']).toBe(true);
		});
	});

	describe("'error' policy", () => {
		test('throws when an unknown field is passed', () => {
			expect(() => {
				new ErrorOnExtraModel({
					name: 'Eve',
					unexpected: 'boom',
				} as never);
			}).toThrow();
		});

		test('does not throw when only known fields are passed', () => {
			expect(() => {
				new ErrorOnExtraModel({ name: 'Frank' });
			}).not.toThrow();
		});
	});

	describe('per-class config overrides global', () => {
		test('class-level strip overrides global keep', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'keep' } });

			// StrictStripModel has 'strip' at class level — overrides global 'keep'
			const mdl = new StrictStripModel({
				name: 'Grace',
				extField: 'gone',
			} as never);
			const output = mdl.$qSerialize();

			expect(output['name']).toBe('Grace');
			expect('extField' in output).toBe(false);
		});

		test('class-level keep does not throw even when global is error', () => {
			QConfig.configure({ defaults: { unknownPropertyPolicy: 'error' } });

			expect(() => {
				new KeepExtraModel({ name: 'Harry', extra: 'ok' } as never);
			}).not.toThrow();

			const mdl = new KeepExtraModel({
				name: 'Harry',
				extra: 'ok',
			} as never);
			expect(mdl.$qSerialize()['extra']).toBe('ok');
		});
	});

	describe('global policy propagation', () => {
		test('strip policy at class level works correctly', () => {
			const mdl = new StrictStripModel({
				name: 'TestUser',
				extraField: 'removed',
			} as never);
			expect(mdl.$qSerialize()['name']).toBe('TestUser');
			expect('extraField' in mdl.$qSerialize()).toBe(false);
		});
	});
});

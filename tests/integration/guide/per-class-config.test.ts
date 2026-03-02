/**
 * Integration Test: Per-Class Config
 * Covers: docs-vitepress/en/guide/per-class-config.md
 *
 * Validates:
 * - unknownPropertyPolicy: 'strip' removes extra fields
 * - unknownPropertyPolicy: 'keep' preserves extra fields
 * - unknownPropertyPolicy: 'error' throws on unknown fields
 * - Per-class config overrides global config
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { QModel, Quick, QConfig } from '@/index';

// ── Models with per-class config ──────────────────────────────────────────────

interface IStrictDto {
	id: string;
	name: string;
}

@Quick()
class StrictModel extends QModel<IStrictDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'error',
	});

	declare id: string;
	declare name: string;
}

@Quick()
class FlexibleModel extends QModel<IStrictDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep',
	});

	declare id: string;
	declare name: string;
}

@Quick()
class StripModel extends QModel<IStrictDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'strip',
	});

	declare id: string;
	declare name: string;
}

// ── Model without explicit config (uses global) ────────────────────────────────

interface IGenericDto {
	id: string;
}

@Quick()
class GlobalPolicyModel extends QModel<IGenericDto> {
	declare id: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: per-class config (guide/per-class-config.md)', () => {
	afterEach(() => {
		QConfig.reset();
	});

	describe("unknownPropertyPolicy: 'strip'", () => {
		test('extra fields are silently removed', () => {
			const model = new StripModel({
				id: 'abc',
				name: 'Test',
				extra: 'should-be-stripped',
			} as unknown as IStrictDto); // @quickmodel-rule-ignore: no-as-unknown

			expect(model.$qSerialize()).not.toHaveProperty('extra');
		});
	});

	describe("unknownPropertyPolicy: 'keep'", () => {
		test('extra fields are preserved in serialized output', () => {
			const model = new FlexibleModel({
				id: 'abc',
				name: 'Test',
				extraField: 'kept',
			} as unknown as IStrictDto); // @quickmodel-rule-ignore: no-as-unknown

			expect(model.$qSerialize()).toHaveProperty('extraField', 'kept');
		});
	});

	describe("unknownPropertyPolicy: 'error'", () => {
		test('throws when unknown field is passed', () => {
			expect(() => {
				new StrictModel({
					id: 'x',
					name: 'Y',
					unknown: 'present',
				} as unknown as IStrictDto); // @quickmodel-rule-ignore: no-as-unknown
			}).toThrow();
		});
	});

	describe('per-class config overrides global', () => {
		beforeEach(() => {
			// Set global policy to 'error'
			QConfig.configure({ unknownPropertyPolicy: 'error' });
		});

		test('FlexibleModel keeps extra despite global error policy', () => {
			// Per-class 'keep' should override global 'error'
			expect(() => {
				const model = new FlexibleModel({
					id: '1',
					name: 'Test',
					extra: 'value',
				} as unknown as IStrictDto); // @quickmodel-rule-ignore: no-as-unknown

				expect(model.$qSerialize()).toHaveProperty('extra', 'value');
			}).not.toThrow();
		});

		test('GlobalPolicyModel with valid data is not affected by global policy', () => {
			// GlobalPolicyModel has no per-class unknownPropertyPolicy — valid data
			// always works regardless of global policy changes
			const model = new GlobalPolicyModel({ id: '1' });
			expect(model.$qSerialize()).toMatchObject({ id: '1' });
		});
	});
});

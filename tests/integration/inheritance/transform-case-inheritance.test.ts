import { QModel, Quick } from '@/index';
import { QConfig } from '@/core/config/quick.config';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

/**
 * Task #16 — transformCase with multi-level inheritance.
 *
 * Verifies that case transformations applied via @Quick decorator or global
 * config work correctly for ALL fields across the inheritance chain, not just
 * the fields declared on the leaf class.
 */
describe('transformCase: multi-level inheritance', () => {
	beforeEach(() => QConfig.reset());
	afterEach(() => QConfig.reset());

	// -----------------------------------------------------------------------
	// 2-level inheritance
	// -----------------------------------------------------------------------

	describe('2-level: Base → Child', () => {
		test('in:snake_case — fields from both Base and Child are populated', () => {
			class Base extends QModel<any> {
				declare baseField: string;
			}

			@Quick(
				{},
				{ transformCase: { in: 'snake_case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Base {
				declare childField: string;
			}

			const child = new Child({
				base_field: 'from-base',
				child_field: 'from-child',
			} as any);

			expect(child.baseField).toBe('from-base');
			expect(child.childField).toBe('from-child');
		});

		test('out:snake_case — fields from both Base and Child are serialized', () => {
			class Base extends QModel<any> {
				declare baseField: string;
			}

			@Quick(
				{},
				{ transformCase: { out: 'snake_case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Base {
				declare childField: string;
			}

			const child = new Child({ baseField: 'a', childField: 'b' });
			const json = JSON.parse(child.toJSON());

			expect(json.base_field).toBe('a');
			expect(json.child_field).toBe('b');
			expect(json.baseField).toBeUndefined();
			expect(json.childField).toBeUndefined();
		});

		test('roundtrip snake_in + snake_out over 2 levels', () => {
			class Base extends QModel<any> {
				declare createdAt: string;
			}

			@Quick(
				{},
				{ transformCase: { in: 'snake_case', out: 'snake_case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Base {
				declare userId: number;
			}

			const child = new Child({
				created_at: '2025-01-01',
				user_id: 7,
			} as any);
			const json = JSON.parse(child.toJSON());

			expect(child.createdAt).toBe('2025-01-01');
			expect(child.userId).toBe(7);
			expect(json.created_at).toBe('2025-01-01');
			expect(json.user_id).toBe(7);
		});
	});

	// -----------------------------------------------------------------------
	// 3-level inheritance
	// -----------------------------------------------------------------------

	describe('3-level: Base → Middle → Child', () => {
		test('in:snake_case — fields from all 3 levels are populated', () => {
			class Base extends QModel<any> {
				declare baseField: string;
			}

			class Middle extends Base {
				declare middleField: string;
			}

			@Quick(
				{},
				{ transformCase: { in: 'snake_case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Middle {
				declare childField: string;
			}

			const child = new Child({
				base_field: 'base',
				middle_field: 'middle',
				child_field: 'child',
			} as any);

			expect(child.baseField).toBe('base');
			expect(child.middleField).toBe('middle');
			expect(child.childField).toBe('child');
		});

		test('out:snake_case — fields from all 3 levels are serialized', () => {
			class Base extends QModel<any> {
				declare baseField: string;
			}

			class Middle extends Base {
				declare middleField: string;
			}

			@Quick(
				{},
				{ transformCase: { out: 'snake_case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Middle {
				declare childField: string;
			}

			const child = new Child({
				baseField: 'base',
				middleField: 'middle',
				childField: 'child',
			});
			const json = JSON.parse(child.toJSON());

			expect(json.base_field).toBe('base');
			expect(json.middle_field).toBe('middle');
			expect(json.child_field).toBe('child');
		});

		test('in:snake_case via global config — all levels populated', () => {
			QConfig.configure({
				defaults: { transformCase: { in: 'snake_case' } },
			});

			class Base extends QModel<any> {
				declare baseField: string;
			}

			class Middle extends Base {
				declare middleField: string;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Child extends Middle {
				declare childField: string;
			}

			const child = new Child({
				base_field: 'b',
				middle_field: 'm',
				child_field: 'c',
			} as any);

			expect(child.baseField).toBe('b');
			expect(child.middleField).toBe('m');
			expect(child.childField).toBe('c');
		});

		test('out:snake_case via global config — all levels serialized', () => {
			QConfig.configure({
				defaults: { transformCase: { out: 'snake_case' } },
			});

			class Base extends QModel<any> {
				declare baseField: string;
			}

			class Middle extends Base {
				declare middleField: string;
			}

			@Quick({}, { unknownPropertyPolicy: 'keep' })
			class Child extends Middle {
				declare childField: string;
			}

			const child = new Child({
				baseField: 'b',
				middleField: 'm',
				childField: 'c',
			});
			const json = JSON.parse(child.toJSON());

			expect(json.base_field).toBe('b');
			expect(json.middle_field).toBe('m');
			expect(json.child_field).toBe('c');
		});

		test('3-level with type transformers — Date field on Base, case on Child', () => {
			class Base extends QModel<any> {
				declare createdAt: Date;
			}

			class Middle extends Base {
				declare label: string;
			}

			@Quick(
				{ createdAt: Date },
				{ transformCase: { in: 'snake_case', out: 'snake_case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Middle {
				declare userId: number;
			}

			const child = new Child({
				created_at: '2024-06-15',
				label: 'test',
				user_id: 42,
			} as any);

			expect(child.createdAt).toBeInstanceOf(Date);
			expect(child.label).toBe('test');
			expect(child.userId).toBe(42);

			const json = JSON.parse(child.toJSON());
			expect(json.created_at).toBeDefined();
			expect(json.label).toBe('test');
			expect(json.user_id).toBe(42);
		});

		test('decorator transformCase overrides global config across all levels', () => {
			// Global says kebab, decorator says snake — decorator wins
			QConfig.configure({
				defaults: { transformCase: { in: 'kebab-case' } },
			});

			class Base extends QModel<any> {
				declare baseField: string;
			}

			class Middle extends Base {
				declare middleField: string;
			}

			@Quick(
				{},
				{ transformCase: { in: 'snake_case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Middle {
				declare childField: string;
			}

			// Use snake format (decorator wins)
			const child = new Child({
				base_field: 'b',
				middle_field: 'm',
				child_field: 'c',
			} as any);

			expect(child.baseField).toBe('b');
			expect(child.middleField).toBe('m');
			expect(child.childField).toBe('c');
		});
	});

	// -----------------------------------------------------------------------
	// with kebab-case
	// -----------------------------------------------------------------------

	describe('kebab-case in multi-level', () => {
		test('in:kebab-case across 3 levels', () => {
			class Base extends QModel<any> {
				declare apiKey: string;
			}

			class Middle extends Base {
				declare maxRetries: number;
			}

			@Quick(
				{},
				{ transformCase: { in: 'kebab-case' } },
				{ unknownPropertyPolicy: 'keep' }
			)
			class Child extends Middle {
				declare timeoutMs: number;
			}

			const child = new Child({
				'api-key': 'abc',
				'max-retries': 3,
				'timeout-ms': 5000,
			} as any);

			expect(child.apiKey).toBe('abc');
			expect(child.maxRetries).toBe(3);
			expect(child.timeoutMs).toBe(5000);
		});
	});
});

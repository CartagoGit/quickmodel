/**
 * Integration Test: reserved-words
 * Covers: docs-vitepress/en/guide/reserved-words.md
 *
 * Validates:
 * - Fields named like QModel methods (copy, serialize, validate) work without conflict
 * - The `$q*` prefix pattern means all QModel methods are prefixed, leaving domain names free
 * - Fields with names from JS prototype chain work correctly
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';

// ── Models ────────────────────────────────────────────────────────────────────

// Model with fields that collide with old-style method names (not $q-prefixed)
interface IOrderWithReservedNames {
	history: string[];
	copy: string;
	validate: boolean;
	serialize: string;
	checkRules: number;
}

@Quick({
	history: [String],
	checkRules: Number,
})
class OrderModel extends QModel<IOrderWithReservedNames> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep',
	});

	declare history: string[];
	declare copy: string;
	declare validate: boolean;
	declare serialize: string;
	declare checkRules: number;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: reserved-words (guide/reserved-words.md)', () => {
	describe('fields named like QModel methods work without conflict', () => {
		test('field named "copy" does not shadow $qCopy()', () => {
			const order = new OrderModel({
				history: ['event1'],
				copy: 'copy-value',
				validate: true,
				serialize: 'raw',
				checkRules: 5,
			});

			// Domain field 'copy' is a string
			expect(order.copy).toBe('copy-value');

			// $qCopy() still works as the QModel method
			expect(typeof order.$qCopy).toBe('function');
		});

		test('field named "serialize" does not shadow $qSerialize()', () => {
			const order = new OrderModel({
				history: [],
				copy: '',
				validate: false,
				serialize: 'custom-string',
				checkRules: 0,
			});

			// Domain field
			expect(order.serialize).toBe('custom-string');

			// $qSerialize() still works
			const out = order.$qSerialize();
			expect(typeof out).toBe('object');
			expect(out['serialize']).toBe('custom-string');
		});

		test('field named "validate" does not shadow $qCheckRules()', () => {
			const order = new OrderModel({
				history: [],
				copy: '',
				validate: true,
				serialize: '',
				checkRules: 1,
			});

			// Domain field
			expect(order.validate).toBe(true);

			// $qCheckRules() still works
			expect(typeof order.$qCheckRules).toBe('function');
		});

		test('field named "checkRules" (number) is coerced correctly', () => {
			const order = new OrderModel({
				history: ['a', 'b'],
				copy: 'x',
				validate: false,
				serialize: 'y',
				checkRules: 42,
			});

			expect(order.checkRules).toBe(42);
		});

		test('field "history" as string array is hydrated correctly', () => {
			const order = new OrderModel({
				history: ['create', 'update', 'delete'],
				copy: 'snapshot',
				validate: true,
				serialize: 'json',
				checkRules: 3,
			});

			expect(Array.isArray(order.history)).toBe(true);
			expect(order.history).toHaveLength(3);
			expect(order.history[0]).toBe('create');
		});
	});

	describe('$qSerialize() includes all fields including those with reserved names', () => {
		test('all fields appear in serialized output', () => {
			const order = new OrderModel({
				history: ['step1'],
				copy: 'copy-val',
				validate: true,
				serialize: 'ser-val',
				checkRules: 7,
			});

			const out = order.$qSerialize();
			expect(out['history']).toEqual(['step1']);
			expect(out['copy']).toBe('copy-val');
			expect(out['validate']).toBe(true);
			expect(out['serialize']).toBe('ser-val');
			expect(out['checkRules']).toBe(7);
		});
	});

	describe('the $q* namespace is reserved — domain fields use regular names', () => {
		test('QModel methods are all prefixed with $q, leaving plain names free', () => {
			const order = new OrderModel({
				history: [],
				copy: 'safe',
				validate: false,
				serialize: 'plain',
				checkRules: 0,
			});

			// All $q* methods exist and are functions
			expect(typeof order.$qSerialize).toBe('function');
			expect(typeof order.$qCopy).toBe('function');
			expect(typeof order.$qCheckRules).toBe('function');
			expect(typeof order.$qToJSON).toBe('function');

			// Domain field 'copy' is a string value, not a function
			expect(typeof order.copy).toBe('string');
		});
	});
});

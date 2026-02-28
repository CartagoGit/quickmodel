// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * @fileoverview Unit tests for the TC39 (Stage 3) path of @QRule using real
 * class syntax.
 *
 * This file has its own tsconfig (`tsconfig.json` in this directory) that sets
 * `experimentalDecorators: false`, enabling TS 5 TC39 standard decorators.
 * That means `@QRule` here is compiled as a ClassFieldDecoratorContext call —
 * exactly as a real consumer app without `experimentalDecorators` would use it.
 *
 * ## Key difference vs legacy mode
 *
 * In TC39 mode the predicate parameter type is **inferred automatically** from
 * the decorated field type. No annotation needed:
 *
 * ```ts
 * class Product {
 *   @QRule((val) => val > 0, 'Positive') // val inferred as number
 *   price!: number;
 * }
 * ```
 *
 * In legacy mode the same would require `(val: number) => val > 0`.
 */

import 'reflect-metadata';
import { describe, test, expect } from 'bun:test';
import {
	QRule,
	QRULE_METADATA_KEY,
	QRULE_FIELDS_KEY,
} from '@/core/decorators/qrule.decorator';
import type { IQRule } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Basic registration
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: basic rule registration', () => {
	test('registers a rule on the class prototype after instantiation', () => {
		class User {
			@QRule((val) => val.length > 0, 'Name required')
			name!: string;
		}

		// TC39: addInitializer fires on first instantiation
		new User();

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			User.prototype,
			'name'
		);
		expect(rules).toHaveLength(1);
		expect(rules[0]?.message).toBe('Name required');
	});

	test('predicate receives correct type — val inferred from field type', () => {
		// In TC39 mode val is inferred as number; this file type-checks only if
		// the inference works correctly (val.toFixed() would error on unknown).
		let capturedVal: number | undefined;

		class Measurement {
			@QRule((val) => {
				capturedVal = val;
				return val >= 0;
			}, 'Non-negative')
			value!: number;
		}

		const instance = new Measurement();
		instance.value = 42;

		// Manually trigger the rule to confirm the predicate received a number
		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Measurement.prototype,
			'value'
		);
		(rules[0]?.predicate as (v: number) => boolean)(7);
		expect(capturedVal).toBe(7);
	});

	test('stores the predicate function reference', () => {
		const isPositive = (val: number) => val > 0;

		class Product {
			@QRule(isPositive, 'Price must be positive')
			price!: number;
		}

		new Product();

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Product.prototype,
			'price'
		);
		expect(rules[0]?.predicate as unknown).toBe(isPositive);
	});

	test('accepts a lazy () => string message', () => {
		const getError = () => 'computed: label is required';

		class Config {
			@QRule((_val) => false, getError)
			label!: string;
		}

		new Config();

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Config.prototype,
			'label'
		);
		const msg = rules[0]?.message;
		expect(typeof msg).toBe('function');
		expect((msg as () => string)()).toBe('computed: label is required');
	});

	test('QRULE_FIELDS_KEY tracks all decorated fields', () => {
		class Order {
			@QRule((val) => val.length > 0, 'Required')
			reference!: string;

			@QRule((val) => val > 0, 'Must be positive')
			total!: number;
		}

		new Order();

		const fields: string[] = Reflect.getMetadata(
			QRULE_FIELDS_KEY,
			Order.prototype
		);
		expect(fields).toContain('reference');
		expect(fields).toContain('total');
	});
});

// ---------------------------------------------------------------------------
// Multiple rules per field
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: multiple rules per field', () => {
	test('multiple @QRule on the same field accumulate (each registered once)', () => {
		class Person {
			@QRule((val) => val >= 0, 'Non-negative')
			@QRule((val) => val <= 120, 'Realistic')
			age!: number;
		}

		new Person();

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Person.prototype,
			'age'
		);
		expect(rules).toHaveLength(2);
		const messages = rules.map((rule) => rule.message);
		expect(messages).toContain('Non-negative');
		expect(messages).toContain('Realistic');
	});

	test('a field key appears only once in QRULE_FIELDS_KEY with multiple @QRule', () => {
		class Score {
			@QRule((val) => val >= 0, 'Min')
			@QRule((val) => val <= 100, 'Max')
			value!: number;
		}

		new Score();

		const fields: string[] = Reflect.getMetadata(
			QRULE_FIELDS_KEY,
			Score.prototype
		);
		const entries = fields.filter((field) => field === 'value');
		expect(entries).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// WeakSet guard: no duplicate registration across instances
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: WeakSet guard prevents duplicates', () => {
	test('rule is registered exactly once even when many instances are created', () => {
		class Ticket {
			@QRule((val) => val > 0, 'Must be positive')
			amount!: number;
		}

		// Create 10 instances — each triggers addInitializer, guard prevents duplication
		for (let idx = 0; idx < 10; idx++) new Ticket();

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Ticket.prototype,
			'amount'
		);
		expect(rules).toHaveLength(1);
	});

	test('rules on independent classes do not bleed into each other', () => {
		class ClassA {
			@QRule((val) => val.length > 0, 'A: required')
			name!: string;
		}

		class ClassB {
			@QRule((val) => val.length > 0, 'B: required')
			name!: string;
		}

		new ClassA();
		new ClassB();

		const rulesA: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			ClassA.prototype,
			'name'
		);
		const rulesB: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			ClassB.prototype,
			'name'
		);

		expect(rulesA).toHaveLength(1);
		expect(rulesA[0]?.message).toBe('A: required');
		expect(rulesB).toHaveLength(1);
		expect(rulesB[0]?.message).toBe('B: required');
	});
});

// ---------------------------------------------------------------------------
// Async predicate
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: async predicate', () => {
	test('async predicate is stored without being awaited at decoration time', () => {
		const asyncIsUnique = async (val: string) =>
			Promise.resolve(val.includes('@'));

		class Newsletter {
			@QRule(asyncIsUnique, 'Email must be unique')
			email!: string;
		}

		new Newsletter();

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Newsletter.prototype,
			'email'
		);
		expect(rules).toHaveLength(1);
		expect(rules[0]?.predicate as unknown).toBe(asyncIsUnique);
	});
});

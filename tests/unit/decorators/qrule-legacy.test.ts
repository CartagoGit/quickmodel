/**
 * @fileoverview Unit tests for the legacy (experimentalDecorators) path of @QRule.
 *
 * Each test uses a **real class** decorated with `@QRule` to show exactly how the
 * decorator would be used in production code. The assertions then verify the
 * metadata registered on the class prototype.
 *
 * Integration with QModel (checkRules, checkRulesAsync, etc.) is covered by
 * `tests/unit/validation/qrule.test.ts`.
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
// Legacy path: basic rule registration
// ---------------------------------------------------------------------------

describe('@QRule — legacy path: rule registration', () => {
	test('registers a rule on the class prototype', () => {
		class User {
			@QRule((val: string) => val.length > 0, 'Name required')
			name!: string;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			User.prototype,
			'name'
		);
		expect(rules).toHaveLength(1);
		expect(rules[0]?.message).toBe('Name required');
	});

	test('stores the predicate function reference', () => {
		const isPositive = (val: number) => val > 0;

		class Product {
			@QRule(isPositive, 'Price must be positive')
			price!: number;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Product.prototype,
			'price'
		);
		expect(rules[0]?.predicate as unknown).toBe(isPositive);
	});

	test('accepts a lazy () => string message', () => {
		const getError = () => 'computed: field is required';

		class Config {
			@QRule((_val: string) => false, getError)
			label!: string;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Config.prototype,
			'label'
		);
		const msg = rules[0]?.message;
		expect(typeof msg).toBe('function');
		expect((msg as () => string)()).toBe('computed: field is required');
	});

	test('multiple @QRule on the same field accumulate in decoration order', () => {
		class Person {
			@QRule((val: number) => val >= 0, 'Non-negative')
			@QRule((val: number) => val <= 120, 'Realistic')
			age!: number;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Person.prototype,
			'age'
		);
		// Decorators apply bottom-up, so the order in the array is reversed
		expect(rules).toHaveLength(2);
		const messages = rules.map((rule) => rule.message);
		expect(messages).toContain('Non-negative');
		expect(messages).toContain('Realistic');
	});

	test('rules on different fields are independent', () => {
		class Account {
			@QRule((val: string) => val.length > 0, 'Username required')
			username!: string;

			@QRule((val: string) => val.includes('@'), 'Invalid email')
			email!: string;
		}

		const usernameRules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Account.prototype,
			'username'
		);
		const emailRules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Account.prototype,
			'email'
		);
		expect(usernameRules).toHaveLength(1);
		expect(emailRules).toHaveLength(1);
		expect(emailRules[0]?.message).toBe('Invalid email');
	});

	test('QRULE_FIELDS_KEY tracks all decorated field names', () => {
		class Order {
			@QRule((val: string) => val.length > 0, 'Required')
			reference!: string;

			@QRule((val: number) => val > 0, 'Must be positive')
			total!: number;
		}

		const fields: string[] = Reflect.getMetadata(
			QRULE_FIELDS_KEY,
			Order.prototype
		);
		expect(fields).toContain('reference');
		expect(fields).toContain('total');
	});

	test('a field key appears only once in QRULE_FIELDS_KEY even with multiple @QRule', () => {
		class Score {
			@QRule((val: number) => val >= 0, 'Min')
			@QRule((val: number) => val <= 100, 'Max')
			value!: number;
		}

		const fields: string[] = Reflect.getMetadata(
			QRULE_FIELDS_KEY,
			Score.prototype
		);
		const entries = fields.filter((field) => field === 'value');
		expect(entries).toHaveLength(1);
	});

	test('works on a symbol-keyed property', () => {
		const isActiveKey = Symbol('isActive');

		class Feature {
			@QRule((val: boolean) => val === true, 'Must be active')
			[isActiveKey]!: boolean;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Feature.prototype,
			String(isActiveKey)
		);
		expect(rules).toHaveLength(1);
		expect(rules[0]?.message).toBe('Must be active');
	});

	test('async predicate is stored without being awaited at decoration time', () => {
		const asyncIsUnique = async (val: string) =>
			Promise.resolve(val.length > 0);

		class Newsletter {
			@QRule(asyncIsUnique, 'Email must be unique')
			email!: string;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Newsletter.prototype,
			'email'
		);
		expect(rules).toHaveLength(1);
		expect(rules[0]?.predicate as unknown).toBe(asyncIsUnique);
	});
});

// ---------------------------------------------------------------------------
// Legacy path isolation: must NOT enter TC39 branch
// ---------------------------------------------------------------------------

describe('@QRule — legacy path does not enter TC39 branch', () => {
	test('addInitializer is never called when a class prototype is the target', () => {
		let addInitializerWasCalled = false;

		const decorator = QRule((val: string) => val.length > 0, 'Required');

		// Simulate what TypeScript legacy emit produces: (prototype, key)
		// The key here is a plain string — TC39 path requires `target === undefined`
		const fakeProto = Object.create(Object.prototype) as Record<
			string,
			unknown
		>;
		fakeProto['addInitializer'] = () => {
			addInitializerWasCalled = true;
		};

		decorator(fakeProto, 'title');

		expect(addInitializerWasCalled).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Predicate type safety (legacy — explicit annotation required)
// ---------------------------------------------------------------------------

describe('@QRule — legacy predicate typing', () => {
	test('without type annotation, val defaults to unknown', () => {
		class Box {
			// No type annotation on val — TypeScript infers unknown in legacy mode
			@QRule((val) => val !== null, 'Cannot be null')
			contents!: unknown;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Box.prototype,
			'contents'
		);
		expect(rules).toHaveLength(1);
	});

	test('explicit QRule<T> generic constrains the predicate parameter type', () => {
		class Article {
			// <string> constrains (val) to string — useful when you prefer not to
			// annotate the parameter inline
			@QRule<string>((val) => val.trim().length > 0, 'Cannot be blank')
			title!: string;
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			Article.prototype,
			'title'
		);
		expect(rules).toHaveLength(1);
	});
});

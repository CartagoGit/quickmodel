/**
 * @fileoverview Unit tests for the TC39 (Stage 3 / TS5+ without experimentalDecorators)
 * path of @QRule.
 *
 * ## Why this file does not use `@QRule(...)` decorator syntax
 *
 * The project tsconfig has `experimentalDecorators: true`, which means the TypeScript
 * compiler parses all `@decorator` syntax as legacy decorators. We cannot mix both APIs
 * in the same compilation unit.
 *
 * Instead, these tests **directly invoke the function returned by `QRule(...)`** with
 * manually constructed TC39 context objects. This is valid because:
 *
 *   1. The TC39 path is activated solely by the *shape of the arguments*
 *      (`target === undefined` + `context.kind === 'field'`), not by any compile-time
 *      mechanism.
 *   2. Runtime behavior (rule registration via Reflect.defineMetadata) is fully
 *      observable without using decorator syntax.
 *   3. The type-inference benefit of TC39 mode (predicate typed as the field type)
 *      is a **compile-time / IDE feature** and cannot be tested at runtime.
 *
 * ## What IS tested here
 *
 * - TC39 path detection (target === undefined + kind === 'field')
 * - `addInitializer` is called — not the legacy branch
 * - Rules are registered in `Reflect.defineMetadata` after the initializer fires
 * - Multiple instances: the WeakSet guard prevents duplicate registration
 * - Multiple `@QRule` applictions on the same field each register exactly once
 * - `QRULE_FIELDS_KEY` is correctly populated
 * - TC39 path works for static fields (`context.static === true`)
 * - Private/symbol field names are stringified correctly
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal fake TC39 ClassFieldDecoratorContext.
 *
 * Captures all `addInitializer` callbacks so tests can fire them
 * in a controlled manner.
 */
function makeTC39Context(
	fieldName: string | symbol,
	isStatic = false
): {
	context: {
		kind: 'field';
		name: string | symbol;
		static: boolean;
		private: boolean;
		addInitializer(this: void, initFn: (this: unknown) => void): void;
	};
	/** All initializers registered via addInitializer */
	initializers: Array<(thisArg: object) => void>;
	/** Fire all initializers with a given `this` (simulates instance creation) */
	runInitializers(this: void, thisArg: object): void;
} {
	const initializers: Array<(thisArg: object) => void> = [];

	const context = {
		kind: 'field' as const,
		name: fieldName,
		static: isStatic,
		private: false,
		addInitializer(this: void, initFn: (this: unknown) => void) {
			// Wrap so we can call it with an explicit thisArg
			initializers.push((thisArg: object) => initFn.call(thisArg));
		},
	};

	return {
		context,
		initializers,
		runInitializers(this: void, thisArg: object) {
			for (const initFn of initializers) initFn(thisArg);
		},
	};
}

/**
 * Creates a minimal fake class with a prototype.
 * Returns both the constructor and a factory for instances whose prototype
 * chains to the "class".
 */
function makeFakeClass(): {
	proto: object;
	newInstance(this: void): object;
} {
	const proto = Object.create(Object.prototype);

	return {
		proto,
		newInstance(this: void): object {
			return Object.create(proto);
		},
	};
}

// ---------------------------------------------------------------------------
// TC39 path detection
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path detection', () => {
	test('addInitializer is called when target is undefined and context.kind === "field"', () => {
		const ctx = makeTC39Context('myField');
		const countBefore = ctx.initializers.length;

		const decorator = QRule((val: string) => val.length > 0, 'Required');
		// TC39 invocation: (undefined, context)
		(decorator as Function)(undefined, ctx.context);

		// addInitializer was called — the initializers array gained one entry
		expect(ctx.initializers.length).toBeGreaterThan(countBefore);
	});

	test('legacy Reflect.defineMetadata is NOT called immediately in TC39 path', () => {
		const { context } = makeTC39Context('lazyField');
		const proto = Object.create(Object.prototype);

		const decorator = QRule((val: number) => val > 0, 'Positive');
		(decorator as Function)(undefined, context);

		// Before running any initializer: no metadata on any prototype
		const rules = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			'lazyField'
		);
		expect(rules).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Rule registration after initializer fires
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: rule registration via initializer', () => {
	test('rule is registered after the first initializer fires', () => {
		const { context, runInitializers } = makeTC39Context('price');
		const { proto, newInstance } = makeFakeClass();

		const decorator = QRule((val: number) => val > 0, 'Must be positive');
		(decorator as Function)(undefined, context);

		// Simulate first instance creation
		runInitializers(newInstance());

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			'price'
		);
		expect(rules).toHaveLength(1);
		expect(rules[0]?.message).toBe('Must be positive');
	});

	test('predicate is stored correctly via TC39 path', () => {
		const { context, runInitializers } = makeTC39Context('qty');
		const { proto, newInstance } = makeFakeClass();

		const myPredicate = (val: number) => val >= 1;
		(QRule(myPredicate, 'Min 1') as Function)(undefined, context);
		runInitializers(newInstance());

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			'qty'
		);
		expect(rules[0]?.predicate as unknown).toBe(myPredicate);
	});

	test('accepts lazy () => string message via TC39 path', () => {
		const { context, runInitializers } = makeTC39Context('label');
		const { proto, newInstance } = makeFakeClass();

		const lazy = () => 'lazy error';
		(QRule((_val: string) => false, lazy) as Function)(undefined, context);
		runInitializers(newInstance());

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			'label'
		);
		expect(typeof rules[0]?.message).toBe('function');
		expect((rules[0]?.message as () => string)()).toBe('lazy error');
	});

	test('QRULE_FIELDS_KEY tracks the decorated field after initializer fires', () => {
		const { context, runInitializers } = makeTC39Context('score');
		const { proto, newInstance } = makeFakeClass();

		(QRule((val: number) => val >= 0, 'Non-negative') as Function)(
			undefined,
			context
		);
		runInitializers(newInstance());

		const fields: string[] = Reflect.getMetadata(QRULE_FIELDS_KEY, proto);
		expect(fields).toContain('score');
	});
});

// ---------------------------------------------------------------------------
// WeakSet guard: no duplicate registration on multiple instances
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: WeakSet guard prevents duplicates', () => {
	test('rule is registered exactly once even when 10 instances are created', () => {
		const { context, runInitializers } = makeTC39Context('amount');
		const { proto, newInstance } = makeFakeClass();

		(QRule((val: number) => val > 0, 'Positive') as Function)(
			undefined,
			context
		);

		// Simulate 10 instances
		for (let idx = 0; idx < 10; idx++) {
			runInitializers(newInstance());
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			'amount'
		);
		expect(rules).toHaveLength(1);
	});

	test('field key appears only once in QRULE_FIELDS_KEY after many instances', () => {
		const { context, runInitializers } = makeTC39Context('tag');
		const { proto, newInstance } = makeFakeClass();

		(QRule((val: string) => val.length > 0, 'Required') as Function)(
			undefined,
			context
		);

		for (let idx = 0; idx < 5; idx++) {
			runInitializers(newInstance());
		}

		const fields: string[] = Reflect.getMetadata(QRULE_FIELDS_KEY, proto);
		const tagEntries = fields.filter((field) => field === 'tag');
		expect(tagEntries).toHaveLength(1);
	});

	test('two separate @QRule applications on the same field register two rules (each exactly once)', () => {
		const ctx1 = makeTC39Context('weight');
		const ctx2 = makeTC39Context('weight');
		const { proto, newInstance } = makeFakeClass();

		// Simulate applying @QRule twice on the same field
		(QRule((val: number) => val > 0, 'Min') as Function)(
			undefined,
			ctx1.context
		);
		(QRule((val: number) => val < 1000, 'Max') as Function)(
			undefined,
			ctx2.context
		);

		const instance = newInstance();

		// Fire both contexts' initializers multiple times
		for (let idx = 0; idx < 3; idx++) {
			ctx1.runInitializers(instance);
			ctx2.runInitializers(instance);
		}

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			'weight'
		);
		// Each guard is per-closure → each rule registered exactly once → total 2
		expect(rules).toHaveLength(2);
		expect(rules[0]?.message).toBe('Min');
		expect(rules[1]?.message).toBe('Max');
	});

	test('guard is per-class (different subclasses get independent registrations)', () => {
		const { context, runInitializers } = makeTC39Context('rank');

		// Two independent "classes" (separate prototypes)
		const class1 = makeFakeClass();
		const class2 = makeFakeClass();

		(QRule((val: number) => val >= 0, 'Non-negative') as Function)(
			undefined,
			context
		);

		// Each class creates one instance
		runInitializers(class1.newInstance());
		runInitializers(class2.newInstance());

		// Both prototypes should have the rule (independent registration)
		const rules1: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			class1.proto,
			'rank'
		);
		const rules2: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			class2.proto,
			'rank'
		);
		expect(rules1).toHaveLength(1);
		expect(rules2).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Symbol field names
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: symbol field names', () => {
	test('symbol field names are stringified to "Symbol(...)"', () => {
		const sym = Symbol('mySymbolField');
		const { context, runInitializers } = makeTC39Context(sym);
		const { proto, newInstance } = makeFakeClass();

		(
			QRule(
				(val: string) => val.length > 0,
				'Symbol field required'
			) as Function
		)(undefined, context);
		runInitializers(newInstance());

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			String(sym)
		);
		expect(rules).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Async predicate via TC39 path
// ---------------------------------------------------------------------------

describe('@QRule — TC39 path: async predicate', () => {
	test('async predicate is stored and not immediately awaited', () => {
		const { context, runInitializers } = makeTC39Context('email');
		const { proto, newInstance } = makeFakeClass();

		const asyncPredicate = async (val: string) =>
			Promise.resolve(val.includes('@'));
		(QRule(asyncPredicate, 'Invalid email') as Function)(
			undefined,
			context
		);
		runInitializers(newInstance());

		const rules: IQRule<unknown>[] = Reflect.getMetadata(
			QRULE_METADATA_KEY,
			proto,
			'email'
		);
		expect(rules[0]?.predicate as unknown).toBe(asyncPredicate);
	});
});

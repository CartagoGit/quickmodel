/**
 * QuickModel Custom Test Matchers
 *
 * Compatible with Vitest and Bun:Test via `expect.extend()`.
 *
 * @see {@link QModel} — the model class whose instances are matched
 * @see {@link QRule} — the rule decorator evaluated by `toBeValidQModel` and `toHaveQRuleError`
 * @see {@link QField} — the field decorator evaluated by `toHaveQField`
 *
 * @example
 * ```typescript
 * // vitest.setup.ts or bun test setup file
 * import { expect } from 'vitest'; // or 'bun:test'
 * import { quickmodelMatchers } from 'quickmodel/matchers';
 *
 * expect.extend(quickmodelMatchers);
 * ```
 *
 * @module quickmodel/matchers
 */
import 'reflect-metadata';
import { QFIELD_METADATA_KEY } from '@/core/decorators/qfield.decorator';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { QModel } from '@/core/models/quick.model';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** @internal Result shape returned by every Vitest/Jest custom matcher function. */
interface IMatcherResult {
	pass: boolean;
	message: () => string;
}

// ---------------------------------------------------------------------------
// Helper: walk prototype chain to find @QField metadata
// ---------------------------------------------------------------------------

/**
 * Walks the prototype chain to check whether `@QField` metadata is registered for a property.
 * @internal
 * @param instance - Model instance to inspect
 * @param fieldName - Property name to look up
 * @returns `true` if any prototype in the chain has `@QField` metadata for `fieldName`
 */
function hasQFieldMeta(instance: object, fieldName: string | symbol): boolean {
	let proto = Object.getPrototypeOf(instance) as object | null;
	while (proto !== null && proto !== Object.prototype) {
		if (
			Reflect.getMetadata(QFIELD_METADATA_KEY, proto, fieldName) !==
			undefined
		) {
			return true;
		}
		proto = Object.getPrototypeOf(proto) as object | null;
	}
	return false;
}

// ---------------------------------------------------------------------------
// Matchers
// ---------------------------------------------------------------------------

/**
 * Asserts that a model passes all `@QRule` validations via `qCheckRules()`.
 *
 * Works with any class decorated with `@QRule` (QModel subclasses or plain classes).
 *
 * @see {@link QRule} — the decorator being evaluated
 * @see {@link qCheckRules} — the function used internally
 *
 * @example
 * expect(invalidDto).not.toBeValidQModel();
 * ```
 */
function toBeValidQModel(received: object): IMatcherResult {
	const result = qCheckRules(received);
	return {
		pass: result.valid,
		message: () =>
			result.valid
				? 'Expected model to have validation errors, but it passed all @QRule checks'
				: `Expected model to be valid, but got errors:\n${result.errors
						.map((err) => `  [${err.field}] ${err.message}`)
						.join('\n')}`,
	};
}

/**
 * Asserts that a specific field has a `@QRule` validation error.
 * Optionally assert the exact error message.
 *
 * @example
 * ```typescript
 * expect(dto).toHaveQRuleError('email');
 * expect(dto).toHaveQRuleError('email', 'Invalid email address');
 * expect(dto).not.toHaveQRuleError('username');
 * ```
 */
function toHaveQRuleError(
	received: object,
	field: string,
	message?: string
): IMatcherResult {
	const result = qCheckRules(received);
	const relevant = result.errors.filter((err) => err.field === field);
	const matched = message
		? relevant.some((err) => err.message === message)
		: relevant.length > 0;
	return {
		pass: matched,
		message: () =>
			matched
				? `Expected no @QRule error on field '${field}'${message ? ` with message '${message}'` : ''}`
				: `Expected @QRule error on field '${field}'${message ? ` with message '${message}'` : ''}, actual errors:\n  ${JSON.stringify(result.errors)}`,
	};
}

/**
 * Asserts that a property has been decorated with `@QField`.
 * Walks the entire prototype chain (inheritance-safe).
 *
 * @see {@link QField} — the decorator being checked
 *
 * @example
 * ```typescript
 * expect(dto).toHaveQField('email');
 * expect(dto).not.toHaveQField('internalField');
 * ```
 */
function toHaveQField(received: object, fieldName: string): IMatcherResult {
	const hasMeta = hasQFieldMeta(received, fieldName);
	return {
		pass: hasMeta,
		message: () =>
			hasMeta
				? `Expected field '${fieldName}' to NOT have a @QField decorator`
				: `Expected field '${fieldName}' to have a @QField decorator`,
	};
}

/**
 * Asserts deep equality between two models by comparing their `serialize()` outputs.
 * Also works with plain objects — comparison is always JSON-based.
 *
 * @example
 * ```typescript
 * expect(userA).toMatchQModel(userB);
 * expect(response).toMatchQModel(new UserModel(expectedData));
 * ```
 */
function toMatchQModel(received: object, expected: object): IMatcherResult {
	const receivedData =
		received instanceof QModel ? received.serialize() : received;
	const expectedData =
		expected instanceof QModel ? expected.serialize() : expected;
	const sortKeys = (obj: object): string =>
		JSON.stringify(obj, Object.keys(obj).sort());
	const pass = sortKeys(receivedData) === sortKeys(expectedData);
	return {
		pass,
		message: () =>
			pass
				? 'Expected QModel instances to differ after serialization'
				: `Expected models to match after serialization:\n  Received: ${JSON.stringify(receivedData, null, 2)}\n  Expected: ${JSON.stringify(expectedData, null, 2)}`,
	};
}

/**
 * Asserts that a `QModel` instance passes `hasIntegrity()`.
 * Fails if the received value is not a QModel instance.
 *
 * @example
 * ```typescript
 * expect(model).toBeIntact();
 * expect(corruptedModel).not.toBeIntact();
 * ```
 */
function toBeIntact(received: unknown): IMatcherResult {
	if (!(received instanceof QModel)) {
		return {
			pass: false,
			message: () =>
				`toBeIntact() requires a QModel instance, got ${typeof received}`,
		};
	}
	const pass = received.hasIntegrity();
	return {
		pass,
		message: () =>
			pass
				? 'Expected model to fail the integrity check (hasIntegrity())'
				: 'Expected model to pass the integrity check (hasIntegrity())',
	};
}

/**
 * Asserts that a specific field is dirty (has been mutated since creation / last reset).
 * Calls `model.isDirty(field)`. Fails if not a QModel instance.
 *
 * @example
 * ```typescript
 * model.score = 99;
 * expect(model).toHaveDirtyField('score');
 * expect(model).not.toHaveDirtyField('email'); // email was not mutated
 * ```
 */
function toHaveDirtyField(received: unknown, field: string): IMatcherResult {
	if (!(received instanceof QModel)) {
		return {
			pass: false,
			message: () =>
				`toHaveDirtyField() requires a QModel instance, got ${typeof received}`,
		};
	}
	const pass = received.isDirty(field);
	return {
		pass,
		message: () =>
			pass
				? `Expected field '${field}' to be clean (not dirty)`
				: `Expected field '${field}' to be dirty (isDirty('${field}') returned false)`,
	};
}

// ---------------------------------------------------------------------------
// Exported matchers object — pass to expect.extend()
// ---------------------------------------------------------------------------

/**
 * QuickModel custom matchers. Pass to `expect.extend()` in your test setup.
 *
 * Available matchers:
 * - `toBeValidQModel()` — all `@QRule` checks pass
 * - `toHaveQRuleError(field, message?)` — specific field has a rule error
 * - `toHaveQField(fieldName)` — property has `@QField` decorator
 * - `toMatchQModel(expected)` — deep equality via `serialize()`
 * - `toBeIntact()` — `hasIntegrity()` returns true
 * - `toHaveDirtyField(field)` — `isDirty(field)` returns true
 */
export const quickmodelMatchers = {
	toBeValidQModel,
	toHaveQRuleError,
	toHaveQField,
	toMatchQModel,
	toBeIntact,
	toHaveDirtyField,
} as const;

// ---------------------------------------------------------------------------
// TypeScript augmentation — Vitest (optional peer dependency)
// ---------------------------------------------------------------------------

// @ts-expect-error — vitest is an optional peer dependency; augmentation is a no-op if not installed
declare module 'vitest' {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface Assertion<_Res = any> {
		/** Asserts that all `@QRule` validations pass. */
		toBeValidQModel(): void;
		/** Asserts that `field` has a `@QRule` error, optionally matching `message`. */
		toHaveQRuleError(field: string, message?: string): void;
		/** Asserts that `fieldName` has a `@QField` decorator. */
		toHaveQField(fieldName: string): void;
		/** Deep equality by comparing `serialize()` outputs. */
		toMatchQModel(expected: object): void;
		/** Asserts `hasIntegrity()` returns true. QModel only. */
		toBeIntact(): void;
		/** Asserts `isDirty(field)` returns true. QModel only. */
		toHaveDirtyField(field: string): void;
	}
}

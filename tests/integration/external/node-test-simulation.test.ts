/**
 * Integration Test: QuickModel + Node:test (simulation)
 *
 * Node.js has a built-in test runner (`node:test`) since Node 18.
 * It does NOT have `expect.extend()` — instead it provides `assert.*` helpers
 * and a hook-less, describe-free API.
 *
 * `quickmodelMatchers` returns `{ pass, message() }` which maps directly to
 * Node's `assert.ok()` / `assert.fail()` pattern.
 *
 * This file:
 * 1. Implements `assertQModel` — a set of assert-style helpers wrapping the matchers.
 * 2. Validates those helpers with Bun's `expect()`.
 * 3. Demonstrates the Node:test usage pattern in comments.
 *
 * In a real Node:test project:
 * ```typescript
 * // test/helpers.ts
 * import { assertQModel } from 'quickmodel/node-matchers';
 *
 * // test/order.test.ts
 * import { describe, it } from 'node:test';
 * import { assertQModel } from './helpers';
 *
 * describe('Order DTO', () => {
 *   it('should be valid', () => assertQModel.isValid(new OrderDto({ ... })));
 * });
 * ```
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField } from '@/decorators';
import { quickmodelMatchers } from '@/matchers';

// ---------------------------------------------------------------------------
// assertQModel — Node:test / assert-style helpers
// ---------------------------------------------------------------------------

/**
 * Assert-style helpers for Node:test (and any assert-based test runner).
 * Compatible with `node:assert`, `chai.assert`, `power-assert`, etc.
 */
const assertQModel = {
	/** Asserts that all `@QRule` validations pass. */
	isValid(instance: object): void {
		const result = quickmodelMatchers.toBeValidQModel(instance);
		if (!result.pass) throw new AssertionError(result.message());
	},

	/** Asserts that NOT all `@QRule` validations pass (i.e., at least one error). */
	isInvalid(instance: object): void {
		const result = quickmodelMatchers.toBeValidQModel(instance);
		if (result.pass) throw new AssertionError(result.message());
	},

	/** Asserts that a field has a `@QRule` error, optionally matching a message. */
	hasRuleError(instance: object, field: string, message?: string): void {
		const result = quickmodelMatchers.toHaveQRuleError(
			instance,
			field,
			message
		);
		if (!result.pass) throw new AssertionError(result.message());
	},

	/** Asserts that a field does NOT have any `@QRule` errors. */
	noRuleError(instance: object, field: string): void {
		const result = quickmodelMatchers.toHaveQRuleError(instance, field);
		if (result.pass) throw new AssertionError(result.message());
	},

	/** Asserts that a property has a `@QField` decorator. */
	hasQField(instance: object, fieldName: string): void {
		const result = quickmodelMatchers.toHaveQField(instance, fieldName);
		if (!result.pass) throw new AssertionError(result.message());
	},

	/** Asserts deep equality by comparing `serialize()` outputs. */
	matches(received: object, expected: object): void {
		const result = quickmodelMatchers.toMatchQModel(received, expected);
		if (!result.pass) throw new AssertionError(result.message());
	},

	/** Asserts `hasIntegrity()` returns true. */
	isIntact(instance: object): void {
		const result = quickmodelMatchers.toBeIntact(instance);
		if (!result.pass) throw new AssertionError(result.message());
	},

	/** Asserts `isDirty(field)` returns true. */
	isDirty(instance: object, field: string): void {
		const result = quickmodelMatchers.toHaveDirtyField(instance, field);
		if (!result.pass) throw new AssertionError(result.message());
	},

	/** Asserts `isDirty(field)` returns false. */
	isClean(instance: object, field: string): void {
		const result = quickmodelMatchers.toHaveDirtyField(instance, field);
		if (result.pass) throw new AssertionError(result.message());
	},

	/** Alias for `isValid` — preferred `$q*` API in test descriptions. */
	$qIsValid(instance: object): void {
		const result = quickmodelMatchers.toBeValidQModel(instance);
		if (!result.pass) throw new AssertionError(result.message());
	},

	/** Alias for `isDirty` — preferred `$q*` API in test descriptions. */
	$qIsDirty(instance: object, field: string): void {
		const result = quickmodelMatchers.toHaveDirtyField(instance, field);
		if (!result.pass) throw new AssertionError(result.message());
	},
};

class AssertionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AssertionError';
	}
}

// ---------------------------------------------------------------------------
// Test models
// ---------------------------------------------------------------------------

interface IInvoiceDto {
	invoiceId: string;
	totalAmount: number;
	vatRate: number;
	issuedAt: Date;
}

@Quick(
	{
		invoiceId: 'string',
		totalAmount: 'number',
		vatRate: 'number',
		issuedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class InvoiceDto extends QModel<IInvoiceDto> {
	@QField({ widget: 'input', label: 'Invoice ID', required: true })
	@QRule(
		(val: string) => /^INV-\d{6}$/.test(val),
		'Invalid invoice ID format'
	)
	declare invoiceId: string;

	@QField({ widget: 'input', label: 'Total Amount', required: true })
	@QRule((val: number) => val >= 0, 'Total amount cannot be negative')
	@QRule((val: number) => val <= 10_000_000, 'Total amount exceeds maximum')
	declare totalAmount: number;

	@QField({ widget: 'input', label: 'VAT Rate' })
	@QRule(
		(val: number) => val >= 0 && val <= 100,
		'VAT rate must be between 0 and 100'
	)
	declare vatRate: number;

	declare issuedAt: Date;
}

function makeValidInvoice(): InvoiceDto {
	return new InvoiceDto({
		invoiceId: 'INV-000001',
		totalAmount: 1234.56,
		vatRate: 21,
		issuedAt: '2025-12-31T00:00:00Z',
	});
}

function makeInvalidInvoice(): InvoiceDto {
	return new InvoiceDto({
		invoiceId: 'WRONG', // bad format
		totalAmount: -100, // negative
		vatRate: 150, // > 100
		issuedAt: '2025-12-31T00:00:00Z',
	});
}

// ---------------------------------------------------------------------------
// assertQModel helper contract tests
// ---------------------------------------------------------------------------

describe('Node:test Integration: assertQModel helper API', () => {
	test('assertQModel exposes all expected methods', () => {
		const methods: Array<keyof typeof assertQModel> = [
			'isValid',
			'isInvalid',
			'hasRuleError',
			'noRuleError',
			'hasQField',
			'matches',
			'isIntact',
			'isDirty',
			'isClean',
		];
		for (const method of methods) {
			expect(typeof assertQModel[method]).toBe('function');
		}
	});
});

// ---------------------------------------------------------------------------
// Node:test workflow simulation
// ---------------------------------------------------------------------------

describe('Node:test Integration: assertQModel.$qIsValid()', () => {
	test('valid invoice does not throw', () => {
		expect(() => assertQModel.$qIsValid(makeValidInvoice())).not.toThrow();
	});

	test('invalid invoice throws AssertionError', () => {
		expect(() => assertQModel.$qIsValid(makeInvalidInvoice())).toThrow(
			AssertionError
		);
	});

	test('throws with descriptive message listing errors', () => {
		let message = '';
		try {
			assertQModel.$qIsValid(makeInvalidInvoice());
		} catch (err) {
			if (err instanceof AssertionError) message = err.message;
		}
		expect(message).toContain('invoiceId');
	});
});

describe('Node:test Integration: assertQModel.isInvalid()', () => {
	test('invalid invoice does not throw', () => {
		expect(() =>
			assertQModel.isInvalid(makeInvalidInvoice())
		).not.toThrow();
	});

	test('valid invoice throws', () => {
		expect(() => assertQModel.isInvalid(makeValidInvoice())).toThrow(
			AssertionError
		);
	});
});

describe('Node:test Integration: assertQModel.hasRuleError()', () => {
	let inv: InvoiceDto;

	beforeEach(() => {
		inv = makeInvalidInvoice();
	});

	test('detects invoice ID format error', () => {
		expect(() =>
			assertQModel.hasRuleError(
				inv,
				'invoiceId',
				'Invalid invoice ID format'
			)
		).not.toThrow();
	});

	test('detects negative total amount error', () => {
		expect(() =>
			assertQModel.hasRuleError(
				inv,
				'totalAmount',
				'Total amount cannot be negative'
			)
		).not.toThrow();
	});

	test('detects VAT rate out-of-range error', () => {
		expect(() =>
			assertQModel.hasRuleError(
				inv,
				'vatRate',
				'VAT rate must be between 0 and 100'
			)
		).not.toThrow();
	});
});

describe('Node:test Integration: assertQModel.noRuleError()', () => {
	test('valid invoice has no errors on any field', () => {
		const inv = makeValidInvoice();
		expect(() => assertQModel.noRuleError(inv, 'invoiceId')).not.toThrow();
		expect(() =>
			assertQModel.noRuleError(inv, 'totalAmount')
		).not.toThrow();
		expect(() => assertQModel.noRuleError(inv, 'vatRate')).not.toThrow();
	});

	test('throws when field actually has an error', () => {
		expect(() =>
			assertQModel.noRuleError(makeInvalidInvoice(), 'invoiceId')
		).toThrow(AssertionError);
	});
});

describe('Node:test Integration: assertQModel.hasQField()', () => {
	test('decorated fields pass', () => {
		const inv = makeValidInvoice();
		expect(() => assertQModel.hasQField(inv, 'invoiceId')).not.toThrow();
		expect(() => assertQModel.hasQField(inv, 'totalAmount')).not.toThrow();
		expect(() => assertQModel.hasQField(inv, 'vatRate')).not.toThrow();
	});

	test('non-decorated field throws', () => {
		expect(() =>
			assertQModel.hasQField(makeValidInvoice(), 'issuedAt')
		).toThrow(AssertionError);
	});
});

describe('Node:test Integration: assertQModel.matches()', () => {
	test('identical invoices match', () => {
		expect(() =>
			assertQModel.matches(makeValidInvoice(), makeValidInvoice())
		).not.toThrow();
	});

	test('invoices with different amounts throw', () => {
		const invA = makeValidInvoice();
		const invB = new InvoiceDto({
			invoiceId: 'INV-000001',
			totalAmount: 999,
			vatRate: 21,
			issuedAt: '2025-12-31T00:00:00Z',
		});
		expect(() => assertQModel.matches(invA, invB)).toThrow(AssertionError);
	});
});

describe('Node:test Integration: assertQModel.isIntact()', () => {
	test('new invoice is intact', () => {
		expect(() => assertQModel.isIntact(makeValidInvoice())).not.toThrow();
	});
});

describe('Node:test Integration: assertQModel.$qIsDirty() / isClean()', () => {
	test('fresh invoice has clean fields', () => {
		const inv = makeValidInvoice();
		expect(() => assertQModel.isClean(inv, 'totalAmount')).not.toThrow();
		expect(() => assertQModel.isClean(inv, 'vatRate')).not.toThrow();
	});

	test('mutated field is detected as dirty', () => {
		const inv = makeValidInvoice();
		inv.totalAmount = 9999;
		expect(() => assertQModel.$qIsDirty(inv, 'totalAmount')).not.toThrow();
	});

	test('only mutated field is dirty', () => {
		const inv = makeValidInvoice();
		inv.vatRate = 0;
		expect(() => assertQModel.$qIsDirty(inv, 'vatRate')).not.toThrow();
		expect(() => assertQModel.isClean(inv, 'totalAmount')).not.toThrow();
	});
});

describe('Node:test Integration: type coercion', () => {
	test('Date fields are proper Date instances', () => {
		const inv = makeValidInvoice();
		expect(inv.issuedAt).toBeInstanceOf(Date);
		expect(inv.issuedAt.getFullYear()).toBe(2025);
	});

	test('roundtrip: serialize() + re-create matches original', () => {
		const original = makeValidInvoice();
		const restored = new InvoiceDto(original.$qSerialize());
		expect(() => assertQModel.matches(original, restored)).not.toThrow();
	});
});

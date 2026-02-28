/**
 * Integration Test: QuickModel + Jest (simulation)
 *
 * Demonstrates that `quickmodelMatchers` is directly compatible with Jest's
 * `expect.extend()` API, because Jest uses the same `{ pass, message() }`
 * matcher contract as Vitest and Bun:test.
 *
 * Run environment: Bun (matches the Jest matcher interface exactly).
 *
 * In a real Jest project the setup is:
 * ```typescript
 * // jest.setup.ts
 * import { expect } from '@jest/globals';
 * import { quickmodelMatchers } from 'quickmodel/matchers';
 * expect.extend(quickmodelMatchers);
 * ```
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed } from '@/decorators';
import { quickmodelMatchers } from '@/matchers';

// Extend bun:test's expect (same call that users make in Jest)
expect.extend(
	quickmodelMatchers as unknown as Parameters<typeof expect.extend>[0]
);

// TS augmentation for this file
declare module 'bun:test' {
	// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
	interface Matchers<T = unknown> {
		toBeValidQModel(): void;
		toHaveQRuleError(field: string, message?: string): void;
		toHaveQField(fieldName: string): void;
		toMatchQModel(expected: object): void;
		toBeIntact(): void;
		toHaveDirtyField(field: string): void;
	}
}

// ---------------------------------------------------------------------------
// Test models
// ---------------------------------------------------------------------------

interface IOrderDto {
	orderId: string;
	amount: number;
	currency: string;
	createdAt: Date;
	tags: Set<string>;
}

@Quick(
	{
		orderId: 'string',
		amount: 'number',
		currency: 'string',
		createdAt: Date,
		tags: Set,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class OrderDto extends QModel<IOrderDto> {
	@QField({ widget: 'input', label: 'Amount', required: true })
	@QRule((val: number) => val > 0, 'Amount must be positive')
	@QRule((val: number) => val <= 1_000_000, 'Amount exceeds limit')
	declare amount: number;

	@QField({ widget: 'input', label: 'Currency', required: true })
	@QRule(
		(val: string) => /^[A-Z]{3}$/.test(val),
		'Currency must be a 3-letter ISO code'
	)
	declare currency: string;

	@QField({ widget: 'input', label: 'Order ID', required: true })
	@QRule((val: string) => val.length > 0, 'Order ID cannot be empty')
	declare orderId: string;

	declare createdAt: Date;
	declare tags: Set<string>;

	@QComputed()
	get summary(): string {
		return `${this.orderId}: ${this.amount} ${this.currency}`;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidOrder(): OrderDto {
	return new OrderDto({
		orderId: 'ORD-001',
		amount: 99.99,
		currency: 'USD',
		createdAt: '2025-01-15T10:00:00Z',
		tags: ['urgent', 'vip'],
	});
}

function makeInvalidOrder(): OrderDto {
	return new OrderDto({
		orderId: '',
		amount: -5,
		currency: 'us', // not ISO code
		createdAt: '2025-01-15T10:00:00Z',
		tags: [],
	});
}

// ---------------------------------------------------------------------------
// Jest-compatible expect.extend() API contract verification
// ---------------------------------------------------------------------------

describe('Jest Integration: expect.extend() API contract', () => {
	test('quickmodelMatchers entries return the Jest { pass, message } shape', () => {
		const validOrder = makeValidOrder();
		const invalidOrder = makeInvalidOrder();

		// Access internal matcher functions directly to verify the contract
		const passResult = quickmodelMatchers.toBeValidQModel(validOrder);
		expect(typeof passResult.pass).toBe('boolean');
		expect(typeof passResult.message).toBe('function');
		expect(typeof passResult.message()).toBe('string');

		const failResult = quickmodelMatchers.toBeValidQModel(invalidOrder);
		expect(typeof failResult.pass).toBe('boolean');
		expect(failResult.pass).toBe(false);
		expect(typeof failResult.message()).toBe('string');
	});

	test('toHaveQRuleError matcher returns correct contract shape', () => {
		const order = makeInvalidOrder();

		const result = quickmodelMatchers.toHaveQRuleError(order, 'amount');
		expect(typeof result.pass).toBe('boolean');
		expect(result.pass).toBe(true);
		expect(typeof result.message()).toBe('string');

		const withMessageResult = quickmodelMatchers.toHaveQRuleError(
			order,
			'amount',
			'Amount must be positive'
		);
		expect(withMessageResult.pass).toBe(true);
	});

	test('toHaveQField matcher returns correct contract shape', () => {
		const order = makeValidOrder();
		const result = quickmodelMatchers.toHaveQField(order, 'amount');
		expect(result.pass).toBe(true);
		expect(typeof result.message()).toBe('string');
	});
});

// ---------------------------------------------------------------------------
// toBeValidQModel — as Jest users would write it
// ---------------------------------------------------------------------------

describe('Jest Integration: toBeValidQModel()', () => {
	test('valid order passes all @QRule checks', () => {
		expect(makeValidOrder()).toBeValidQModel();
	});

	test('invalid order fails @QRule checks', () => {
		expect(makeInvalidOrder()).not.toBeValidQModel();
	});

	test('partial invalid order fails', () => {
		const order = new OrderDto({
			orderId: 'ORD-002',
			amount: -1, // invalid
			currency: 'EUR',
			createdAt: '2025-01-15T10:00:00Z',
			tags: [],
		});
		expect(order).not.toBeValidQModel();
	});
});

// ---------------------------------------------------------------------------
// toHaveQRuleError — as Jest users would write it
// ---------------------------------------------------------------------------

describe('Jest Integration: toHaveQRuleError(field, message?)', () => {
	let invalidOrder: OrderDto;

	beforeEach(() => {
		invalidOrder = makeInvalidOrder();
	});

	test('detects negative amount error', () => {
		expect(invalidOrder).toHaveQRuleError('amount');
	});

	test('detects specific error message for amount', () => {
		expect(invalidOrder).toHaveQRuleError(
			'amount',
			'Amount must be positive'
		);
	});

	test('detects invalid currency format', () => {
		expect(invalidOrder).toHaveQRuleError(
			'currency',
			'Currency must be a 3-letter ISO code'
		);
	});

	test('detects empty orderId', () => {
		expect(invalidOrder).toHaveQRuleError(
			'orderId',
			'Order ID cannot be empty'
		);
	});

	test('valid order has no errors on any field', () => {
		const order = makeValidOrder();
		expect(order).not.toHaveQRuleError('amount');
		expect(order).not.toHaveQRuleError('currency');
		expect(order).not.toHaveQRuleError('orderId');
	});
});

// ---------------------------------------------------------------------------
// toHaveQField — as Jest users would write it
// ---------------------------------------------------------------------------

describe('Jest Integration: toHaveQField(fieldName)', () => {
	test('decorated fields are detected', () => {
		const order = makeValidOrder();
		expect(order).toHaveQField('amount');
		expect(order).toHaveQField('currency');
		expect(order).toHaveQField('orderId');
	});

	test('non-decorated fields are not detected', () => {
		const order = makeValidOrder();
		expect(order).not.toHaveQField('createdAt');
		expect(order).not.toHaveQField('tags');
	});
});

// ---------------------------------------------------------------------------
// toMatchQModel — as Jest users would write it
// ---------------------------------------------------------------------------

describe('Jest Integration: toMatchQModel(expected)', () => {
	test('two orders with same data match', () => {
		const orderA = makeValidOrder();
		const orderB = makeValidOrder();
		expect(orderA).toMatchQModel(orderB);
	});

	test('orders with different amounts do not match', () => {
		const orderA = makeValidOrder();
		const orderB = new OrderDto({
			orderId: 'ORD-001',
			amount: 200,
			currency: 'USD',
			createdAt: '2025-01-15T10:00:00Z',
			tags: ['urgent', 'vip'],
		});
		expect(orderA).not.toMatchQModel(orderB);
	});
});

// ---------------------------------------------------------------------------
// toBeIntact — as Jest users would write it
// ---------------------------------------------------------------------------

describe('Jest Integration: toBeIntact()', () => {
	test('newly created model passes integrity check', () => {
		expect(makeValidOrder()).toBeIntact();
	});

	test('non-QModel value fails toBeIntact()', () => {
		// Matcher should return pass=false without throwing
		const result = quickmodelMatchers.toBeIntact({ amount: 10 });
		expect(result.pass).toBe(false);
		expect(result.message()).toContain('QModel instance');
	});
});

// ---------------------------------------------------------------------------
// toHaveDirtyField — as Jest users would write it
// ---------------------------------------------------------------------------

describe('Jest Integration: toHaveDirtyField(field)', () => {
	test('fresh model has no dirty fields', () => {
		const order = makeValidOrder();
		expect(order).not.toHaveDirtyField('amount');
		expect(order).not.toHaveDirtyField('currency');
	});

	test('mutated field is detected as dirty', () => {
		const order = makeValidOrder();
		order.amount = 500;
		expect(order).toHaveDirtyField('amount');
	});

	test('only mutated field is dirty — others remain clean', () => {
		const order = makeValidOrder();
		order.currency = 'EUR';
		expect(order).toHaveDirtyField('currency');
		expect(order).not.toHaveDirtyField('amount');
	});

	test('non-QModel value fails with descriptive message', () => {
		const result = quickmodelMatchers.toHaveDirtyField(
			{ amount: 10 },
			'amount'
		);
		expect(result.pass).toBe(false);
		expect(result.message()).toContain('QModel instance');
	});
});

// ---------------------------------------------------------------------------
// Type coercion works as expected before assertions (Jest workflow)
// ---------------------------------------------------------------------------

describe('Jest Integration: full workflow with type coercion', () => {
	test('Date fields are proper Date instances after construction', () => {
		const order = makeValidOrder();
		expect(order.createdAt).toBeInstanceOf(Date);
		expect(order.createdAt.getFullYear()).toBe(2025);
	});

	test('Set fields are proper Set instances after construction', () => {
		const order = makeValidOrder();
		expect(order.tags).toBeInstanceOf(Set);
		expect(order.tags.has('urgent')).toBe(true);
	});

	test('serialize() + re-create produces identical model', () => {
		const original = makeValidOrder();
		const serialized = original.serialize();
		const restored = new OrderDto(serialized);
		expect(original).toMatchQModel(restored);
	});

	test('@QComputed fields are available on the instance', () => {
		const order = makeValidOrder();
		expect(order.summary).toBe('ORD-001: 99.99 USD');
	});
});

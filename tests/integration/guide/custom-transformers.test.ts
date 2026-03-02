/**
 * Integration Test: Custom transformers
 * Covers: docs-vitepress/en/guide/custom-transformers.md
 *
 * Validates:
 * - Register transformer with QTransformerRegistry.register()
 * - Use it in @Quick()
 * - serialize produces correct output
 * - Reconstruct applies the transformer inverse (deserialize)
 * - Deregister does not break instances already created
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QTransformerRegistry, QBaseTransformer } from '@/advanced';
import type { IQTransformer } from '@/types';

// ── Custom type and transformer ───────────────────────────────────────────────

class Money {
	constructor(
		public readonly amount: number,
		public readonly currency: string
	) {}
}

class MoneyTransformer extends QBaseTransformer<string, Money> {
	deserialize(value: string | null | undefined): Money | null {
		if (!value) return null;
		const parts = value.split(':');
		const amountStr = parts[0];
		const currencyStr = parts[1];
		if (!amountStr || !currencyStr) return null;
		return new Money(Number(amountStr), currencyStr);
	}

	serialize(value: Money | null | undefined): string {
		if (!value) return '';
		return `${value.amount}:${value.currency}`;
	}
}

// ── Model using custom transformer ────────────────────────────────────────────

interface IInvoice {
	id: string;
	total: string;
	tax: string;
}

@Quick({ total: Money, tax: Money }, { unknownPropertyPolicy: 'keep' })
class InvoiceModel extends QModel<IInvoice> {
	declare id: string;
	declare total: Money;
	declare tax: Money;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: custom transformers (guide/custom-transformers.md)', () => {
	// Save registry state before each test and restore after
	let registrySnapshot: Map<string, IQTransformer<unknown, unknown>>;

	beforeEach(() => {
		registrySnapshot = QTransformerRegistry.snapshot();
	});

	afterEach(() => {
		QTransformerRegistry.restore(registrySnapshot);
	});

	test('registers transformer and deserializes correctly', () => {
		QTransformerRegistry.register(Money, new MoneyTransformer());

		const invoice = new InvoiceModel({
			id: 'inv-001',
			total: '999:USD',
			tax: '100:USD',
		} as unknown as IInvoice); // @quickmodel-rule-ignore: no-as-unknown

		expect(invoice.total).toBeInstanceOf(Money);
		expect(invoice.total.amount).toBe(999);
		expect(invoice.total.currency).toBe('USD');
	});

	test('serialize produces string output from Money instances', () => {
		QTransformerRegistry.register(Money, new MoneyTransformer());

		const invoice = new InvoiceModel({
			id: 'inv-002',
			total: '500:EUR',
			tax: '50:EUR',
		} as unknown as IInvoice); // @quickmodel-rule-ignore: no-as-unknown

		const output = invoice.$qSerialize();

		expect(output).toHaveProperty('total', '500:EUR');
		expect(output).toHaveProperty('tax', '50:EUR');
	});

	test('reconstruct (roundtrip) applies deserialize again', () => {
		QTransformerRegistry.register(Money, new MoneyTransformer());

		const original = new InvoiceModel({
			id: 'inv-003',
			total: '200:GBP',
			tax: '20:GBP',
		} as unknown as IInvoice); // @quickmodel-rule-ignore: no-as-unknown

		const serialized = original.$qSerialize();
		const restored = new InvoiceModel(serialized as unknown as IInvoice); // @quickmodel-rule-ignore: no-as-unknown

		expect(restored.total).toBeInstanceOf(Money);
		expect(restored.total.amount).toBe(200);
		expect(restored.total.currency).toBe('GBP');
	});

	test('deregister: instances created before deregister remain valid', () => {
		QTransformerRegistry.register(Money, new MoneyTransformer());

		const invoice = new InvoiceModel({
			id: 'inv-004',
			total: '100:CHF',
			tax: '10:CHF',
		} as unknown as IInvoice); // @quickmodel-rule-ignore: no-as-unknown

		// Restore registry to snapshot (removes Money transformer)
		QTransformerRegistry.restore(registrySnapshot);

		// The already-created instance still holds the correct Money values
		expect(invoice.total).toBeInstanceOf(Money);
		expect(invoice.total.amount).toBe(100);
	});
});

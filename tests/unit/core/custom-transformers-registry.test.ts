import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QTransformerRegistry } from '@/core/registry/transformer.registry';
import { IQTransformer } from '@/core/interfaces/transformer.interface';

// --- Setup: Custom Type & Transformer ---

class Money {
	public amount: number;
	public currency: string;

	constructor(amountOrData: unknown, currency?: string) {
		if (typeof amountOrData === 'object' && amountOrData !== null) {
			const data = amountOrData as { amount: number; currency: string };
			this.amount = data.amount;
			this.currency = data.currency;
		} else {
			this.amount = amountOrData as number;
			this.currency = currency || 'USD';
		}
	}

	toString() {
		return `${this.amount} ${this.currency}`;
	}
}

interface IMoneyJSON {
	amount: number;
	currency: string;
}

class MoneyTransformer implements IQTransformer<Money, IMoneyJSON> {
	deserialize(value: IMoneyJSON): Money {
		return new Money(value.amount, value.currency + '_TRANSFORMED');
	}

	serialize(value: Money): IMoneyJSON {
		return {
			amount: value.amount,
			currency: value.currency,
		};
	}
}

// --- Setup: Model using Custom Type ---

interface IProduct {
	name: string;
	price: IMoneyJSON;
}

@Quick(
	{
		price: Money, // Use the class as key
	},
	{ unknownPropertyPolicy: 'keep' }
)
class Product extends QModel<IProduct> {
	declare name: string;
	declare price: Money;
}

describe('Feature: Custom Transformers via Registry', () => {
	beforeEach(() => {
		// Clear registry to ensure test isolation
		QTransformerRegistry.clear();
	});

	test('should use Nested Model logic if not registered (default behavior)', () => {
		const data = {
			name: 'Laptop',
			price: { amount: 1000, currency: 'USD' },
		};

		// When not registered, QuickModel treats Money as a Nested Model (instantiates via Object.create)
		// It populates properties directly.
		// It does NOT run the transformer logic (which adds _TRANSFORMED)
		const product = new Product(data);

		expect(product.price).toBeInstanceOf(Money);
		expect(product.price.currency).toBe('USD'); // Default value
	});

	test('should use Custom Transformer when registered', () => {
		// Register the transformer
		QTransformerRegistry.register(Money, new MoneyTransformer());

		const data = {
			name: 'Laptop',
			price: { amount: 1000, currency: 'USD' },
		};

		const product = new Product(data);

		// Deserialization check
		expect(product.price).toBeInstanceOf(Money);
		expect(product.price.currency).toBe('USD_TRANSFORMED'); // Modified by transformer

		// Serialization check
		const json = product.toJSON();
		expect(json.price).toEqual({
			amount: 1000,
			currency: 'USD_TRANSFORMED',
		});
		expect(json.name).toBe('Laptop');
	});

	test('should override default transformer if registered (Date override)', () => {
		// Example: Override Date transformer to always return year 2000
		class FixedDateTransformer implements IQTransformer<string, Date> {
			deserialize(_value: string): Date {
				return new Date('2000-01-01T00:00:00.000Z');
			}
			serialize(_value: Date): string {
				return '2000-01-01T00:00:00.000Z';
			}
		}

		// Register override for Date. Both 'date' string and Date constructor should work.
		// We use Date constructor to match what user would likely do.
		QTransformerRegistry.register(Date, new FixedDateTransformer());

		@Quick({ date: Date }, { unknownPropertyPolicy: 'keep' })
		class Event extends QModel<{ date: string }> {
			declare date: Date;
		}

		const event = new Event({ date: '2023-12-25T10:00:00.000Z' });

		expect(event.date.toISOString()).toBe('2000-01-01T00:00:00.000Z');

		// Cleanup
		QTransformerRegistry.clear();
	});
});

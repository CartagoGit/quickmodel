import { describe, test, expect, beforeAll } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QTransformerRegistry } from '@/advanced';
import type { IQTransformer } from '@/types';

// 1. Define tu clase (NO necesita extender nada)
class Money {
	constructor(
		public amount: number,
		public currency: string
	) {}

	toString() {
		return `${this.amount} ${this.currency}`;
	}
}

// 2. Define la interfaz JSON que esperas (opcional pero recomendado)
interface IMoneyJSON {
	amount: number;
	currency: string;
}

// 3. Crea el transformador
class MoneyTransformer implements IQTransformer<IMoneyJSON, Money> {
	// De JSON a Clase
	deserialize(value: IMoneyJSON | null | undefined): Money | null {
		if (!value) return null;
		return new Money(value.amount, value.currency);
	}

	// De Clase a JSON
	serialize(value: Money): IMoneyJSON {
		return {
			amount: value.amount,
			currency: value.currency,
		};
	}
}

// 4. Regístralo (globalmente)
// Aseguramos que se registra antes de los tests
beforeAll(() => {
	QTransformerRegistry.register(Money, new MoneyTransformer());
});

// 5. Úsalo en tus modelos
interface IProduct {
	id: string;
	name: string;
	price: IMoneyJSON;
}

@Quick({ price: Money })
class Product extends QModel<IProduct> {
	declare id: string;
	declare name: string;
	declare price: Money;
}

describe('Custom Transformer Type Safety', () => {
	test('Should handle custom Money class without type errors', () => {
		// 6. Pruébalo
		const product = new Product({
			id: '1',
			name: 'Laptop',
			price: { amount: 999.99, currency: 'USD' },
		}); // cast as any because constructor expects IProduct or partial, but price in IProduct is IMoneyJSON.
		// Wait, QModel constructor expects Partial<IProduct>. price is IMoneyJSON.
		// The input { amount: 999.99, currency: 'USD' } matches IMoneyJSON.

		// Let's refine the test input (commented out as previously unused)
		/*
		const input = {
			id: '1',
			name: 'Laptop',
			price: { amount: 999.99, currency: 'USD' },
		};
		*/

		// The following line was incorrect and unused:
		// const prod = QModel.create(Product, input);

		expect(product.price).toBeInstanceOf(Money);
		expect(product.price.toString()).toBe('999.99 USD');

		// Use serialize() to get the object structure, not toJSON() which returns a string
		const json = product.$qm.serialize();
		expect(json.price).toEqual({ amount: 999.99, currency: 'USD' });
	});
});

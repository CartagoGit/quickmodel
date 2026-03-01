import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('E2E: E-Commerce Order Flow', () => {
	// Domain Models
	@Quick(
		{
			createdAt: Date,
			updatedAt: Date,
		},
		{ unknownPropertyPolicy: 'keep' }
	)
	class BaseEntity extends QModel<any> {
		declare id: string;
		declare createdAt: Date;
		declare updatedAt: Date;
	}

	@Quick(
		{
			price: BigInt,
			tags: Set,
		},
		{ unknownPropertyPolicy: 'keep' }
	)
	class Product extends BaseEntity {
		declare name: string;
		declare price: bigint;
		declare tags: Set<string>;
		declare sku: string;
	}

	@Quick(
		{
			product: Product,
			unitPrice: BigInt,
			total: BigInt,
		},
		{ unknownPropertyPolicy: 'keep' }
	)
	class OrderItem extends QModel<any> {
		declare product: Product;
		declare quantity: number;
		declare unitPrice: bigint;
		declare total: bigint;
	}

	@Quick(
		{
			items: [OrderItem],
			totalAmount: BigInt,
			shippingDate: Date,
			metadata: Map,
		},
		{ unknownPropertyPolicy: 'keep' }
	)
	class Order extends BaseEntity {
		declare customerId: string;
		declare items: OrderItem[];
		declare status: 'pending' | 'shipped' | 'delivered';
		declare totalAmount: bigint;
		declare shippingDate: Date;
		declare metadata: Map<string, any>;

		// Business Logic
		calculateTotal() {
			this.totalAmount = this.items.reduce((acc, item) => {
				// Recalculate item total first
				item.total = item.unitPrice * BigInt(item.quantity);
				return acc + item.total;
			}, 0n);
		}

		addItem(product: Product, quantity: number) {
			const item = OrderItem.create({
				product,
				quantity,
				unitPrice: product.price,
				total: product.price * BigInt(quantity),
			});

			this.items = [...(this.items || []), item];
			this.calculateTotal();
		}
	}

	it('should handle a complete order lifecycle', () => {
		// 1. Setup Products (Backend Data Simulation)
		const productData = {
			id: 'prod_1',
			name: 'Gaming Laptop',
			price: '150000', // encoded as string for transport
			tags: ['electronics', 'gaming'],
			sku: 'GAM-001',
			createdAt: '2025-01-01T10:00:00Z',
			updatedAt: '2025-01-01T10:00:00Z',
		};

		const laptop = Product.create(productData);

		expect(laptop.price).toBe(150000n);
		expect(laptop.tags).toBeInstanceOf(Set);
		expect(laptop.tags.has('gaming')).toBe(true);

		// 2. Create Order
		const order = Order.create({
			id: 'ord_1',
			customerId: 'cust_1',
			status: 'pending',
			items: [], // Start empty
			totalAmount: '0',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			shippingDate: new Date(Date.now() + 86400000).toISOString(),
			metadata: [
				['source', 'web'],
				['campaign', 'winter_sale'],
			],
		});

		// 3. Add Item to Order
		order.addItem(laptop, 2);

		expect(order.items.length).toBe(1);
		expect(order.items[0]?.product.name).toBe('Gaming Laptop');
		expect(order.totalAmount).toBe(300000n);
		expect(order.metadata.get('source')).toBe('web');

		// 4. Serialize for API (toInterface)
		const payload = order.$qToInterface();

		expect(typeof payload.totalAmount).toBe('string');
		expect(payload.totalAmount).toBe('300000');
		expect(Array.isArray(payload.metadata)).toBe(true);
		expect(payload.items[0].product.tags).toBeInstanceOf(Array);

		// 5. Simulate API Roundtrip (Deserialize)
		const restoredOrder = Order.create(payload);

		expect(restoredOrder.totalAmount).toBe(300000n);
		expect(restoredOrder.items[0]?.product).toBeInstanceOf(Product);
		expect(restoredOrder.items[0]?.unitPrice).toBe(150000n);
		expect(restoredOrder.shippingDate).toBeInstanceOf(Date);
	});
});

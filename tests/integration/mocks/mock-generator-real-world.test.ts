/**
 * Integration Test: Mock Generator - Real-World Scenarios
 * 
 * Tests mock generation for complete real-world models
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '../../../src';

describe('Integration: Mock Generator - Real World', () => {
	// Complete E-Commerce scenario
	interface IAddress {
		street: string;
		city: string;
		state: string;
		zipCode: string;
		country: string;
	}

	@Quick({})
	class Address extends QModel<IAddress> {
		street!: string;
		city!: string;
		state!: string;
		zipCode!: string;
		country!: string;
	}

	interface IOrderItem {
		productId: string;
		name: string;
		quantity: number;
		price: string; // BigInt cents
	}

	interface IOrderItemTransform {
		price: bigint;
	}

	@Quick({
		price: BigInt,
	})
	class OrderItem extends QModel<IOrderItem> implements QInterface<IOrderItem, IOrderItemTransform> {
		productId!: string;
		name!: string;
		quantity!: number;
		price!: bigint;

		getSubtotal(): bigint {
			return this.price * BigInt(this.quantity);
		}
	}

	interface IOrder {
		id: string;
		userId: string;
		items: IOrderItem[];
		shippingAddress: IAddress;
		billingAddress: IAddress;
		status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
		total: string; // BigInt
		createdAt: string;
		shippedAt: string | null;
		deliveredAt: string | null;
		metadata: {
			paymentMethod: string;
			trackingNumber: string | null;
			notes: string[];
		};
	}

	interface IOrderTransform {
		items: OrderItem[];
		shippingAddress: Address;
		billingAddress: Address;
		total: bigint;
		createdAt: Date;
		shippedAt: Date | null;
		deliveredAt: Date | null;
	}

	@Quick({
		items: OrderItem,
		shippingAddress: Address,
		billingAddress: Address,
		total: BigInt,
		createdAt: Date,
		shippedAt: Date,
		deliveredAt: Date,
	})
	class Order extends QModel<IOrder> implements QInterface<IOrder, IOrderTransform> {
		id!: string;
		userId!: string;
		items!: OrderItem[];
		shippingAddress!: Address;
		billingAddress!: Address;
		status!: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
		total!: bigint;
		createdAt!: Date;
		shippedAt!: Date | null;
		deliveredAt!: Date | null;
		metadata!: {
			paymentMethod: string;
			trackingNumber: string | null;
			notes: string[];
		};

		getItemCount(): number {
			return this.items.reduce((sum, item) => sum + item.quantity, 0);
		}

		getTotalAmount(): bigint {
			return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0n);
		}
	}

	test('should generate complete order mock with all nested structures', () => {
		const mock = Order.mock().random();

		// Check main instance
		expect(mock).toBeInstanceOf(Order);
		expect(typeof mock.id).toBe('string');
		expect(typeof mock.userId).toBe('string');

		// Check nested arrays
		expect(Array.isArray(mock.items)).toBe(true);
		expect(mock.items.length).toBeGreaterThan(0);
		mock.items.forEach(item => {
			expect(item).toBeInstanceOf(OrderItem);
			expect(typeof item.price).toBe('bigint');
		});

		// Check nested models
		expect(mock.shippingAddress).toBeInstanceOf(Address);
		expect(mock.billingAddress).toBeInstanceOf(Address);
		expect(typeof mock.shippingAddress.city).toBe('string');

		// Check enums/unions
		expect(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).toContain(mock.status);

		// Check transformed types
		expect(typeof mock.total).toBe('bigint');
		expect(mock.createdAt).toBeInstanceOf(Date);

		// Check nullable fields
		expect(mock.shippedAt === null || mock.shippedAt instanceof Date).toBe(true);
		expect(mock.deliveredAt === null || mock.deliveredAt instanceof Date).toBe(true);

		// Check nested plain objects
		expect(typeof mock.metadata).toBe('object');
		expect(typeof mock.metadata.paymentMethod).toBe('string');
		expect(Array.isArray(mock.metadata.notes)).toBe(true);
	});

	test('should allow complex overrides in real-world scenario', () => {
		const customAddress = Address.mock().random({
			city: 'New York',
			state: 'NY',
			country: 'USA',
		});

		const customItems = [
			OrderItem.mock().random({ name: 'Laptop', quantity: 1, price: '99999' }).serialize(),
			OrderItem.mock().random({ name: 'Mouse', quantity: 2, price: '2999' }).serialize(),
		];

		const mock = Order.mock().random({
			status: 'shipped',
			shippingAddress: customAddress.serialize(),
			items: customItems,
			metadata: {
				paymentMethod: 'credit-card',
				trackingNumber: 'TRACK123',
				notes: ['Handle with care', 'Fragile'],
			},
		});

		expect(mock.status).toBe('shipped');
		expect(mock.shippingAddress.city).toBe('New York');
		expect(mock.items).toHaveLength(2);
		expect(mock.items[0]!.name).toBe('Laptop');
		expect(mock.items[1]!.name).toBe('Mouse');
		expect(mock.metadata.trackingNumber).toBe('TRACK123');
		expect(mock.metadata.notes).toEqual(['Handle with care', 'Fragile']);
	});

	test('should work with custom methods on mocked data', () => {
		const mock = Order.mock().random({
			items: [
				OrderItem.mock().random({ quantity: 2, price: '1000' }).serialize(),
				OrderItem.mock().random({ quantity: 3, price: '2000' }).serialize(),
			],
		});

		expect(mock.getItemCount()).toBe(5);
		expect(mock.getTotalAmount()).toBe(8000n); // (2*1000) + (3*2000)
	});

	test('should generate array of complete orders', () => {
		const mocks = Order.mock().array(5);

		expect(mocks).toHaveLength(5);
		mocks.forEach((mock, index) => {
			expect(mock).toBeInstanceOf(Order);
			expect(mock.items.length).toBeGreaterThan(0);
			expect(mock.shippingAddress).toBeInstanceOf(Address);
			expect(mock.billingAddress).toBeInstanceOf(Address);
		});
	});

	test('should generate array with custom indexed data', () => {
		const mocks = Order.mock().array(3, 'random', (i) => ({
			id: `ORDER-${i}`,
			status: i === 0 ? 'pending' : i === 1 ? 'processing' : 'shipped',
		}));

		expect(mocks[0]!.id).toBe('ORDER-0');
		expect(mocks[0]!.status).toBe('pending');
		expect(mocks[1]!.id).toBe('ORDER-1');
		expect(mocks[1]!.status).toBe('processing');
		expect(mocks[2]!.id).toBe('ORDER-2');
		expect(mocks[2]!.status).toBe('shipped');
	});

	test('should serialize and deserialize mocked data correctly', () => {
		const mock = Order.mock().random();
		const json = mock.toJSON();
		const deserialized = Order.fromJSON(json);

		expect(deserialized).toBeInstanceOf(Order);
		expect(deserialized.id).toBe(mock.id);
		expect(deserialized.items.length).toBe(mock.items.length);
		expect(deserialized.shippingAddress.city).toBe(mock.shippingAddress.city);
		expect(deserialized.total).toBe(mock.total);
		expect(deserialized.createdAt.getTime()).toBe(mock.createdAt.getTime());
	});
});

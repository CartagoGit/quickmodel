/**
 * System Test: E-Commerce Shopping Cart
 * 
 * Tests a complete e-commerce cart system with products, orders,
 * and payment processing workflow
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, type QInterface } from '../../../src';

describe('System: E-Commerce Cart', () => {
	// Models
	interface IProduct {
		id: string;
		name: string;
		price: string; // BigInt as string (cents)
		description: string;
		stock: number;
		createdAt: string;
	}

	interface IProductTransform {
		price: bigint;
		createdAt: Date;
	}

	interface ICartItem {
		product: IProduct;
		quantity: number;
		addedAt: string;
	}

	interface ICartItemTransform {
		product: Product;
		addedAt: Date;
	}

	interface ICart {
		id: string;
		userId: string;
		items: ICartItem[];
		createdAt: string;
		updatedAt: string;
	}

	interface ICartTransform {
		items: CartItem[];
		createdAt: Date;
		updatedAt: Date;
	}

	interface IOrder {
		id: string;
		userId: string;
		items: ICartItem[];
		total: string; // BigInt
		status: 'pending' | 'paid' | 'shipped' | 'delivered';
		createdAt: string;
		paidAt: string | null;
	}

	interface IOrderTransform {
		items: CartItem[];
		total: bigint;
		createdAt: Date;
		paidAt: Date | null;
	}

	@Quick({
		price: BigInt,
		createdAt: Date,
	})
	class Product extends QModel<IProduct> implements QInterface<IProduct, IProductTransform> {
		id!: string;
		name!: string;
		price!: bigint;
		description!: string;
		stock!: number;
		createdAt!: Date;

		getPriceInDollars(): string {
			return `$${(Number(this.price) / 100).toFixed(2)}`;
		}

		isInStock(): boolean {
			return this.stock > 0;
		}
	}

	@Quick({
		'product.price': BigInt,
		'product.createdAt': Date,
		addedAt: Date,
	})
	class CartItem extends QModel<ICartItem> implements QInterface<ICartItem, ICartItemTransform> {
		product!: Product;
		quantity!: number;
		addedAt!: Date;

		getSubtotal(): bigint {
			return this.product.price * BigInt(this.quantity);
		}
	}

	@Quick({
		items: CartItem,
		createdAt: Date,
		updatedAt: Date,
	})
	class Cart extends QModel<ICart> implements QInterface<ICart, ICartTransform> {
		id!: string;
		userId!: string;
		items!: CartItem[];
		createdAt!: Date;
		updatedAt!: Date;

		getTotal(): bigint {
			return this.items.reduce(
				(sum, item) => sum + item.getSubtotal(),
				0n
			);
		}

		getTotalInDollars(): string {
			return `$${(Number(this.getTotal()) / 100).toFixed(2)}`;
		}

		getItemCount(): number {
			return this.items.reduce((sum, item) => sum + item.quantity, 0);
		}
	}

	@Quick({
		items: CartItem,
		total: BigInt,
		createdAt: Date,
		paidAt: Date,
	})
	class Order extends QModel<IOrder> implements QInterface<IOrder, IOrderTransform> {
		id!: string;
		userId!: string;
		items!: CartItem[];
		total!: bigint;
		status!: 'pending' | 'paid' | 'shipped' | 'delivered';
		createdAt!: Date;
		paidAt!: Date | null;
	}

	test('Complete shopping workflow: browse → cart → checkout → order', () => {
		// STEP 1: Create product catalog
		const laptop = new Product({
			id: 'prod-1',
			name: 'Gaming Laptop',
			price: '149999', // $1,499.99
			description: 'High-performance gaming laptop',
			stock: 5,
			createdAt: new Date().toISOString(),
		});

		const mouse = new Product({
			id: 'prod-2',
			name: 'Wireless Mouse',
			price: '2999', // $29.99
			description: 'Ergonomic wireless mouse',
			stock: 50,
			createdAt: new Date().toISOString(),
		});

		expect(laptop.price).toBe(149999n);
		expect(laptop.getPriceInDollars()).toBe('$1499.99');
		expect(laptop.isInStock()).toBe(true);

		// STEP 2: User adds items to cart
		const cart = new Cart({
			id: 'cart-1',
			userId: 'user-123',
			items: [
				{
					product: laptop.toInterface(),
					quantity: 1,
					addedAt: new Date().toISOString(),
				},
				{
					product: mouse.toInterface(),
					quantity: 2,
					addedAt: new Date().toISOString(),
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		// STEP 3: Verify cart calculations
		expect(cart.items.length).toBe(2);
		expect(cart.items[0].product).toBeInstanceOf(Product);
		expect(cart.items[0].product.price).toBe(149999n);
		expect(cart.items[0].getSubtotal()).toBe(149999n);
		expect(cart.items[1].getSubtotal()).toBe(5998n); // 2 * 2999

		const total = cart.getTotal();
		expect(total).toBe(155997n); // 149999 + 5998
		expect(cart.getTotalInDollars()).toBe('$1559.97');
		expect(cart.getItemCount()).toBe(3);

		// STEP 4: Serialize cart for session storage
		const cartJson = cart.toJSON();
		expect(typeof cartJson).toBe('string');

		// STEP 5: Retrieve cart from storage
		const retrievedCart = Cart.fromJSON(cartJson);
		expect(retrievedCart.getTotal()).toBe(total);
		expect(retrievedCart.items[0].product).toBeInstanceOf(Product);

		// STEP 6: Checkout - convert cart to order
		const order = new Order({
			id: crypto.randomUUID(),
			userId: cart.userId,
			items: cart.items.map((item) => item.toInterface()),
			total: cart.getTotal().toString(),
			status: 'pending',
			createdAt: new Date().toISOString(),
			paidAt: null,
		});

		expect(order.total).toBe(155997n);
		expect(order.status).toBe('pending');
		expect(order.paidAt).toBeNull();

		// STEP 7: Process payment
		order.status = 'paid';
		order.paidAt = new Date();

		const paidOrderJson = order.toJSON();
		const paidOrder = Order.fromJSON(paidOrderJson);

		expect(paidOrder.status).toBe('paid');
		expect(paidOrder.paidAt).toBeInstanceOf(Date);
		expect(paidOrder.total).toBe(155997n);

		// STEP 8: Verify order items are intact
		expect(paidOrder.items.length).toBe(2);
		expect(paidOrder.items[0].product.name).toBe('Gaming Laptop');
		expect(paidOrder.items[0].product.price).toBe(149999n);
	});

	test('Should handle empty cart', () => {
		const cart = new Cart({
			id: 'cart-empty',
			userId: 'user-456',
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		expect(cart.getTotal()).toBe(0n);
		expect(cart.getTotalInDollars()).toBe('$0.00');
		expect(cart.getItemCount()).toBe(0);
	});

	test('Should handle cart modifications', () => {
		const product = new Product({
			id: 'prod-1',
			name: 'Test Product',
			price: '1000',
			description: 'Test',
			stock: 10,
			createdAt: new Date().toISOString(),
		});

		const cart = new Cart({
			id: 'cart-1',
			userId: 'user-1',
			items: [
				{
					product: product.toInterface(),
					quantity: 2,
					addedAt: new Date().toISOString(),
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		expect(cart.getTotal()).toBe(2000n);

		// Simulate quantity update
		cart.items[0].quantity = 5;
		expect(cart.getTotal()).toBe(5000n);

		// Simulate item removal
		cart.items = [];
		expect(cart.getTotal()).toBe(0n);
	});

	test('Should handle price precision correctly', () => {
		const product = new Product({
			id: 'prod-1',
			name: 'Expensive Item',
			price: '999999999', // $9,999,999.99
			description: 'Very expensive',
			stock: 1,
			createdAt: new Date().toISOString(),
		});

		expect(product.price).toBe(999999999n);
		expect(product.getPriceInDollars()).toBe('$9999999.99');

		const cart = new Cart({
			id: 'cart-1',
			userId: 'user-1',
			items: [
				{
					product: product.toInterface(),
					quantity: 1,
					addedAt: new Date().toISOString(),
				},
			],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		expect(cart.getTotal()).toBe(999999999n);
	});
});

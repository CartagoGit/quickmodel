/**
 * Test: @Quick() decorator with different property declaration styles
 * 
 * Verifies that @Quick() works identically with:
 * - declare (no runtime code)
 * - ! (definite assignment)
 * - ? (optional)
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '@/index';

describe('@Quick() with declaration styles', () => {
	// ============================================================================
	// Scenario 1: @Quick() without typeMap (primitives only)
	// ============================================================================
	describe('Primitives only (no transformations)', () => {
		interface IProduct {
			id: string;
			name: string;
			price: number;
			inStock: boolean;
		}

		@Quick()
		class ProductWithDeclare extends QModel<IProduct> {
			declare id: string;
			declare name: string;
			declare price: number;
			declare inStock: boolean;
		}

		@Quick()
		class ProductWithExclamation extends QModel<IProduct> {
			id!: string;
			name!: string;
			price!: number;
			inStock!: boolean;
		}

		@Quick()
		class ProductWithOptional extends QModel<IProduct> {
			id?: string;
			name?: string;
			price?: number;
			inStock?: boolean;
		}

		const productData = {
			id: 'prod-123',
			name: 'Laptop',
			price: 999.99,
			inStock: true,
		};

		test('declare: should work with primitives', () => {
			const product = new ProductWithDeclare(productData);

			expect(product.id).toBe('prod-123');
			expect(product.name).toBe('Laptop');
			expect(product.price).toBe(999.99);
			expect(product.inStock).toBe(true);

			// Serialize
			const serialized = product.serialize();
			expect(serialized).toEqual(productData);

			// toInterface
			const iface = product.toInterface();
			expect(iface).toEqual(productData);
		});

		test('!: should work with primitives', () => {
			const product = new ProductWithExclamation(productData);

			expect(product.id).toBe('prod-123');
			expect(product.name).toBe('Laptop');
			expect(product.price).toBe(999.99);
			expect(product.inStock).toBe(true);

			const serialized = product.serialize();
			expect(serialized).toEqual(productData);

			const iface = product.toInterface();
			expect(iface).toEqual(productData);
		});

		test('?: should work with primitives', () => {
			const product = new ProductWithOptional(productData);

			expect(product.id).toBe('prod-123');
			expect(product.name).toBe('Laptop');
			expect(product.price).toBe(999.99);
			expect(product.inStock).toBe(true);

			const serialized = product.serialize();
			expect(serialized).toEqual(productData);

			const iface = product.toInterface();
			expect(iface).toEqual(productData);
		});
	});

	// ============================================================================
	// Scenario 2: @Quick() with typeMap (transformations)
	// ============================================================================
	describe('With type transformations', () => {
		interface IOrder {
			id: string;
			total: string; // BigInt as string
			createdAt: string; // Date as ISO string
			tags: string[]; // Array → Set
		}

		interface IOrderTransform {
			total: bigint;
			createdAt: Date;
			tags: Set<string>;
		}

		@Quick({
			total: BigInt,
			createdAt: Date,
			tags: Set,
		})
		class OrderWithDeclare extends QModel<IOrder> implements QInterface<IOrder, IOrderTransform> {
			declare id: string;
			declare total: bigint;
			declare createdAt: Date;
			declare tags: Set<string>;
		}

		@Quick({
			total: BigInt,
			createdAt: Date,
			tags: Set,
		})
		class OrderWithExclamation extends QModel<IOrder> implements QInterface<IOrder, IOrderTransform> {
			id!: string;
			total!: bigint;
			createdAt!: Date;
			tags!: Set<string>;
		}

		@Quick({
			total: BigInt,
			createdAt: Date,
			tags: Set,
		})
		class OrderWithOptional extends QModel<IOrder> implements QInterface<IOrder, IOrderTransform> {
			id?: string;
			total?: bigint;
			createdAt?: Date;
			tags?: Set<string>;
		}

		const orderData = {
			id: 'order-456',
			total: '123456789012345',
			createdAt: '2024-01-15T10:30:00.000Z',
			tags: ['urgent', 'premium'],
		};

		test('declare: should transform types correctly', () => {
			const order = new OrderWithDeclare(orderData);

			expect(order.id).toBe('order-456');
			expect(order.total).toBe(123456789012345n);
			expect(order.createdAt).toBeInstanceOf(Date);
			expect(order.createdAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
			expect(order.tags).toBeInstanceOf(Set);
			expect(order.tags.has('urgent')).toBe(true);
			expect(order.tags.has('premium')).toBe(true);

			// Serialize back
			const serialized = order.serialize();
			expect(serialized.total).toEqual({ __type: 'bigint', value: '123456789012345' });
			expect(serialized.createdAt).toBe('2024-01-15T10:30:00.000Z');
			expect(Array.isArray(serialized.tags)).toBe(true);
		});

		test('!: should transform types correctly', () => {
			const order = new OrderWithExclamation(orderData);

			expect(order.id).toBe('order-456');
			expect(order.total).toBe(123456789012345n);
			expect(order.createdAt).toBeInstanceOf(Date);
			expect(order.createdAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
			expect(order.tags).toBeInstanceOf(Set);
			expect(order.tags.has('urgent')).toBe(true);

			const serialized = order.serialize();
			expect(serialized.total).toEqual({ __type: 'bigint', value: '123456789012345' });
			expect(serialized.createdAt).toBe('2024-01-15T10:30:00.000Z');
		});

		test('?: should transform types correctly', () => {
			const order = new OrderWithOptional(orderData);

			expect(order.id).toBe('order-456');
			expect(order.total).toBe(123456789012345n);
			expect(order.createdAt).toBeInstanceOf(Date);
			expect(order.tags).toBeInstanceOf(Set);

			const serialized = order.serialize();
			expect(serialized.total).toEqual({ __type: 'bigint', value: '123456789012345' });
			expect(serialized.createdAt).toBe('2024-01-15T10:30:00.000Z');
		});
	});

	// ============================================================================
	// Scenario 3: Nested models
	// ============================================================================
	describe('Nested models', () => {
		interface IAddress {
			street: string;
			city: string;
			zipCode: string;
		}

		interface ICustomer {
			name: string;
			email: string;
			address: IAddress;
		}

		// Address classes with different styles
		@Quick()
		class AddressDeclare extends QModel<IAddress> {
			declare street: string;
			declare city: string;
			declare zipCode: string;
		}

		@Quick()
		class AddressExclamation extends QModel<IAddress> {
			street!: string;
			city!: string;
			zipCode!: string;
		}

		@Quick()
		class AddressOptional extends QModel<IAddress> {
			street?: string;
			city?: string;
			zipCode?: string;
		}

		// Customer classes with different styles
		@Quick({ address: AddressDeclare })
		class CustomerDeclare extends QModel<ICustomer> {
			declare name: string;
			declare email: string;
			declare address: AddressDeclare;
		}

		@Quick({ address: AddressExclamation })
		class CustomerExclamation extends QModel<ICustomer> {
			name!: string;
			email!: string;
			address!: AddressExclamation;
		}

		@Quick({ address: AddressOptional })
		class CustomerOptional extends QModel<ICustomer> {
			name?: string;
			email?: string;
			address?: AddressOptional;
		}

		const customerData = {
			name: 'Alice Smith',
			email: 'alice@example.com',
			address: {
				street: '123 Main St',
				city: 'New York',
				zipCode: '10001',
			},
		};

		test('declare: should handle nested models', () => {
			const customer = new CustomerDeclare(customerData);

			expect(customer.name).toBe('Alice Smith');
			expect(customer.email).toBe('alice@example.com');
			expect(customer.address).toBeInstanceOf(AddressDeclare);
			expect(customer.address.street).toBe('123 Main St');
			expect(customer.address.city).toBe('New York');
			expect(customer.address.zipCode).toBe('10001');

			const serialized = customer.serialize();
			expect(serialized).toEqual(customerData);
		});

		test('!: should handle nested models', () => {
			const customer = new CustomerExclamation(customerData);

			expect(customer.name).toBe('Alice Smith');
			expect(customer.address).toBeInstanceOf(AddressExclamation);
			expect(customer.address.street).toBe('123 Main St');
			expect(customer.address.city).toBe('New York');

			const serialized = customer.serialize();
			expect(serialized).toEqual(customerData);
		});

		test('?: should handle nested models', () => {
			const customer = new CustomerOptional(customerData);

			expect(customer.name).toBe('Alice Smith');
			expect(customer.address).toBeInstanceOf(AddressOptional);
			expect(customer.address.street).toBe('123 Main St');

			const serialized = customer.serialize();
			expect(serialized).toEqual(customerData);
		});
	});

	// ============================================================================
	// Scenario 4: Arrays and collections
	// ============================================================================
	describe('Arrays and collections', () => {
		interface ITeam {
			name: string;
			members: string[];
			scores: number[];
		}

		@Quick()
		class TeamDeclare extends QModel<ITeam> {
			declare name: string;
			declare members: string[];
			declare scores: number[];
		}

		@Quick()
		class TeamExclamation extends QModel<ITeam> {
			name!: string;
			members!: string[];
			scores!: number[];
		}

		@Quick()
		class TeamOptional extends QModel<ITeam> {
			name?: string;
			members?: string[];
			scores?: number[];
		}

		const teamData = {
			name: 'Alpha Team',
			members: ['Alice', 'Bob', 'Charlie'],
			scores: [95, 87, 92],
		};

		test('declare: should handle arrays', () => {
			const team = new TeamDeclare(teamData);

			expect(team.name).toBe('Alpha Team');
			expect(Array.isArray(team.members)).toBe(true);
			expect(team.members).toEqual(['Alice', 'Bob', 'Charlie']);
			expect(Array.isArray(team.scores)).toBe(true);
			expect(team.scores).toEqual([95, 87, 92]);

			const serialized = team.serialize();
			expect(serialized).toEqual(teamData);
		});

		test('!: should handle arrays', () => {
			const team = new TeamExclamation(teamData);

			expect(team.name).toBe('Alpha Team');
			expect(Array.isArray(team.members)).toBe(true);
			expect(team.members).toEqual(['Alice', 'Bob', 'Charlie']);
			expect(team.scores).toEqual([95, 87, 92]);

			const serialized = team.serialize();
			expect(serialized).toEqual(teamData);
		});

		test('?: should handle arrays', () => {
			const team = new TeamOptional(teamData);

			expect(team.name).toBe('Alpha Team');
			expect(Array.isArray(team.members)).toBe(true);
			expect(team.members).toEqual(['Alice', 'Bob', 'Charlie']);

			const serialized = team.serialize();
			expect(serialized).toEqual(teamData);
		});
	});

	// ============================================================================
	// Scenario 5: Modification and state tracking
	// ============================================================================
	describe('Modification and state tracking', () => {
		interface ISettings {
			theme: string;
			notifications: boolean;
			maxItems: number;
		}

		@Quick()
		class SettingsDeclare extends QModel<ISettings> {
			declare theme: string;
			declare notifications: boolean;
			declare maxItems: number;
		}

		@Quick()
		class SettingsExclamation extends QModel<ISettings> {
			theme!: string;
			notifications!: boolean;
			maxItems!: number;
		}

		@Quick()
		class SettingsOptional extends QModel<ISettings> {
			theme?: string;
			notifications?: boolean;
			maxItems?: number;
		}

		const settingsData = {
			theme: 'dark',
			notifications: true,
			maxItems: 50,
		};

		test('declare: should track modifications', () => {
			const settings = new SettingsDeclare(settingsData);

			expect(settings.hasChanges()).toBe(false);

			settings.theme = 'light';
			settings.maxItems = 100;

			expect(settings.hasChanges()).toBe(true);
			expect(settings.getChangedFields()).toContain('theme');
			expect(settings.getChangedFields()).toContain('maxItems');
			expect(settings.getChangedFields()).not.toContain('notifications');

			const changes = settings.getChanges();
			expect(changes.theme).toBe('light');
			expect(changes.maxItems).toBe(100);
			expect(changes.notifications).toBeUndefined();
		});

		test('!: should track modifications', () => {
			const settings = new SettingsExclamation(settingsData);

			expect(settings.hasChanges()).toBe(false);

			settings.theme = 'light';
			settings.maxItems = 100;

			expect(settings.hasChanges()).toBe(true);
			expect(settings.getChangedFields()).toContain('theme');
			expect(settings.getChangedFields()).toContain('maxItems');

			const changes = settings.getChanges();
			expect(changes.theme).toBe('light');
			expect(changes.maxItems).toBe(100);
		});

		test('?: should track modifications', () => {
			const settings = new SettingsOptional(settingsData);

			expect(settings.hasChanges()).toBe(false);

			settings.theme = 'light';
			settings.maxItems = 100;

			expect(settings.hasChanges()).toBe(true);
			expect(settings.getChangedFields()).toContain('theme');

			const changes = settings.getChanges();
			expect(changes.theme).toBe('light');
			expect(changes.maxItems).toBe(100);
		});
	});

	// ============================================================================
	// Scenario 6: Clone and reset
	// ============================================================================
	describe('Clone and reset', () => {
		interface IConfig {
			apiUrl: string;
			timeout: number;
			retries: number;
		}

		@Quick()
		class ConfigDeclare extends QModel<IConfig> {
			declare apiUrl: string;
			declare timeout: number;
			declare retries: number;
		}

		@Quick()
		class ConfigExclamation extends QModel<IConfig> {
			apiUrl!: string;
			timeout!: number;
			retries!: number;
		}

		@Quick()
		class ConfigOptional extends QModel<IConfig> {
			apiUrl?: string;
			timeout?: number;
			retries?: number;
		}

		const configData = {
			apiUrl: 'https://api.example.com',
			timeout: 5000,
			retries: 3,
		};

		test('declare: should clone and reset', () => {
			const config = new ConfigDeclare(configData);

			// Clone
			const cloned = config.clone();
			expect(cloned).toBeInstanceOf(ConfigDeclare);
			expect(cloned.apiUrl).toBe(config.apiUrl);
			expect(cloned.timeout).toBe(config.timeout);

			// Modify original
			config.timeout = 10000;
			expect(cloned.timeout).toBe(5000); // Clone unchanged

			// Reset
			config.reset();
			expect(config.timeout).toBe(5000);
			expect(config.hasChanges()).toBe(false);
		});

		test('!: should clone and reset', () => {
			const config = new ConfigExclamation(configData);

			const cloned = config.clone();
			expect(cloned).toBeInstanceOf(ConfigExclamation);
			expect(cloned.apiUrl).toBe(config.apiUrl);

			config.timeout = 10000;
			expect(cloned.timeout).toBe(5000);

			config.reset();
			expect(config.timeout).toBe(5000);
			expect(config.hasChanges()).toBe(false);
		});

		test('?: should clone and reset', () => {
			const config = new ConfigOptional(configData);

			const cloned = config.clone();
			expect(cloned).toBeInstanceOf(ConfigOptional);
			expect(cloned.apiUrl).toBe(config.apiUrl);

			config.timeout = 10000;
			expect(cloned.timeout).toBe(5000);

			config.reset();
			expect(config.timeout).toBe(5000);
			expect(config.hasChanges()).toBe(false);
		});
	});
});

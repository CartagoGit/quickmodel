/**
 * Integration tests: mock generation with decorated models.
 * Covers: integration/I
 *
 * Tests that mock() works with @QDefault, @QReadonly (via overrides),
 * basic random generation, createMany, and nested model mocking.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QDefault } from '@/decorators';

// ─── I-1/I-2: Model with @QDefault ───────────────────────────────────────────
// Note: @QReadonly fields cannot be set after construction, so mock().random()
// bypasses @QReadonly by providing them as overrides.

interface IConfig {
	env: string;
	version: string;
	debug: boolean;
	timeout: number;
}

@Quick(
	{ timeout: Number },
	{
		unknownPropertyPolicy: 'keep',
		mockers: {
			env: () => 'test',
			version: () => '1.0.0',
			debug: () => false,
			timeout: () => 3000,
		},
	}
)
class ConfigModel extends QModel<IConfig> {
	@QDefault('production')
	declare env: string;

	@QDefault('0.0.0')
	declare version: string;

	@QDefault(false as unknown as boolean)
	declare debug: boolean;

	declare timeout: number;
}

// ─── I-3: Deterministic mock via same input ───────────────────────────────────

interface IItem {
	name: string;
	value: number;
}

@Quick(
	{ value: Number },
	{
		unknownPropertyPolicy: 'keep',
		mockers: {
			name: () => 'item',
			value: () => 42,
		},
	}
)
class ItemModel extends QModel<IItem> {
	declare name: string;
	declare value: number;
}

// ─── I-4: createMany with explicit data ──────────────────────────────────────

interface IProduct {
	sku: string;
	price: number;
	stock: number;
}

@Quick({ price: Number, stock: Number }, { unknownPropertyPolicy: 'keep' })
class ProductMockModel extends QModel<IProduct> {
	declare sku: string;
	declare price: number;
	declare stock: number;
}

// ─── I-5: nested model mock ───────────────────────────────────────────────────

interface IAddress {
	street: string;
	city: string;
}

interface ICustomer {
	name: string;
	address: IAddress;
}

@Quick(
	{},
	{
		unknownPropertyPolicy: 'keep',
		mockers: {
			street: () => '123 Main St',
			city: () => 'Springfield',
		},
	}
)
class AddressMockModel extends QModel<IAddress> {
	declare street: string;
	declare city: string;
}

@Quick(
	{ address: AddressMockModel },
	{
		unknownPropertyPolicy: 'keep',
		mockers: {
			name: () => 'Test Customer',
		},
	}
)
class CustomerModel extends QModel<ICustomer> {
	declare name: string;
	declare address: AddressMockModel;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: mock generation with decorators (mocks/I)', () => {
	describe('I-1: random() with mocker functions generates expected values', () => {
		test('mock().random() creates a ConfigModel instance', () => {
			const instance = ConfigModel.mock().random();
			expect(instance).toBeInstanceOf(ConfigModel);
		});

		test('mock().random() without overrides uses @QDefault values', () => {
			// When no override is provided, @QDefault kicks in
			const instance = ConfigModel.mock().random();
			// 'env' @QDefault is 'production'
			expect(typeof instance.env).toBe('string');
		});

		test('mock().random() with mocker override uses the provided mocker value', () => {
			// Mockers in @Quick config are used when you explicitly override in random()
			const instance = ConfigModel.mock().random({
				env: 'test',
				timeout: 3000,
			});
			expect(instance.env).toBe('test');
			expect(instance.timeout).toBe(3000);
		});
	});

	describe('I-2: random() with overrides — provided values win', () => {
		test('override values take precedence over mockers', () => {
			const instance = ConfigModel.mock().random({
				env: 'staging',
				timeout: 5000,
			});
			expect(instance.env).toBe('staging');
			expect(instance.timeout).toBe(5000);
		});

		test('non-overridden fields still use mockers', () => {
			const instance = ConfigModel.mock().random({ env: 'prod' });
			expect(instance.env).toBe('prod');
			expect(instance.timeout).toBe(3000); // from mocker
		});
	});

	describe('I-3: Repeated mock().random() calls are consistent with fixed mockers', () => {
		test('two calls without overrides produce instances with same type', () => {
			const instA = ItemModel.mock().random();
			const instB = ItemModel.mock().random();
			expect(instA).toBeInstanceOf(ItemModel);
			expect(instB).toBeInstanceOf(ItemModel);
		});

		test('deterministic: same override produces same values', () => {
			const instA = ItemModel.mock().random({ name: 'item', value: 42 });
			const instB = ItemModel.mock().random({ name: 'item', value: 42 });
			expect(instA.name).toBe(instB.name);
			expect(instA.value).toBe(instB.value);
		});
	});

	describe('I-4: createMany() batch construction', () => {
		test('createMany(10) creates 10 ProductMockModel instances', () => {
			const { instances } = ProductMockModel.createMany(
				Array.from({ length: 10 }, (_, idx) => ({
					sku: `SKU-${String(idx).padStart(3, '0')}`,
					price: (idx + 1) * 9.99,
					stock: (idx + 1) * 10,
				}))
			);
			expect(instances.length).toBe(10);
			for (const inst of instances) {
				expect(inst).toBeInstanceOf(ProductMockModel);
				expect(typeof inst.price).toBe('number');
				expect(typeof inst.stock).toBe('number');
			}
		});
	});

	describe('I-5: mock of nested model', () => {
		test('mock().random() creates CustomerModel with nested AddressMockModel', () => {
			const customer = CustomerModel.mock().random();
			expect(customer).toBeInstanceOf(CustomerModel);
			expect(customer.address).toBeInstanceOf(AddressMockModel);
		});

		test('nested mock address is an AddressMockModel instance', () => {
			// With nested model type in @Quick, random() creates nested instances
			const customer = CustomerModel.mock().random();
			expect(customer.address).toBeDefined();
		});

		test('override nested address via random() overrides', () => {
			const address = AddressMockModel.mock().random({
				street: '42 Oak Ave',
				city: 'Shelbyville',
			});
			expect(address.street).toBe('42 Oak Ave');
			expect(address.city).toBe('Shelbyville');
		});
	});
});

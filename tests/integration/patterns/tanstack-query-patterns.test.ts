/**
 * TanStack Query Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used with TanStack Query v5.
 * No TanStack packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - queryFn coerces raw API responses into typed DTOs via createMany()
 * - useMutation validates before mutation via checkRules()
 * - Optimistic updates use merge() for immutable state transitions
 * - Cache normalization: serialize() is the stored format, new Dto(cached) to rehydrate
 * - select option: wraps raw data with DTO for on-the-fly transformation
 * - Infinite queries: createMany() on each page of results
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QComputed, QField } from '@/index';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Shared models
// ---------------------------------------------------------------------------

interface IProduct {
	id: string;
	name: string;
	price: number;
	inStock: boolean;
	category: string;
	displayPrice?: string;
}

interface ICreateProduct {
	name: string;
	price: number;
	category: string;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		price: 'number',
		inStock: 'boolean',
		category: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ProductDto extends QModel<IProduct> {
	declare id: string;
	declare name: string;
	declare price: number;
	declare inStock: boolean;
	declare category: string;

	@QComputed()
	get displayPrice(): string {
		return `$${this.price.toFixed(2)}`;
	}
}

@Quick(
	{ name: 'string', price: 'number', category: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateProductDto extends QModel<ICreateProduct> {
	@QField({ label: 'Product Name', required: true })
	@QRule(
		(val: string) => val.length >= 2,
		'Name must be at least 2 characters'
	)
	@QRule((val: string) => val.length <= 100, 'Name too long')
	declare name: string;

	@QField({ label: 'Price' })
	@QRule((val: number) => val > 0, 'Price must be positive')
	@QRule((val: number) => val < 100_000, 'Price exceeds maximum')
	declare price: number;

	@QField({ label: 'Category' })
	@QRule(
		(val: string) =>
			['electronics', 'clothing', 'tools', 'books'].includes(val),
		'Invalid category'
	)
	declare category: string;
}

interface ICartItem {
	productId: string;
	qty: number;
	price: number;
	subtotal?: number;
}

@Quick(
	{ productId: 'string', qty: 'number', price: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class CartItemDto extends QModel<ICartItem> {
	declare productId: string;
	declare qty: number;
	declare price: number;

	@QComputed()
	get subtotal(): number {
		return this.qty * this.price;
	}
}

// Raw API data (simulates network responses)
const rawProduct = {
	id: 'p1',
	name: 'Widget Pro',
	price: '29.99', // string from JSON — will be coerced
	inStock: 'true',
	category: 'tools',
	_serverOnly: 'should-be-stripped',
};

const rawProductList = [
	{
		id: 'p1',
		name: 'Widget Pro',
		price: '29.99',
		inStock: 'true',
		category: 'tools',
		_srv: 'x',
	},
	{
		id: 'p2',
		name: 'Bolt Set',
		price: '9.50',
		inStock: 'false',
		category: 'tools',
		_srv: 'y',
	},
	{
		id: 'p3',
		name: 'Drill',
		price: '89.99',
		inStock: 'true',
		category: 'tools',
		_srv: 'z',
	},
];

// ---------------------------------------------------------------------------
// 1. queryFn — fetching a single resource
// ---------------------------------------------------------------------------

describe('TanStack Query — queryFn: single resource', () => {
	// Simulate queryFn: normalizes raw network response to typed DTO
	function fetchProduct(id: string): IProduct {
		const raw = { ...rawProduct, id };
		const dto = new ProductDto(raw);
		return dto.serialize() as IProduct;
	}

	test('coerces string price to number', () => {
		const result = fetchProduct('p1');
		expect(typeof result.price).toBe('number');
		expect(result.price).toBe(29.99);
	});

	test('coerces string boolean to boolean', () => {
		const result = fetchProduct('p1');
		expect(typeof result.inStock).toBe('boolean');
		expect(result.inStock).toBe(true);
	});

	test('strips server-only fields', () => {
		const result = fetchProduct('p1');
		expect(result).not.toHaveProperty('_serverOnly');
	});

	test('@QComputed displayPrice is included in serialized output', () => {
		const result = fetchProduct('p1');
		expect(result.displayPrice).toBe('$29.99');
	});
});

// ---------------------------------------------------------------------------
// 2. queryFn — fetching a list (createMany)
// ---------------------------------------------------------------------------

describe('TanStack Query — queryFn: list with createMany()', () => {
	function fetchProducts(): IProduct[] {
		const { instances, errors } = ProductDto.createMany(rawProductList);
		if (errors.length > 0) {
			throw new Error(`Failed to parse ${errors.length} products`);
		}
		return instances.map((dto) => dto.serialize() as IProduct);
	}

	test('returns correct number of products', () => {
		const results = fetchProducts();
		expect(results).toHaveLength(3);
	});

	test('all prices are numbers', () => {
		const results = fetchProducts();
		results.forEach((product) => {
			expect(typeof product.price).toBe('number');
		});
	});

	test('strips internal server fields from all items', () => {
		const results = fetchProducts();
		results.forEach((product) => {
			expect(product).not.toHaveProperty('_srv');
		});
	});

	test('createMany errors array is empty for valid data', () => {
		const { errors } = ProductDto.createMany(rawProductList);
		expect(errors).toHaveLength(0);
	});

	test('createMany reports errors for invalid items', () => {
		// Use CreateProductDto (has @QRule) so rule violations are captured in errors
		const badData = [
			{ name: 'X', price: -1, category: 'electronics' }, // name too short, price negative
			{ name: 'Valid Widget', price: 49.99, category: 'electronics' }, // good item
		];
		const { errors } = CreateProductDto.createMany(badData);
		expect(errors.length).toBeGreaterThan(0); // 'X' too short, -1 fails @QRule
	});
});

// ---------------------------------------------------------------------------
// 3. useMutation — validate before mutating
// ---------------------------------------------------------------------------

describe('TanStack Query — useMutation: validate before mutate', () => {
	// Simulate mutationFn: build DTO → validate → "send" to API
	async function createProductMutation(
		data: object
	): Promise<IProduct | null> {
		await Promise.resolve(); // simulate async context (e.g. network call)
		const dto = new CreateProductDto(data);
		const { valid, errors } = dto.checkRules();
		if (!valid) {
			throw new Error(
				errors.map((err) => `${err.field}: ${err.message}`).join(', ')
			);
		}
		// Simulate API call — return serialized DTO
		const created: IProduct = {
			...(dto.serialize() as ICreateProduct),
			id: 'new-id',
			inStock: true,
		};
		return created;
	}

	test('valid data resolves with created product', async () => {
		const result = await createProductMutation({
			name: 'New Widget',
			price: 49.99,
			category: 'tools',
		});
		expect(result).not.toBeNull();
		expect(result?.name).toBe('New Widget');
	});

	test('invalid data rejects with validation error', async () => {
		let caught = false;
		try {
			await createProductMutation({
				name: '',
				price: -1,
				category: 'invalid',
			});
		} catch {
			caught = true;
		}
		expect(caught).toBe(true);
	});

	test('price coercion works in mutation input', async () => {
		const result = await createProductMutation({
			name: 'Budget Tool',
			price: '15.99', // string input — coerced to number
			category: 'tools',
		});
		expect(result?.price).toBe(15.99);
	});

	test('strips extra fields not in schema', async () => {
		const result = await createProductMutation({
			name: 'Clean Tool',
			price: 25,
			category: 'tools',
			_csrf: 'token-123', // should be stripped
			_userId: 'u1',
		});
		expect(result).not.toHaveProperty('_csrf');
		expect(result).not.toHaveProperty('_userId');
	});
});

// ---------------------------------------------------------------------------
// 4. Optimistic updates — merge() as immutable updater
// ---------------------------------------------------------------------------

describe('TanStack Query — Optimistic updates with merge()', () => {
	let cartItem: CartItemDto;

	beforeEach(() => {
		cartItem = new CartItemDto({ productId: 'p1', qty: 2, price: 29.99 });
	});

	// Simulate onMutate: produce optimistic state
	function applyOptimisticUpdate(
		current: CartItemDto,
		patch: Partial<ICartItem>
	): CartItemDto {
		return current.copy(patch);
	}

	test('merge() returns a new instance (immutable)', () => {
		const updated = applyOptimisticUpdate(cartItem, { qty: 5 });
		expect(updated).not.toBe(cartItem);
	});

	test('optimistic update reflects new qty', () => {
		const updated = applyOptimisticUpdate(cartItem, { qty: 5 });
		expect(updated.qty).toBe(5);
	});

	test('original item is unchanged after optimistic update', () => {
		applyOptimisticUpdate(cartItem, { qty: 5 });
		expect(cartItem.qty).toBe(2);
	});

	test('@QComputed subtotal recalculates after merge', () => {
		const updated = applyOptimisticUpdate(cartItem, { qty: 3 });
		expect(updated.subtotal).toBe(3 * 29.99);
	});

	test('rollback: original instance is still valid after failed mutation', () => {
		const backup = cartItem; // TanStack Query saves this in onMutate context
		applyOptimisticUpdate(cartItem, { qty: 999 }); // optimistic (will "fail")
		// Rollback: restore from backup
		expect(backup.qty).toBe(2); // original untouched
	});
});

// ---------------------------------------------------------------------------
// 5. Cache normalization — serialize() ↔ populate() roundtrip
// ---------------------------------------------------------------------------

describe('TanStack Query — Cache normalization: serialize ↔ rehydrate', () => {
	test('serialize() output can reconstruct the same DTO', () => {
		const original = new ProductDto(rawProduct);
		const cached = original.serialize();
		const rehydrated = new ProductDto(cached as object);
		expect(rehydrated.id).toBe(original.id);
		expect(rehydrated.price).toBe(original.price);
		expect(rehydrated.displayPrice).toBe(original.displayPrice);
	});

	test('cached list can be rehydrated as new DTO instances', () => {
		const { instances } = ProductDto.createMany(rawProductList);
		const cachedList = instances.map((dto) => dto.serialize());
		// Simulate reading from cache
		const rehydrated = cachedList.map(
			(item) => new ProductDto(item as object)
		);
		expect(rehydrated).toHaveLength(3);
		expect(rehydrated[0]?.price).toBe(29.99);
	});

	test('rehydrated DTO has correct @QComputed values', () => {
		const original = new ProductDto(rawProduct);
		const rehydrated = new ProductDto(original.serialize() as object);
		expect(rehydrated.displayPrice).toBe('$29.99');
	});
});

// ---------------------------------------------------------------------------
// 6. select option — transform data on read
// ---------------------------------------------------------------------------

describe('TanStack Query — select: transform cached data', () => {
	// Simulate useQuery with select: (data) => data.map(raw => new ProductDto(raw))
	function selectProducts(rawList: object[]): ProductDto[] {
		return rawList.map((raw) => new ProductDto(raw));
	}

	function selectCheapProducts(rawList: object[]): ProductDto[] {
		return selectProducts(rawList).filter((dto) => dto.price < 30);
	}

	test('select returns typed DTO instances', () => {
		const products = selectProducts(rawProductList);
		expect(products[0]).toBeInstanceOf(ProductDto);
	});

	test('select filtering works on coerced number fields', () => {
		const cheap = selectCheapProducts(rawProductList);
		expect(cheap).toHaveLength(2); // 29.99 and 9.50
	});

	test('select result has @QComputed displayPrice', () => {
		const products = selectProducts(rawProductList);
		expect(products[1]?.displayPrice).toBe('$9.50');
	});
});

// ---------------------------------------------------------------------------
// 7. Infinite queries — createMany() on each page
// ---------------------------------------------------------------------------

describe('TanStack Query — Infinite queries: createMany() per page', () => {
	interface IPage {
		items: IProduct[];
		nextCursor: string | null;
	}

	function fetchPage(page: number): IPage {
		const pageData = rawProductList.slice((page - 1) * 2, page * 2);
		const { instances, errors } = ProductDto.createMany(pageData);
		if (errors.length > 0) throw new Error('Parse error');
		return {
			items: instances.map((dto) => dto.serialize() as IProduct),
			nextCursor: pageData.length === 2 ? String(page + 1) : null,
		};
	}

	test('first page returns 2 items', () => {
		const page = fetchPage(1);
		expect(page.items).toHaveLength(2);
	});

	test('second page returns 1 item and no next cursor', () => {
		const page = fetchPage(2);
		expect(page.items).toHaveLength(1);
		expect(page.nextCursor).toBeNull();
	});

	test('all items across pages have coerced prices', () => {
		const page1 = fetchPage(1);
		const page2 = fetchPage(2);
		const allItems = [...page1.items, ...page2.items];
		allItems.forEach((item) => {
			expect(typeof item.price).toBe('number');
		});
	});
});

// ---------------------------------------------------------------------------
// 8. isDirty() for stale-while-revalidate pattern
// ---------------------------------------------------------------------------

describe('TanStack Query — isDirty() for staleness detection', () => {
	test('fresh DTO is not dirty', () => {
		const dto = new ProductDto({
			id: 'p1',
			name: 'Widget',
			price: 10,
			inStock: true,
			category: 'tools',
		});
		expect(dto.isDirty()).toBe(false);
	});

	test('mutated field is detected as dirty', () => {
		const dto = new ProductDto({
			id: 'p1',
			name: 'Widget',
			price: 10,
			inStock: true,
			category: 'tools',
		});
		dto.price = 15; // simulated local edit before sync
		expect(dto.isDirty('price')).toBe(true);
		expect(dto.isDirty('name')).toBe(false);
	});

	test('merge() returns new instance with pending changes (isDirty)', () => {
		const dto = new ProductDto({
			id: 'p1',
			name: 'Widget',
			price: 10,
			inStock: true,
			category: 'tools',
		});
		const updated = dto.copy({ price: 15 });
		expect(updated.price).toBe(15); // value was changed
		expect(updated.isDirty()).toBe(true); // model has pending changes vs original snapshot
	});

	test('reset() clears dirty state', () => {
		const dto = new ProductDto({
			id: 'p1',
			name: 'Widget',
			price: 10,
			inStock: true,
			category: 'tools',
		});
		dto.price = 99;
		expect(dto.isDirty()).toBe(true);
		dto.reset();
		expect(dto.isDirty()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 9. Async validation — checkRulesAsync() in mutations
// ---------------------------------------------------------------------------

describe('TanStack Query — checkRulesAsync() for server-side uniqueness', () => {
	const existingNames = new Set<string>(['Existing Widget', 'Old Drill']);

	class ProductWithUniqueNameDto extends CreateProductDto {
		@QRule(
			(val: string) => !existingNames.has(val),
			'Product name already exists'
		)
		declare name: string;
	}

	test('async mutation validation passes for unique name', async () => {
		const dto = new ProductWithUniqueNameDto({
			name: 'Brand New Tool',
			price: 20,
			category: 'tools',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(true);
	});

	test('async mutation validation fails for duplicate name', async () => {
		const dto = new ProductWithUniqueNameDto({
			name: 'Existing Widget',
			price: 20,
			category: 'tools',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'name')).toBe(true);
	});
});

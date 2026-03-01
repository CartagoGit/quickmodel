/**
 * Bun.js Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used with Bun's native HTTP server,
 * WebSocket handler and file I/O APIs.
 * No actual Bun.serve() is called — pure handler logic only.
 *
 * Key patterns:
 * - Bun.serve fetch handler: DTO coercion + validation from Request body
 * - WebSocket message handler: parse + validate incoming JSON
 * - Batch loading from JSON file: QModel.createMany()
 * - Response serialization: JSON.stringify(dto.serialize())
 * - @QComputed in HTTP responses
 * - unknownPropertyPolicy: 'strip' for security
 * - createMany() for bulk API ingestion
 */
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QComputed, QField } from '@/decorators';

// ---------------------------------------------------------------------------
// Shared DTOs
// ---------------------------------------------------------------------------

interface IProduct {
	id: string;
	name: string;
	price: number;
	stock: number;
	tags: string[];
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		price: 'number',
		stock: 'number',
		tags: Array,
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ProductDto extends QModel<IProduct> {
	@QField({ widget: 'input', label: 'ID', required: true })
	declare id: string;

	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	@QRule((val: string) => val.trim().length <= 100, 'Name too long')
	declare name: string;

	@QField({ label: 'Price', widget: 'number' })
	@QRule((val: number) => val >= 0, 'Price cannot be negative')
	declare price: number;

	@QField({ widget: 'input', label: 'Stock' })
	@QRule(
		(val: number) => Number.isInteger(val) && val >= 0,
		'Stock must be a non-negative integer'
	)
	declare stock: number;

	declare tags: string[];
	declare createdAt: Date;

	@QComputed()
	get isAvailable(): boolean {
		return this.stock > 0;
	}

	@QComputed()
	get formattedPrice(): string {
		return `$${this.price.toFixed(2)}`;
	}
}

interface IOrder {
	orderId: string;
	customerId: string;
	total: number;
	currency: string;
	placedAt: Date;
	items: string[];
}

@Quick(
	{
		orderId: 'string',
		customerId: 'string',
		total: 'number',
		currency: 'string',
		placedAt: Date,
		items: Array,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class OrderDto extends QModel<IOrder> {
	declare orderId: string;
	declare customerId: string;

	@QRule((val: number) => val > 0, 'Order total must be positive')
	declare total: number;

	@QRule(
		(val: string) => ['USD', 'EUR', 'GBP'].includes(val.toUpperCase()),
		'Unsupported currency'
	)
	declare currency: string;

	declare placedAt: Date;
	declare items: string[];

	@QComputed()
	get summary(): string {
		return `Order ${this.orderId} — ${this.items.length} item(s) — ${this.total} ${this.currency.toUpperCase()}`;
	}
}

// ---------------------------------------------------------------------------
// Helpers that simulate Bun.serve() fetch handler logic
// ---------------------------------------------------------------------------

/**
 * Simulates what a Bun.serve fetch handler does:
 * 1. Parse JSON body
 * 2. Coerce with QModel
 * 3. Validate with checkRules()
 * Returns { status, body }
 */
function handleCreateProduct(rawBody: unknown): {
	status: number;
	body: unknown;
} {
	if (typeof rawBody !== 'object' || rawBody === null) {
		return { status: 400, body: { error: 'Invalid JSON body' } };
	}
	const dto = new ProductDto(rawBody as Record<string, unknown>);
	const validation = dto.$qCheckRules();
	if (!validation.valid) {
		return { status: 422, body: { errors: validation.errors } };
	}
	return { status: 201, body: dto.$qSerialize() };
}

/**
 * Simulates a Bun WebSocket onMessage handler.
 * Parses the JSON message and validates the order payload.
 */
function handleOrderMessage(rawMessage: string): {
	ok: boolean;
	data?: unknown;
	errors?: string[];
} {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawMessage);
	} catch {
		return { ok: false, errors: ['Invalid JSON message'] };
	}

	if (typeof parsed !== 'object' || parsed === null) {
		return { ok: false, errors: ['Message must be an object'] };
	}

	const dto = new OrderDto(parsed as Record<string, unknown>);
	const validation = dto.$qCheckRules();
	if (!validation.valid) {
		return {
			ok: false,
			errors: validation.errors.map(
				(err: { field: string; message: string; value: unknown }) =>
					err.message
			),
		};
	}
	return { ok: true, data: dto.$qSerialize() };
}

// ---------------------------------------------------------------------------
// 1. Bun.serve fetch handler — product creation
// ---------------------------------------------------------------------------

describe('Bun.serve — ProductDto handler', () => {
	test('returns 201 with serialized DTO for valid payload', () => {
		const raw = {
			id: 'prod-001',
			name: 'Mechanical Keyboard',
			price: '149.99', // string → coerced to number
			stock: '50', // string → coerced to number
			tags: ['peripherals', 'office'],
			createdAt: '2025-01-15T10:00:00.000Z',
			__secret: 'should-be-stripped',
		};

		const result = handleCreateProduct(raw);

		expect(result.status).toBe(201);
		const body = result.body as Record<string, unknown>;
		expect(body.price).toBe(149.99);
		expect(body.stock).toBe(50);
		expect(typeof body.createdAt).toBe('string'); // serialize() → ISO string
		expect(body).not.toHaveProperty('__secret'); // stripped
		expect(body.isAvailable).toBe(true); // @QComputed
		expect(body.formattedPrice).toBe('$149.99'); // @QComputed
	});

	test('returns 422 with validation errors for invalid payload', () => {
		const raw = {
			id: 'prod-002',
			name: 'X', // too short
			price: '-10', // negative
			stock: '-5', // negative integer
			tags: [],
			createdAt: '2025-01-15T10:00:00.000Z',
		};

		const result = handleCreateProduct(raw);

		expect(result.status).toBe(422);
		const body = result.body as { errors: string[] };
		expect(Array.isArray(body.errors)).toBe(true);
		expect(body.errors.length).toBeGreaterThan(0);
	});

	test('returns 400 for non-object body', () => {
		const result = handleCreateProduct('not an object');

		expect(result.status).toBe(400);
	});

	test('strips unknown properties (security)', () => {
		const raw = {
			id: 'prod-003',
			name: 'Mouse Pad XL',
			price: '29.99',
			stock: '100',
			tags: ['accessories'],
			createdAt: '2024-06-01T00:00:00.000Z',
			internalCost: 5.0, // unknown → stripped
			adminFlag: true, // unknown → stripped
		};

		const result = handleCreateProduct(raw);

		expect(result.status).toBe(201);
		const body = result.body as Record<string, unknown>;
		expect(body).not.toHaveProperty('internalCost');
		expect(body).not.toHaveProperty('adminFlag');
	});
});

// ---------------------------------------------------------------------------
// 2. Bun WebSocket onMessage — order processing
// ---------------------------------------------------------------------------

describe('Bun WebSocket — OrderDto message handler', () => {
	test('processes a valid order message successfully', () => {
		const msg = JSON.stringify({
			orderId: 'ord-42',
			customerId: 'cust-7',
			total: '299.50',
			currency: 'EUR',
			placedAt: '2025-03-10T14:00:00.000Z',
			items: ['prod-001', 'prod-009'],
		});

		const result = handleOrderMessage(msg);

		expect(result.ok).toBe(true);
		const data = result.data as Record<string, unknown>;
		expect(data.total).toBe(299.5);
		expect(typeof data.placedAt).toBe('string'); // serialize() → ISO string
		expect(data.summary).toContain('ord-42'); // @QComputed
		expect(data.summary).toContain('2 item(s)');
	});

	test('rejects a message with invalid currency', () => {
		const msg = JSON.stringify({
			orderId: 'ord-43',
			customerId: 'cust-8',
			total: '50',
			currency: 'DOGE',
			placedAt: '2025-03-10T14:00:00.000Z',
			items: ['prod-002'],
		});

		const result = handleOrderMessage(msg);

		expect(result.ok).toBe(false);
		expect(result.errors).toContain('Unsupported currency');
	});

	test('rejects a message with non-positive total', () => {
		const msg = JSON.stringify({
			orderId: 'ord-44',
			customerId: 'cust-9',
			total: '0',
			currency: 'USD',
			placedAt: '2025-03-10T14:00:00.000Z',
			items: [],
		});

		const result = handleOrderMessage(msg);

		expect(result.ok).toBe(false);
		expect(result.errors).toContain('Order total must be positive');
	});

	test('rejects malformed JSON gracefully', () => {
		const result = handleOrderMessage('{invalid json');

		expect(result.ok).toBe(false);
		expect(result.errors?.[0]).toBe('Invalid JSON message');
	});
});

// ---------------------------------------------------------------------------
// 3. Bulk loading — simulating Bun.file() JSON parse
// ---------------------------------------------------------------------------

describe('Bun.file() — bulk product loading with createMany()', () => {
	const productsSeed = [
		{
			id: 'p1',
			name: 'Wireless Mouse',
			price: '39.99',
			stock: '200',
			tags: ['peripherals'],
			createdAt: '2024-01-01T00:00:00.000Z',
		},
		{
			id: 'p2',
			name: 'USB-C Hub',
			price: '55.00',
			stock: '0',
			tags: ['accessories', 'usb'],
			createdAt: '2024-02-01T00:00:00.000Z',
		},
		{
			id: 'p3',
			name: 'Laptop Stand',
			price: '89.95',
			stock: '30',
			tags: ['ergonomics'],
			createdAt: '2024-03-01T00:00:00.000Z',
		},
	];

	test('createMany() coerces all items in bulk', () => {
		const { instances: products } = ProductDto.createMany(
			productsSeed as any[]
		);

		expect(products).toHaveLength(3);
		products.forEach((prod) => {
			expect(typeof prod.price).toBe('number');
			expect(typeof prod.stock).toBe('number');
			expect(prod.createdAt).toBeInstanceOf(Date);
		});
	});

	test('isAvailable @QComputed reflects stock correctly in each item', () => {
		const { instances: products } = ProductDto.createMany(
			productsSeed as any[]
		);

		expect(products[0]?.isAvailable).toBe(true); // stock 200
		expect(products[1]?.isAvailable).toBe(false); // stock 0
		expect(products[2]?.isAvailable).toBe(true); // stock 30
	});

	test('serialize() round-trips cleanly for each item', () => {
		const { instances: products } = ProductDto.createMany(
			productsSeed as any[]
		);

		products.forEach((prod) => {
			const serialized = prod.$qSerialize();
			const restored = new ProductDto(serialized);
			expect(restored.id).toBe(prod.id);
			expect(restored.price).toBe(prod.price);
			expect(restored.stock).toBe(prod.stock);
		});
	});
});

// ---------------------------------------------------------------------------
// 4. Async validation — simulating async Bun handler (e.g. DB uniqueness check)
// ---------------------------------------------------------------------------

// Shared registry simulating a DB or cache
const existingEmailsDb = new Set<string>(['taken@example.com']);

// DTOs with async @QRule (in a real Bun app these predicates would hit a DB)
@Quick(
	{ email: 'string', username: 'string' },
	{ unknownPropertyPolicy: 'strip' }
)
class RegisterDto extends QModel<{ email: string; username: string }> {
	@QRule(
		(val: string) => !existingEmailsDb.has(val),
		'Email already registered'
	)
	declare email: string;
	declare username: string;
}

describe('Bun async handler — qCheckRulesAsync()', () => {
	test('validates with async rules successfully', async () => {
		const dto = new RegisterDto({
			email: 'new@example.com',
			username: 'alice',
		});

		const result = await qCheckRulesAsync(dto);

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('rejects when async rule fails (e.g. duplicate email)', async () => {
		const dto = new RegisterDto({
			email: 'taken@example.com',
			username: 'bob',
		});

		const result = await qCheckRulesAsync(dto);

		expect(result.valid).toBe(false);
		const messages = result.errors.map(
			(err: { field: string; message: string; value: unknown }) =>
				err.message
		);
		expect(messages).toContain('Email already registered');
	});
});

// ---------------------------------------------------------------------------
// 5. JSON Response builder — typical Bun Response pattern
// ---------------------------------------------------------------------------

describe('Bun Response pattern — new Response(JSON.stringify(dto.$qSerialize()))', () => {
	test('serialized DTO produces valid JSON for a Bun Response', () => {
		const raw = {
			id: 'prod-999',
			name: 'Ergonomic Chair',
			price: 399.0,
			stock: 10,
			tags: ['furniture', 'ergonomics'],
			createdAt: new Date('2025-06-01T00:00:00.000Z'),
		};

		const dto = new ProductDto(raw);
		const serialized = dto.$qSerialize();
		const json = JSON.stringify(serialized);

		// Verify the JSON can be parsed back
		const parsed = JSON.parse(json) as Record<string, unknown>;

		expect(parsed.id).toBe('prod-999');
		expect(parsed.name).toBe('Ergonomic Chair');
		expect(parsed.isAvailable).toBe(true);
		expect(parsed.formattedPrice).toBe('$399.00');
		// Date serialized as ISO string (safe for HTTP transport)
		expect(typeof parsed.createdAt).toBe('string');
	});

	test('restored from JSON response retains correct types', () => {
		const original = new ProductDto({
			id: 'prod-777',
			name: 'Standing Desk',
			price: 599.0,
			stock: 5,
			tags: ['furniture'],
			createdAt: new Date('2025-07-15T00:00:00.000Z'),
		});

		// Simulate HTTP round-trip: serialize → JSON string → parse → new model
		const json = JSON.stringify(original.$qSerialize());
		const parsed = JSON.parse(json) as Record<string, unknown>;
		const restored = new ProductDto(parsed);

		expect(restored.id).toBe('prod-777');
		expect(restored.price).toBe(599);
		expect(restored.createdAt).toBeInstanceOf(Date);
		expect(restored.isAvailable).toBe(true);
	});
});

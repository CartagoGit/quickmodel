// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * React Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used in React apps.
 * No React packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - Plain TS classes + @QRule → qCheckRules() for form validation
 * - QModel subclasses for coercion / serialization / store state
 * - merge() is IMMUTABLE: always capture the returned new instance
 * - patch() mutates in place: use for direct updates
 * - createMany() → { instances, errors }
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QComputed, QField } from '@/decorators';
import type { IQAnyRecord } from '@/types';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// 1. useState-compatible form class — React Controlled Components
// ---------------------------------------------------------------------------

class LoginForm {
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Invalid email address'
	)
	email = '';

	@QField({ label: 'Password', widget: 'password', required: true })
	@QRule(
		(value: string) => value.length >= 8,
		'Password must be at least 8 characters'
	)
	@QRule(
		(value: string) => /[A-Z]/.test(value),
		'Password needs at least one uppercase letter'
	)
	@QRule(
		(value: string) => /\d/.test(value),
		'Password needs at least one digit'
	)
	password = '';
}

describe('React — useState controlled form validation', () => {
	let form: LoginForm;

	beforeEach(() => {
		form = new LoginForm();
	});

	test('empty form is invalid', () => {
		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
	});

	test('valid email + strong password passes', () => {
		form.email = 'user@example.com';
		form.password = 'Secret123';
		const result = qCheckRules(form);
		expect(result.valid).toBe(true);
	});

	test('invalid email fails with correct error field', () => {
		form.email = 'not-an-email';
		form.password = 'Secret123';
		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('weak password fails — missing uppercase', () => {
		form.email = 'user@example.com';
		form.password = 'secret123';
		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		const pwdErrors = result.errors.filter(
			(err) => err.field === 'password'
		);
		expect(pwdErrors.length).toBeGreaterThan(0);
	});

	test('weak password fails — too short', () => {
		form.email = 'user@example.com';
		form.password = 'Ab1';
		const result = qCheckRules(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'password')).toBe(
			true
		);
	});

	test('errors include all violated rules per field', () => {
		form.email = 'bad';
		form.password = 'short';
		const result = qCheckRules(form);
		const pwdErrors = result.errors.filter(
			(err) => err.field === 'password'
		);
		// password violates length + uppercase + digit
		expect(pwdErrors.length).toBeGreaterThanOrEqual(2);
	});
});

// ---------------------------------------------------------------------------
// 2. React Hook Form adapter — custom resolver simulation
// ---------------------------------------------------------------------------

class ProductForm {
	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule(
		(value: string) => value.trim().length >= 2,
		'Name must be at least 2 characters'
	)
	@QRule((value: string) => value.trim().length <= 100, 'Name too long')
	name = '';

	@QField({ label: 'Price', widget: 'number' })
	@QRule((value: number) => value > 0, 'Price must be greater than zero')
	@QRule((value: number) => value <= 99999, 'Price too high')
	price = 0;

	@QField({ label: 'Stock', widget: 'number' })
	@QRule(
		(value: number) => Number.isInteger(value) && value >= 0,
		'Stock must be a non-negative integer'
	)
	stock = 0;

	@QField({ widget: 'input', label: 'Category' })
	@QRule(
		(value: string) =>
			['electronics', 'clothing', 'food', 'other'].includes(value),
		'Invalid category'
	)
	category = '';
}

// Simulate react-hook-form resolver shape: { values, errors }
function rhfResolver(instance: ProductForm): {
	values: object;
	errors: Record<string, { message: string }>;
} {
	const result = qCheckRules(instance);
	if (result.valid) {
		return { values: instance, errors: {} };
	}
	const errors: Record<string, { message: string }> = {};
	for (const err of result.errors) {
		if (!errors[err.field]) {
			errors[err.field] = { message: err.message };
		}
	}
	return { values: {}, errors };
}

describe('React — React Hook Form custom resolver adapter', () => {
	test('resolver returns empty errors for valid form', () => {
		const form = new ProductForm();
		form.name = 'Widget Pro';
		form.price = 29.99;
		form.stock = 100;
		form.category = 'electronics';
		const { errors } = rhfResolver(form);
		expect(Object.keys(errors)).toHaveLength(0);
	});

	test('resolver returns per-field errors for invalid form', () => {
		const form = new ProductForm();
		form.name = 'X';
		form.price = -5;
		form.stock = -1;
		form.category = 'invalid';
		const { errors } = rhfResolver(form);
		expect(errors['name']).toBeDefined();
		expect(errors['price']).toBeDefined();
		expect(errors['stock']).toBeDefined();
		expect(errors['category']).toBeDefined();
	});

	test('resolver errors have message strings', () => {
		const form = new ProductForm();
		form.name = 'A';
		form.price = 10;
		form.stock = 5;
		form.category = 'electronics';
		const { errors } = rhfResolver(form);
		expect(typeof errors['name']?.message).toBe('string');
	});

	test('resolver returns values when form is valid', () => {
		const form = new ProductForm();
		form.name = 'Valid Product';
		form.price = 9.99;
		form.stock = 0;
		form.category = 'food';
		const { values } = rhfResolver(form);
		expect(values).toBe(form);
	});
});

// ---------------------------------------------------------------------------
// 3. Server Actions (Next.js) — incoming FormData coercion
// ---------------------------------------------------------------------------

interface IOrderItem {
	productId: string;
	quantity: number;
	unitPrice: number;
	orderedAt: Date;
}

@Quick(
	{
		productId: 'string',
		quantity: 'number',
		unitPrice: 'number',
		orderedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class OrderItemDto extends QModel<IOrderItem> {
	declare productId: string;
	declare quantity: number;
	declare unitPrice: number;
	declare orderedAt: Date;

	@QComputed()
	get totalPrice(): number {
		return this.quantity * this.unitPrice;
	}
}

// Simulate Next.js Server Action receiving raw form data
function processOrderAction(raw: Record<string, unknown>): {
	success: boolean;
	data?: object;
	error?: string;
} {
	try {
		const dto = new OrderItemDto(raw);
		return { success: true, data: dto.$qm.serialize() };
	} catch {
		return { success: false, error: 'Invalid order data' };
	}
}

describe('React/Next.js — Server Action coercion', () => {
	test('coerces string quantity and price to numbers', () => {
		const result = processOrderAction({
			productId: 'prod-1',
			quantity: '3',
			unitPrice: '15.5',
			orderedAt: '2024-06-01T00:00:00.000Z',
		});
		expect(result.success).toBe(true);
		const data = result.data as Record<string, unknown>;
		expect(data['quantity']).toBe(3);
		expect(data['unitPrice']).toBe(15.5);
	});

	test('converts ISO date string to Date and back to ISO in serialize()', () => {
		const dto = new OrderItemDto({
			productId: 'p1',
			quantity: 2,
			unitPrice: 10,
			orderedAt: '2024-01-15T08:00:00.000Z',
		});
		expect(dto.orderedAt).toBeInstanceOf(Date);
		const serialized = dto.$qm.serialize() as Record<string, unknown>;
		expect(typeof serialized['orderedAt']).toBe('string');
	});

	test('@QComputed totalPrice = quantity * unitPrice', () => {
		const dto = new OrderItemDto({
			productId: 'p2',
			quantity: 4,
			unitPrice: 12.5,
			orderedAt: new Date(),
		});
		const out = dto.$qm.serialize() as Record<string, unknown>;
		expect(out['totalPrice']).toBe(50);
	});

	test('strips unknown properties from raw request', () => {
		const dto = new OrderItemDto({
			productId: 'p3',
			quantity: 1,
			unitPrice: 5,
			orderedAt: new Date(),
			__proto__: {},
			internalToken: 'secret',
		});
		const out = dto.$qm.serialize() as Record<string, unknown>;
		expect('internalToken' in out).toBe(false);
	});

	test('createMany handles array of raw items from bulk request', () => {
		const raw = [
			{
				productId: 'a1',
				quantity: '2',
				unitPrice: '10',
				orderedAt: '2024-01-01T00:00:00.000Z',
			},
			{
				productId: 'a2',
				quantity: '5',
				unitPrice: '20',
				orderedAt: '2024-02-01T00:00:00.000Z',
			},
		];
		const { instances, errors } = OrderItemDto.createMany(raw as any[]);
		expect(instances).toHaveLength(2);
		expect(errors).toHaveLength(0);
		const totals = instances.map(
			(item) =>
				(item.$qm.serialize() as Record<string, unknown>)['totalPrice']
		);
		expect(totals).toEqual([20, 100]);
	});
});

// ---------------------------------------------------------------------------
// 4. Zustand-like store pattern with QModel
// ---------------------------------------------------------------------------

interface ICartItem {
	sku: string;
	name: string;
	qty: number;
	price: number;
}

@Quick(
	{ sku: 'string', name: 'string', qty: 'number', price: 'number' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CartItem extends QModel<ICartItem> {
	declare sku: string;
	declare name: string;
	declare qty: number;
	declare price: number;

	@QComputed()
	get subtotal(): number {
		return this.qty * this.price;
	}
}

// Minimal Zustand-like store using QuickModel (pure TS, no Zustand dependency)
class CartStore {
	private items = new Map<string, CartItem>();

	getState(): object[] {
		return [...this.items.values()].map((item) => item.$qm.serialize());
	}

	addItem(data: Record<string, unknown>): void {
		const item = new CartItem(data);
		this.items.set(
			(item as unknown as Record<string, unknown>)['sku'] as string, // @quickmodel-rule-ignore: no-as-unknown
			item
		);
	}

	updateQty(sku: string, qty: number): boolean {
		const item = this.items.get(sku);
		if (!item) return false;
		// Use merge (immutable) to get new state, update store
		const updated = item.$qm.copy({ qty });
		this.items.set(sku, updated);
		return true;
	}

	removeItem(sku: string): boolean {
		return this.items.delete(sku);
	}

	getTotal(): number {
		return [...this.items.values()].reduce(
			(sum, item) => sum + item.qty * item.price,
			0
		);
	}
}

describe('React — Zustand-like store with QModel', () => {
	let store: CartStore;

	beforeEach(() => {
		store = new CartStore();
	});

	test('addItem() adds a coerced item to the store', () => {
		store.addItem({ sku: 'SKU1', name: 'Widget', qty: 2, price: 10 });
		const state = store.getState();
		expect(state).toHaveLength(1);
	});

	test('getState() returns serialized items with @QComputed subtotal', () => {
		store.addItem({ sku: 'SKU2', name: 'Gadget', qty: 3, price: 25 });
		const [item] = store.getState() as Record<string, unknown>[];
		expect(item['subtotal']).toBe(75);
	});

	test('updateQty() uses immutable merge to update quantity', () => {
		store.addItem({ sku: 'SKU3', name: 'Thing', qty: 1, price: 5 });
		const success = store.updateQty('SKU3', 10);
		expect(success).toBe(true);
		const [item] = store.getState() as Record<string, unknown>[];
		expect(item['qty']).toBe(10);
		expect(item['subtotal']).toBe(50);
	});

	test('updateQty() returns false for unknown sku', () => {
		expect(store.updateQty('NONEXISTENT', 5)).toBe(false);
	});

	test('removeItem() removes item from store', () => {
		store.addItem({ sku: 'SKU4', name: 'Gizmo', qty: 1, price: 15 });
		store.removeItem('SKU4');
		expect(store.getState()).toHaveLength(0);
	});

	test('getTotal() sums qty * price across all items', () => {
		store.addItem({ sku: 'A', name: 'Item A', qty: 2, price: 10 });
		store.addItem({ sku: 'B', name: 'Item B', qty: 3, price: 20 });
		expect(store.getTotal()).toBe(80); // 20 + 60
	});

	test('string qty/price are coerced on addItem()', () => {
		store.addItem({ sku: 'SKU5', name: 'Coerced', qty: '5', price: '12' });
		const [item] = store.getState() as Record<string, unknown>[];
		expect(item['qty']).toBe(5);
		expect(item['price']).toBe(12);
	});
});

// ---------------------------------------------------------------------------
// 5. Async validation — email uniqueness (React async form state)
// ---------------------------------------------------------------------------

const registeredEmails = new Set(['existing@example.com', 'admin@react.dev']);

class SignUpForm {
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(async (value: string) => {
		await Bun.sleep(5);
		return !registeredEmails.has(value);
	}, 'Email already taken')
	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Invalid email format'
	)
	email = '';

	@QField({ widget: 'input', label: 'Username', required: true })
	@QRule((value: string) => value.length >= 3, 'Username too short')
	@QRule(
		(value: string) => /^[a-z0-9_]+$/i.test(value),
		'Username: only letters, digits, _'
	)
	username = '';

	@QField({ label: 'Password', widget: 'password' })
	@QRule((value: string) => value.length >= 8, 'Password too short')
	password = '';
}

describe('React — async email uniqueness validation', () => {
	test('valid new email passes async check', async () => {
		const form = new SignUpForm();
		form.email = 'new@example.com';
		form.username = 'new_user';
		form.password = 'Secret123';
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(true);
	});

	test('already registered email fails', async () => {
		const form = new SignUpForm();
		form.email = 'existing@example.com';
		form.username = 'some_user';
		form.password = 'Secret123';
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('multiple errors across fields are all returned', async () => {
		const form = new SignUpForm();
		form.email = 'admin@react.dev'; // taken
		form.username = 'ab'; // too short
		form.password = 'short'; // too short
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		const fields = result.errors.map((err) => err.field);
		expect(fields).toContain('email');
		expect(fields).toContain('username');
		expect(fields).toContain('password');
	});
});

// ---------------------------------------------------------------------------
// 6. useQModel hook simulation — React custom hook pattern
// ---------------------------------------------------------------------------

// Simulate React useState / useReducer pattern for QModel state
class QModelHook<TInterface extends IQAnyRecord> {
	private current: QModel<TInterface>;
	private listeners: Array<() => void> = [];

	constructor(initial: QModel<TInterface>) {
		this.current = initial;
	}

	getSnapshot(): QModel<TInterface> {
		return this.current;
	}

	update(updaterFn: (prev: QModel<TInterface>) => QModel<TInterface>): void {
		this.current = updaterFn(this.current);
		this.listeners.forEach((cb) => cb());
	}

	subscribe(listener: () => void): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((cb) => cb !== listener);
		};
	}
}

interface IUserProfile {
	id: string;
	displayName: string;
	bio: string;
	avatarUrl: string;
}

@Quick(
	{ id: 'string', displayName: 'string', bio: 'string', avatarUrl: 'string' },
	{ unknownPropertyPolicy: 'keep' }
)
class UserProfile extends QModel<IUserProfile> {
	declare id: string;
	declare displayName: string;
	declare bio: string;
	declare avatarUrl: string;

	@QComputed()
	get initials(): string {
		return this.displayName
			.split(' ')
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
}

describe('React — useQModel hook simulation', () => {
	test('getSnapshot() returns current model', () => {
		const hook = new QModelHook(
			new UserProfile({
				id: 'u1',
				displayName: 'Alice Smith',
				bio: 'Dev',
				avatarUrl: '',
			})
		);
		expect((hook.getSnapshot() as unknown as UserProfile).displayName).toBe(
			// @quickmodel-rule-ignore: no-as-unknown
			'Alice Smith'
		);
	});

	test('update() via merge() creates new instance in store', () => {
		const hook = new QModelHook(
			new UserProfile({
				id: 'u2',
				displayName: 'Bob',
				bio: 'Old bio',
				avatarUrl: '',
			})
		);
		hook.update((prev) => prev.$qm.copy({ bio: 'New bio' }));
		expect((hook.getSnapshot() as unknown as UserProfile).bio).toBe(
			// @quickmodel-rule-ignore: no-as-unknown
			'New bio'
		);
	});

	test('@QComputed initials computed from displayName', () => {
		const profile = new UserProfile({
			id: 'u3',
			displayName: 'Carol White',
			bio: '',
			avatarUrl: '',
		});
		const out = profile.$qm.serialize() as Record<string, unknown>;
		expect(out['initials']).toBe('CW');
	});

	test('subscribe() listener is called on update', () => {
		const hook = new QModelHook(
			new UserProfile({
				id: 'u4',
				displayName: 'Dave',
				bio: '',
				avatarUrl: '',
			})
		);
		let callCount = 0;
		hook.subscribe(() => {
			callCount++;
		});
		hook.update((prev) => prev.$qm.copy({ displayName: 'David' }));
		expect(callCount).toBe(1);
	});

	test('unsubscribe() removes listener', () => {
		const hook = new QModelHook(
			new UserProfile({
				id: 'u5',
				displayName: 'Eve',
				bio: '',
				avatarUrl: '',
			})
		);
		let callCount = 0;
		const unsub = hook.subscribe(() => {
			callCount++;
		});
		unsub();
		hook.update((prev) => prev.$qm.copy({ bio: 'updated' }));
		expect(callCount).toBe(0);
	});

	test('getSchema() returns JSON schema for the model', () => {
		const profile = new UserProfile({
			id: 'u6',
			displayName: 'Frank',
			bio: '',
			avatarUrl: '',
		});
		const schema = profile.getSchema('json');
		expect(schema).toBeDefined();
	});
});

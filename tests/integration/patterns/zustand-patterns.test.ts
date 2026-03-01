// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Zustand Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used with Zustand v5.
 * No Zustand package imported — pure TypeScript logic only (store pattern simulated).
 *
 * Key patterns:
 * - QModel as Zustand slice state with merge() as immutable updater
 * - persist middleware roundtrip: serialize() ↔ new Dto(cached)
 * - Normalized list store: Map<id, QModel> + createMany()
 * - immer vs merge(): why merge() is superior for QModel
 * - Shallow selector optimization with serialize()
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QComputed, QField } from '@/decorators';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUser {
	id: string;
	name: string;
	email: string;
	age: number;
	plan: string;
	fullLabel?: string;
}

interface ICartItem {
	productId: string;
	name: string;
	qty: number;
	price: number;
	total?: number;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		email: 'string',
		age: 'number',
		plan: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserModel extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare age: number;
	declare plan: string;

	@QComputed()
	get fullLabel(): string {
		return `${this.name} (${this.plan})`;
	}
}

@Quick(
	{ productId: 'string', name: 'string', qty: 'number', price: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class CartItemModel extends QModel<ICartItem> {
	@QField({ widget: 'input', label: 'Quantity' })
	@QRule((val: number) => val >= 1, 'Quantity must be at least 1')
	@QRule((val: number) => val <= 99, 'Quantity limit exceeded')
	declare qty: number;

	declare productId: string;
	declare name: string;
	declare price: number;

	@QComputed()
	get total(): number {
		return this.qty * this.price;
	}
}

// ---------------------------------------------------------------------------
// Simulated Zustand store (minimal in-memory implementation)
// ---------------------------------------------------------------------------

function createUserStore() {
	let state = new UserModel({
		id: 'u1',
		name: 'Alice',
		email: 'alice@example.com',
		age: 30,
		plan: 'free',
	});

	return {
		get: () => state,
		update: (patch: Partial<IUser>) => {
			state = state.copy(patch);
		},
		reset: (initialData: Record<string, unknown>) => {
			state = new UserModel(initialData);
		},
	};
}

function createCartStore() {
	const items = new Map<string, CartItemModel>();

	return {
		get: () => items,
		addItem: (data: Record<string, unknown>) => {
			const item = new CartItemModel(data);
			items.set(item.productId, item);
		},
		updateQty: (productId: string, qty: number) => {
			const current = items.get(productId);
			if (!current) return;
			items.set(productId, current.copy({ qty }));
		},
		removeItem: (productId: string) => {
			items.delete(productId);
		},
		total: () =>
			[...items.values()].reduce((sum, item) => sum + item.total, 0),
		getAll: () => [...items.values()].map((item) => item.serialize()),
	};
}

// ---------------------------------------------------------------------------
// 1. Basic user store — merge() as immutable updater
// ---------------------------------------------------------------------------

describe('Zustand — Basic store: merge() as immutable updater', () => {
	let store: ReturnType<typeof createUserStore>;

	beforeEach(() => {
		store = createUserStore();
	});

	test('initial state has correct properties', () => {
		const user = store.get();
		expect(user.name).toBe('Alice');
		expect(user.age).toBe(30);
	});

	test('update() returns new state via merge()', () => {
		const before = store.get();
		store.update({ name: 'Bob' });
		const after = store.get();
		expect(after).not.toBe(before); // immutable
		expect(after.name).toBe('Bob');
	});

	test('partial update preserves unmodified fields', () => {
		store.update({ name: 'Charlie' });
		expect(store.get().email).toBe('alice@example.com');
		expect(store.get().age).toBe(30);
	});

	test('@QComputed fullLabel recalculates after update', () => {
		store.update({ plan: 'pro' });
		expect(store.get().fullLabel).toBe('Alice (pro)');
	});

	test('multiple successive updates return latest state', () => {
		store.update({ age: 31 });
		store.update({ age: 32 });
		store.update({ age: 33 });
		expect(store.get().age).toBe(33);
	});

	test('original instance is not mutated after update', () => {
		const snapshot = store.get();
		store.update({ name: 'Delta' });
		expect(snapshot.name).toBe('Alice'); // original unchanged
	});
});

// ---------------------------------------------------------------------------
// 2. Cart store — normalized Map<id, QModel>
// ---------------------------------------------------------------------------

describe('Zustand — Normalized Map store with CartItemModel', () => {
	let cart: ReturnType<typeof createCartStore>;

	beforeEach(() => {
		cart = createCartStore();
		cart.addItem({ productId: 'p1', name: 'Widget', qty: 2, price: 10 });
		cart.addItem({ productId: 'p2', name: 'Bolt', qty: 5, price: 1 });
	});

	test('items are stored as CartItemModel instances', () => {
		const item = cart.get().get('p1');
		expect(item).toBeInstanceOf(CartItemModel);
	});

	test('@QComputed total is correct', () => {
		const item = cart.get().get('p1');
		expect(item?.total).toBe(20); // 2 * 10
	});

	test('updateQty replaces item with new instance', () => {
		const before = cart.get().get('p1');
		cart.updateQty('p1', 5);
		const after = cart.get().get('p1');
		expect(after).not.toBe(before); // immutable
		expect(after?.qty).toBe(5);
		expect(after?.total).toBe(50);
	});

	test('cart total aggregates all items', () => {
		expect(cart.total()).toBe(25); // (2*10) + (5*1)
	});

	test('cart total recalculates after qty update', () => {
		cart.updateQty('p2', 10);
		expect(cart.total()).toBe(30); // (2*10) + (10*1)
	});

	test('getAll() returns serialized items', () => {
		const serialized = cart.getAll();
		expect(serialized).toHaveLength(2);
		serialized.forEach((item) => {
			expect(typeof item).toBe('object');
			expect((item as Record<string, unknown>)['qty']).toBeDefined();
		});
	});

	test('removeItem deletes from store', () => {
		cart.removeItem('p1');
		expect(cart.get().has('p1')).toBe(false);
		expect(cart.total()).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// 3. Persist middleware — serialize() ↔ rehydrate roundtrip
// ---------------------------------------------------------------------------

describe('Zustand — persist middleware: serialize ↔ rehydrate', () => {
	// Simulate persist: save to "storage" then restore
	function serializeState(model: UserModel): string {
		return JSON.stringify(model.serialize());
	}

	function deserializeState(stored: string): UserModel {
		return new UserModel(JSON.parse(stored) as Record<string, unknown>);
	}

	test('serialize → JSON.stringify → parse → new Model roundtrip', () => {
		const original = new UserModel({
			id: 'u2',
			name: 'Eve',
			email: 'eve@example.com',
			age: 27,
			plan: 'pro',
		});
		const stored = serializeState(original);
		const restored = deserializeState(stored);

		expect(restored.id).toBe(original.id);
		expect(restored.name).toBe(original.name);
		expect(restored.email).toBe(original.email);
		expect(restored.age).toBe(original.age);
		expect(restored.plan).toBe(original.plan);
	});

	test('restored model has correct @QComputed values', () => {
		const original = new UserModel({
			id: 'u3',
			name: 'Frank',
			email: 'f@example.com',
			age: 35,
			plan: 'enterprise',
		});
		const restored = deserializeState(serializeState(original));
		expect(restored.fullLabel).toBe('Frank (enterprise)');
	});

	test('restored model can be updated via merge() — model is flagged dirty', () => {
		const original = new UserModel({
			id: 'u4',
			name: 'Gina',
			email: 'g@example.com',
			age: 40,
			plan: 'free',
		});
		const restored = deserializeState(serializeState(original));
		const updated = restored.copy({ plan: 'pro' });
		expect(updated.plan).toBe('pro');
		expect(updated.isDirty()).toBe(true); // model has pending changes
	});

	test('types are preserved after JSON roundtrip', () => {
		const original = new UserModel({
			id: 'u5',
			name: 'Hank',
			email: 'h@example.com',
			age: '28' as unknown as number, // @quickmodel-rule-ignore: no-as-unknown
			plan: 'free',
		});
		const restored = deserializeState(serializeState(original));
		expect(typeof restored.age).toBe('number');
	});
});

// ---------------------------------------------------------------------------
// 4. createMany() for bulk store population
// ---------------------------------------------------------------------------

describe('Zustand — createMany() for bulk load into store', () => {
	const rawUsers = [
		{
			id: 'u10',
			name: 'User One',
			email: 'u1@example.com',
			age: '22',
			plan: 'free',
			_srv: 'x',
		},
		{
			id: 'u11',
			name: 'User Two',
			email: 'u2@example.com',
			age: '33',
			plan: 'pro',
			_srv: 'y',
		},
		{
			id: 'u12',
			name: 'User Three',
			email: 'u3@example.com',
			age: '44',
			plan: 'enterprise',
			_srv: 'z',
		},
	];

	test('createMany() populates all items correctly', () => {
		const { instances, errors } = UserModel.createMany(rawUsers as any[]);
		expect(errors).toHaveLength(0);
		expect(instances).toHaveLength(3);
	});

	test('createMany() coerces age strings to numbers', () => {
		const { instances } = UserModel.createMany(rawUsers as any[]);
		instances.forEach((user) => {
			expect(typeof user.age).toBe('number');
		});
	});

	test('createMany() strips server fields', () => {
		const { instances } = UserModel.createMany(rawUsers as any[]);
		const serialized = instances.map((usr) => usr.serialize()) as Array<
			Record<string, unknown>
		>;
		serialized.forEach((item) => {
			expect(item).not.toHaveProperty('_srv');
		});
	});

	test('normalized Map is built from createMany()', () => {
		const { instances } = UserModel.createMany(rawUsers as any[]);
		const store = new Map(instances.map((usr) => [usr.id, usr]));
		expect(store.size).toBe(3);
		expect(store.get('u11')?.plan).toBe('pro');
	});
});

// ---------------------------------------------------------------------------
// 5. immer vs merge() — merge() is preferred with QModel
// ---------------------------------------------------------------------------

describe('Zustand — merge() vs immer compatibility', () => {
	test('merge() returns a new instance (immutable — no immer needed)', () => {
		const model = new CartItemModel({
			productId: 'p3',
			name: 'Screw',
			qty: 10,
			price: 0.5,
		});
		const updated = model.copy({ qty: 20 });

		expect(updated).not.toBe(model); // new instance
		expect(updated.qty).toBe(20);
		expect(model.qty).toBe(10); // original unchanged
	});

	test('merge() triggers @QComputed recalculation', () => {
		const model = new CartItemModel({
			productId: 'p4',
			name: 'Nut',
			qty: 3,
			price: 2,
		});
		const updated = model.copy({ qty: 6 });
		expect(updated.total).toBe(12);
	});

	test('chained merge() calls accumulate changes', () => {
		const model = new CartItemModel({
			productId: 'p5',
			name: 'Washer',
			qty: 1,
			price: 0.25,
		});
		const final = model.copy({ qty: 5 }).copy({ price: 0.5 });
		expect(final.qty).toBe(5);
		expect(final.price).toBe(0.5);
		expect(final.total).toBe(2.5);
	});
});

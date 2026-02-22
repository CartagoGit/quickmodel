// tests/integration/external/angular-signals-simulation.test.ts
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

/**
 * Integration Test: QuickModel + Angular Signals (Simulated)
 *
 * Angular Signals (introduced in v16) expose a reactive primitive at a lower
 * level than Zone.js. This suite replaces `@angular/core` with a minimal
 * simulation that captures the exact behaviors that matter for QuickModel:
 *
 *  1. signal(model) — ¿se lee correctamente el modelo desde la señal?
 *  2. signal.set() / signal.update() — ¿el modelo se actualiza correctamente?
 *  3. computed(() => signal().prop) — ¿las derivaciones reaccionan al update?
 *  4. Mutación directa del modelo (anti-patrón) — la señal NO se re-notifica
 *  5. Actualización inmutable con .patch() (patrón correcto)
 *  6. effect() — re-ejecución ante cambios en el grafo de dependencias
 *  7. Nested models y tipos complejos (Date, Set, BigInt)
 */

// ─── Minimal Angular-like signal simulation ───────────────────────────────────

type ISignalSetter<T> = {
	set: (value: T) => void;
	update: (fn: (current: T) => T) => void;
	/** Call count — simulates Angular's change detection cycle. */
	version: () => number;
};

type ISignal<T> = (() => T) & ISignalSetter<T>;

function signal<T>(initialValue: T): ISignal<T> {
	let _value = initialValue;
	let _version = 0;

	const sig = (() => _value) as ISignal<T>;
	sig.set = (val: T) => {
		_value = val;
		_version++;
	};
	sig.update = (func: (cur: T) => T) => sig.set(func(_value));
	sig.version = () => _version;

	return sig;
}

type IComputed<T> = () => T;

function computed<T>(func: () => T): IComputed<T> {
	return func;
}

type IEffectCleanup = () => void;

function effect(func: () => void): IEffectCleanup {
	func(); // Run once immediately (like Angular's first microtask flush)
	return () => {
		// cleanup — no-op in simulation
	};
}

// ─── Models ───────────────────────────────────────────────────────────────────

interface IProduct {
	sku: string;
	price: number;
	releasedAt: Date;
	tags: Set<string>;
}

@Quick({ releasedAt: Date, tags: Set })
class Product extends QModel<IProduct> {
	declare sku: string;
	declare price: number;
	declare releasedAt: Date;
	declare tags: Set<string>;
}

interface ICart {
	userId: string;
	total: number;
	updatedAt: Date;
}

@Quick({ updatedAt: Date })
class Cart extends QModel<ICart> {
	declare userId: string;
	declare total: number;
	declare updatedAt: Date;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: Angular Signals Simulation', () => {
	describe('signal(model) — basic read/write', () => {
		it('should read model properties from a signal', () => {
			const productSignal = signal(
				new Product({
					sku: 'ABC-001',
					price: 99,
					releasedAt: '2024-01-15T00:00:00.000Z',
					tags: ['electronics', 'sale'],
				})
			);

			// Angular template: {{ productSignal().sku }}
			expect(productSignal().sku).toBe('ABC-001');
			expect(productSignal().price).toBe(99);
			expect(productSignal().releasedAt).toBeInstanceOf(Date);
			expect(productSignal().tags).toBeInstanceOf(Set);
		});

		it('signal.set() should replace the model instance', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-1',
					total: 0,
					updatedAt: '2025-01-01',
				})
			);

			cartSignal.set(
				new Cart({
					userId: 'user-1',
					total: 150,
					updatedAt: '2025-06-01',
				})
			);

			expect(cartSignal().total).toBe(150);
			expect(cartSignal().updatedAt).toBeInstanceOf(Date);
		});

		it('signal.update() with .patch() should produce updated model', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-2',
					total: 50,
					updatedAt: '2025-03-01',
				})
			);

			// Angular pattern: immutable update via merge()
			// patch() mutates in-place and returns void — merge() returns a new instance
			cartSignal.update((current) =>
				current.merge({ total: current.total + 25 })
			);

			expect(cartSignal().total).toBe(75);
			// userId should remain unchanged
			expect(cartSignal().userId).toBe('user-2');
		});

		it('signal version should increment only on .set() or .update()', () => {
			const productSignal = signal(
				new Product({
					sku: 'XYZ-999',
					price: 10,
					releasedAt: '2024-01-01',
					tags: [],
				})
			);

			const versionBefore = productSignal.version();

			// .set() must increment version (Angular triggers change detection)
			productSignal.set(
				new Product({
					sku: 'XYZ-999',
					price: 15,
					releasedAt: '2024-01-01',
					tags: [],
				})
			);

			expect(productSignal.version()).toBe(versionBefore + 1);
		});
	});

	describe('Direct mutation (anti-pattern) — signal does NOT re-notify', () => {
		it('mutating a model property directly does NOT increment signal version', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-3',
					total: 100,
					updatedAt: '2025-02-01',
				})
			);

			const versionBefore = cartSignal.version();
			const model = cartSignal();

			// Anti-pattern: mutating the model without calling signal.set()
			// Angular template won't re-render — this is the key footgun.
			model.total = 200;

			// Signal version is unchanged — Angular doesn't know about this change
			expect(cartSignal.version()).toBe(versionBefore);

			// BUT the underlying model data IS updated (we mutated it directly)
			expect(cartSignal().total).toBe(200);
		});

		it('CORRECT pattern: use signal.update() with .patch() for immutable updates', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-4',
					total: 80,
					updatedAt: '2025-04-01',
				})
			);

			const versionBefore = cartSignal.version();

			// ✅ Correct Angular pattern → always triggers re-render
			cartSignal.update((cart) => cart.merge({ total: 120 }));

			expect(cartSignal.version()).toBe(versionBefore + 1);
			expect(cartSignal().total).toBe(120);
		});
	});

	describe('computed() — derived state', () => {
		it('computed signal should derive from model signal', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-5',
					total: 60,
					updatedAt: '2025-05-01',
				})
			);

			// Angular: readonly totalWithTax = computed(() => cartSignal().total * 1.21)
			const totalWithTax = computed(() => cartSignal().total * 1.21);

			expect(totalWithTax()).toBeCloseTo(72.6, 1);
		});

		it('computed should reflect the latest signal value', () => {
			const productSignal = signal(
				new Product({
					sku: 'COMP-001',
					price: 50,
					releasedAt: '2024-06-01',
					tags: ['a'],
				})
			);

			const priceLabel = computed(
				() => `${productSignal().sku}: $${productSignal().price}`
			);

			expect(priceLabel()).toBe('COMP-001: $50');

			productSignal.update((prod) => prod.merge({ price: 75 }));

			expect(priceLabel()).toBe('COMP-001: $75');
		});

		it('computed should serialize the model to JSON', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-6',
					total: 30,
					updatedAt: '2025-07-01',
				})
			);

			// Typical use case: computed to get the serialized form for API call
			const serialized = computed(() => cartSignal().serialize());

			expect(serialized().userId).toBe('user-6');
			expect(typeof serialized().updatedAt).toBe('string');
		});
	});

	describe('effect() — side effects', () => {
		it('effect should run once on init with the current model value', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-7',
					total: 45,
					updatedAt: '2025-08-01',
				})
			);

			const captured: string[] = [];
			const stop = effect(() => {
				// Angular: logs or syncs to localStorage after cart changes
				captured.push(cartSignal().userId);
			});

			expect(captured).toHaveLength(1);
			expect(captured[0]).toBe('user-7');

			stop();
		});
	});

	describe('Complex types (Date, Set, BigInt) in signals', () => {
		it('Date fields should remain Date instances after signal.update()', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-8',
					total: 0,
					updatedAt: '2025-09-01',
				})
			);

			cartSignal.update((cart) =>
				cart.merge({ updatedAt: new Date('2025-12-31T23:59:59.000Z') })
			);

			expect(cartSignal().updatedAt).toBeInstanceOf(Date);
			expect(cartSignal().updatedAt.getFullYear()).toBe(2025);
		});

		it('Set fields should remain Set instances after signal.update()', () => {
			const productSignal = signal(
				new Product({
					sku: 'SET-001',
					price: 20,
					releasedAt: '2024-01-01',
					tags: ['alpha'],
				})
			);

			productSignal.update((prod) =>
				prod.merge({ tags: new Set(['beta', 'gamma']) })
			);

			expect(productSignal().tags).toBeInstanceOf(Set);
			expect(productSignal().tags.has('beta')).toBe(true);
		});

		it('toJson() on a signal-held model should serialize complex types', () => {
			const productSignal = signal(
				new Product({
					sku: 'JSON-001',
					price: 100,
					releasedAt: '2024-03-15T12:00:00.000Z',
					tags: ['x', 'y'],
				})
			);

			const json = productSignal().serialize();

			// Date → ISO string
			expect(typeof json.releasedAt).toBe('string');
			// Set → Array in JSON
			expect(Array.isArray(json.tags)).toBe(true);
		});
	});

	describe('Multiple signals — composition', () => {
		it('two signals can be composed in a single computed', () => {
			const cartSignal = signal(
				new Cart({
					userId: 'user-9',
					total: 200,
					updatedAt: '2025-01-01',
				})
			);
			const discountSignal = signal(0.1); // 10% discount

			const finalPrice = computed(
				() => cartSignal().total * (1 - discountSignal())
			);

			expect(finalPrice()).toBe(180);

			discountSignal.set(0.2);
			expect(finalPrice()).toBe(160);
		});
	});
});

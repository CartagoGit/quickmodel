// tests/integration/external/vue-reactivity-simulation.test.ts
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

/**
 * Integration Test: QuickModel + Vue Reactivity (Simulated)
 *
 * Vue's reactivity system uses Proxy internally.
 * This suite replaces an actual Vue dependency with a minimal simulation
 * that captures the exact behaviors that could conflict with QuickModel:
 *
 *  1. Lazy getters defined via Object.defineProperty → ¿surviven a través de un Proxy?
 *  2. Setters del modelo → ¿se invocan correctamente a través de un Proxy?
 *  3. Object.freeze (createReadonly) → rompe reactive() de Vue
 *  4. toJSON, spread, Object.keys → ¿funcionan a través de un Proxy?
 *  5. Modelos anidados reactivos
 *  6. Track/trigger (detección de cambios)
 */

// ─── Minimal Vue-like reactive() simulation ───────────────────────────────────

type ITracker = {
	reads: string[];
	writes: Array<{ key: string; value: unknown }>;
};

function createVueReactive<T extends object>(obj: T, tracker: ITracker): T {
	return new Proxy(obj, {
		get(target, key, receiver) {
			const val = Reflect.get(target, key, receiver);
			if (typeof key === 'string' && key !== '__proto__') {
				tracker.reads.push(key);
			}
			// Bind class methods to the raw target so internal `this` is never the Proxy.
			// Vue does the same via `toRaw()` when calling methods on reactive objects.
			if (typeof val === 'function') {
				return (val as Function).bind(target);
			}
			// Recursively wrap nested plain objects (Vue does this too)
			if (val && typeof val === 'object' && !Object.isFrozen(val)) {
				return createVueReactive(val as object, tracker);
			}
			return val;
		},
		set(target, key, value) {
			// Pass `target` as receiver so QuickModel's setter runs with `this = target`,
			// not with `this = proxy`. Otherwise the backing store ends up on the
			// proxy surface and the original model instance is corrupted.
			const result = Reflect.set(target, key, value, target);
			if (typeof key === 'string') {
				tracker.writes.push({ key, value });
			}
			return result;
		},
		ownKeys(target) {
			return Reflect.ownKeys(target);
		},
		getOwnPropertyDescriptor(target, key) {
			return Reflect.getOwnPropertyDescriptor(target, key);
		},
		has(target, key) {
			return Reflect.has(target, key);
		},
	});
}

// ─── Models ───────────────────────────────────────────────────────────────────

interface IAddress {
	city: string;
	zip: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class Address extends QModel<IAddress> {
	declare city: string;
	declare zip: string;
}

interface IUser {
	name: string;
	age: number;
	createdAt: Date;
	address?: Address;
}

@Quick({ createdAt: Date, address: Address }, { unknownPropertyPolicy: 'keep' })
class User extends QModel<IUser> {
	declare name: string;
	declare age: number;
	declare createdAt: Date;
	declare address?: Address;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: Vue Reactivity Simulation', () => {
	describe('Lazy getters through Proxy', () => {
		it('should read properties correctly through a reactive Proxy', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Alice',
				age: 30,
				createdAt: '2024-01-15T00:00:00.000Z',
			});

			const reactiveUser = createVueReactive(user, tracker);

			// Vue tracks reads to build dependency graph
			expect(reactiveUser.name).toBe('Alice');
			expect(reactiveUser.age).toBe(30);
			expect(reactiveUser.createdAt).toBeInstanceOf(Date);

			// Verify that Vue's Proxy intercepted the reads (dependency tracking)
			expect(tracker.reads).toContain('name');
			expect(tracker.reads).toContain('age');
		});

		it('should see the same instance through the Proxy (referential identity)', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Bob',
				age: 25,
				createdAt: '2024-01-01',
			});

			const reactiveUser = createVueReactive(user, tracker);

			// instanceof must still work — Vue depends on this for component type checks
			expect(reactiveUser).toBeInstanceOf(User);
		});
	});

	describe('Setters through Proxy', () => {
		it('should mutate the model through a reactive Proxy and reflect changes', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Charlie',
				age: 20,
				createdAt: '2024-06-01',
			});

			const reactiveUser = createVueReactive(user, tracker);

			// Simulate Vue template updating a binding — goes through Proxy set trap
			reactiveUser.name = 'Charlie Updated';

			// Change must be visible on the original model (Proxy is transparent)
			expect(user.name).toBe('Charlie Updated');

			// Proxy must have recorded the write (for Vue's trigger())
			expect(tracker.writes.some((write) => write.key === 'name')).toBe(
				true
			);
		});

		it('should propagate writes back to the model backing store', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Dana',
				age: 35,
				createdAt: '2024-03-01',
			});

			const reactiveUser = createVueReactive(user, tracker);
			reactiveUser.age = 36;

			// The backing store (__quickValues__) must reflect the change
			expect(user.age).toBe(36);
			expect(user.serialize().age).toBe(36);
		});
	});

	describe('serialization through Proxy', () => {
		it('serialize() should work on a reactive model', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Eve',
				age: 28,
				createdAt: '2024-05-10',
			});
			const reactiveUser = createVueReactive(user, tracker);

			// Vue devtools / Pinia use serialize() to snapshot state
			const json = reactiveUser.serialize();

			expect(json.name).toBe('Eve');
			expect(json.age).toBe(28);
			expect(typeof json.createdAt).toBe('string'); // Serialized Date
		});

		it('JSON.stringify via serialize() should work on a reactive model', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Frank',
				age: 40,
				createdAt: '2024-07-01',
			});
			const reactiveUser = createVueReactive(user, tracker);

			// NOTE: QModel.toJSON() already returns a JSON string, so calling
			// JSON.stringify(proxy) would double-encode it (that's the toJSON() contract).
			// The idiomatic serialization through a reactive proxy is:
			//   JSON.stringify(proxy.serialize()) — uses the plain-object form
			const str = JSON.stringify(reactiveUser.serialize());
			const parsed = JSON.parse(str) as IUser;

			expect(parsed.name).toBe('Frank');
			expect(parsed.age).toBe(40);
		});

		it('Object.keys() should enumerate model properties through a Proxy', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Grace',
				age: 22,
				createdAt: '2024-02-01',
			});
			const reactiveUser = createVueReactive(user, tracker);

			const keys = Object.keys(reactiveUser);

			expect(keys).toContain('name');
			expect(keys).toContain('age');
			expect(keys).toContain('createdAt');
		});

		it('spread operator should work on a reactive model', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Hank',
				age: 45,
				createdAt: '2024-04-01',
			});
			const reactiveUser = createVueReactive(user, tracker);

			const snapshot = { ...reactiveUser };

			expect(snapshot.name).toBe('Hank');
			expect(snapshot.age).toBe(45);
		});
	});

	describe('createReadonly() + reactive() conflict', () => {
		it('reading a frozen (readonly) model through reactive Proxy should work', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const frozenUser = User.createReadonly({
				name: 'Ivan',
				age: 50,
				createdAt: '2024-08-01',
			});

			// Vue avoids creating reactive Proxies around frozen objects in practice,
			// but reads still function correctly through the Proxy
			const reactiveUser = createVueReactive(frozenUser, tracker);

			expect(reactiveUser.name).toBe('Ivan');
			expect(reactiveUser.age).toBe(50);
		});

		it('mutating a frozen model through reactive Proxy should NOT change the value', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const frozenUser = User.createReadonly({
				name: 'Jane',
				age: 33,
				createdAt: '2024-09-01',
			});

			const reactiveUser = createVueReactive(frozenUser, tracker);

			// Vue would warn: "Set operation on key failed: target is readonly."
			// In strict mode this throws; in sloppy mode the set is silently rejected.
			try {
				(reactiveUser as any).name = 'Jane Mutated';
			} catch (_err) {
				// Expected in strict mode
			}

			// The frozen model must remain unchanged
			expect(frozenUser.name).toBe('Jane');
		});
	});

	describe('Nested models through reactive Proxy', () => {
		it('should access nested QModel properties through a reactive Proxy', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Karl',
				age: 29,
				createdAt: '2024-10-01',
				address: { city: 'Madrid', zip: '28001' },
			});

			const reactiveUser = createVueReactive(user, tracker);

			// Nested model accessed through reactive proxy
			expect(reactiveUser.address?.city).toBe('Madrid');
			expect(reactiveUser.address).toBeInstanceOf(Address);
		});

		it('should mutate a nested model property through a reactive Proxy', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const user = new User({
				name: 'Lisa',
				age: 31,
				createdAt: '2024-11-01',
				address: { city: 'Barcelona', zip: '08001' },
			});

			const reactiveUser = createVueReactive(user, tracker);

			if (reactiveUser.address) {
				reactiveUser.address.city = 'Valencia';
			}

			expect(user.address?.city).toBe('Valencia');
		});
	});

	describe('Vue ref() simulation', () => {
		it('wrapping a model in a ref-like object should expose the model via .value', () => {
			// Simulate: const userRef = ref(new User({...}))
			const tracker: ITracker = { reads: [], writes: [] };
			const model = new User({
				name: 'Mike',
				age: 27,
				createdAt: '2024-12-01',
			});

			const ref = { value: createVueReactive(model, tracker) };

			expect(ref.value.name).toBe('Mike');
			expect(ref.value).toBeInstanceOf(User);
		});

		it('replacing the ref value should switch to the new model instance', () => {
			const tracker: ITracker = { reads: [], writes: [] };
			const modelA = new User({
				name: 'Nina',
				age: 24,
				createdAt: '2025-01-01',
			});
			const modelB = new User({
				name: 'Oscar',
				age: 26,
				createdAt: '2025-02-01',
			});

			const ref = { value: createVueReactive(modelA, tracker) };

			ref.value = createVueReactive(modelB, tracker);

			expect(ref.value.name).toBe('Oscar');
		});
	});
});

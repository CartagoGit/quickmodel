# Zustand Integration

QuickModel's `copy()` method is a natural fit for Zustand stores — it returns a **new
immutable instance**, keeping state updates predictable and avoiding the need for Immer.

## Key Patterns

| Pattern                  | QuickModel API                            |
| ------------------------ | ----------------------------------------- |
| Immutable state update   | `item.copy(patch)` → new instance         |
| Normalized Map store     | `createMany()` → `Map<id, instance>`      |
| Persist middleware       | `serialize()` / `new Dto(stored)`         |
| Reactive computed values | `@QComputed` — recalculates on every read |
| Bulk initial load        | `Dto.createMany(apiData)`                 |

## Installation

```bash
npm install quickmodel zustand
```

## Model Setup

```typescript
import { QModel, Quick, QField, QComputed } from 'quickmodel';

interface IUser {
	id: string;
	name: string;
	email: string;
	age: number;
	plan: 'free' | 'pro';
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
		return `${this.name} <${this.email}> [${this.plan}]`;
	}
}
```

## Basic Store — copy() as Immutable Updater

`merge(patch)` returns a **new instance** with patched fields. The original is never mutated,
and `@QComputed` values recalculate automatically on the new instance.

```typescript
import { create } from 'zustand';

interface IUserStore {
	user: UserModel | null;
	setUser: (user: UserModel) => void;
	updateUser: (patch: Partial<IUser>) => void;
}

const useUserStore = create<IUserStore>((set, get) => ({
	user: null,

	setUser: (user) => set({ user }),

	updateUser: (patch) => {
		const current = get().user;
		if (!current) return;
		set({ user: current.$qm.copy(patch) }); // immutable update — no Immer needed
	},
}));

// Usage
const { user, updateUser } = useUserStore();
updateUser({ plan: 'pro' });
console.log(user?.fullLabel); // @QComputed recalculated
```

## Normalized Map Store

Use `createMany()` to bulk-load from an API and `Map` for O(1) access by ID:

```typescript
interface ICartStore {
	items: Map<string, CartItemModel>;
	addItem: (item: ICartItem) => void;
	updateQty: (productId: string, qty: number) => void;
	removeItem: (productId: string) => void;
	total: number;
}

const useCartStore = create<ICartStore>((set, get) => ({
	items: new Map(),

	addItem: (item) =>
		set((state) => {
			const dto = new CartItemModel(item);
			const next = new Map(state.items);
			next.set(dto.productId, dto);
			return { items: next };
		}),

	updateQty: (productId, qty) =>
		set((state) => {
			const existing = state.items.get(productId);
			if (!existing) return state;
			const next = new Map(state.items);
			next.set(productId, existing.$qm.copy({ qty })); // immutable merge
			return { items: next };
		}),

	removeItem: (productId) =>
		set((state) => {
			const next = new Map(state.items);
			next.delete(productId);
			return { items: next };
		}),

	get total() {
		return [...get().items.values()].reduce(
			(sum, item) => sum + item.subtotal,
			0
		);
	},
}));
```

## Persist Middleware

Serialize on write, rehydrate on read. Works with `zustand/middleware` `persist`:

```typescript
import { persist } from 'zustand/middleware';

// Serialize for storage
function serializeState(user: UserModel): object {
	return user.$qm.serialize() as object;
}

// Rehydrate from storage
function deserializeState(data: object): UserModel {
	return new UserModel(data);
}

const usePersistedUserStore = create<IUserStore>()(
	persist(
		(set, get) => ({
			user: null,
			setUser: (user) => set({ user }),
			updateUser: (patch) => {
				const current = get().user;
				if (!current) return;
				set({ user: current.$qm.copy(patch) });
			},
		}),
		{
			name: 'user-store',
			storage: {
				getItem: (name) => {
					const raw = localStorage.getItem(name);
					if (!raw) return null;
					const parsed = JSON.parse(raw);
					// Rehydrate UserModel instances
					if (parsed.state?.user) {
						parsed.state.user = deserializeState(parsed.state.user);
					}
					return parsed;
				},
				setItem: (name, value) => {
					const serializable = {
						...value,
						state: {
							...value.state,
							user: value.state.user
								? serializeState(value.state.user)
								: null,
						},
					};
					localStorage.setItem(name, JSON.stringify(serializable));
				},
				removeItem: (name) => localStorage.removeItem(name),
			},
		}
	)
);
```

## Bulk Loading from API

```typescript
async function loadUsersIntoStore() {
	const response = await fetch('/api/users');
	const rawUsers: unknown[] = await response.json();
	const { instances, errors } = UserModel.createMany(rawUsers);

	if (errors.length > 0) {
		console.warn('Some users failed validation:', errors);
	}

	// Build normalized Map
	const userMap = new Map(instances.map((u) => [u.id, u]));
	useUserListStore.setState({ users: userMap });
}
```

## copy() vs Immer

Immer requires a `produce()` wrapper to enable structural sharing. With QuickModel, `copy()`
is already immutable and returns a typed instance with recalculated `@QComputed` fields:

```typescript
// ❌ With Immer
set(
	produce((state) => {
		state.user.plan = 'pro';
	})
);

// ✅ With QuickModel copy()
const current = get().user;
set({ user: current.$qm.copy({ plan: 'pro' }) });
// @QComputed values recalculate automatically — no stale references
```

## See Also

- [QModel API Reference](./qmodel.md)
- [React Integration](./react-integration.md)
- [Serialization](./serialization.md)

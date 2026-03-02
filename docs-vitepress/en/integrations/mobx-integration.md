# MobX Integration

MobX and QuickModel are a natural pair: MobX provides transparent reactivity via `makeAutoObservable`
while QuickModel handles coercion, validation, and immutable updates. The recommended pattern is to
wrap a QModel instance in a MobX store — `$qCopy()` creates new instances that trigger observable
reassignment, and `@QComputed` fields become MobX `computed` values automatically.

## Key patterns

| Use case                        | QuickModel solution                                        |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------ |
| Observable model state          | Store holds `model: QModel                                 | null`; setter calls `$qCopy()` |
| Derived validation state        | `get validation()` calls `$qCheckRules()`                  |
| MobX actions + immutable update | `action` reassigns `this.model = this.model.$qCopy(patch)` |
| Bulk loading from API           | `createMany()` inside a MobX `flow` or `action`            |
| Dirty tracking                  | `get isDirty()` → `original.$qIsDirty(this.model)`         |
| Async validation                | `flow` generator + `qCheckRulesAsync()`                    |

## Defining the Model

```typescript
// models/user.model.ts
import { QModel, Quick, QField, QRule, QComputed } from 'quickmodel';

interface IUser {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
}

@Quick(
	{
		id: 'string',
		firstName: 'string',
		lastName: 'string',
		email: 'string',
		role: 'string',
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class UserModel extends QModel<IUser> {
	declare id: string;

	@QField({ label: 'First Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Too short')
	declare firstName: string;

	@QField({ label: 'Last Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Too short')
	declare lastName: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
	declare email: string;

	declare role: string;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`.trim();
	}

	@QComputed()
	get initials(): string {
		return [this.firstName[0], this.lastName[0]]
			.filter(Boolean)
			.join('')
			.toUpperCase();
	}
}
```

## MobX Store

```typescript
// stores/user.store.ts
import { makeAutoObservable, action, flow } from 'mobx';
import { UserModel } from '../models/user.model';
import { qCheckRulesAsync } from 'quickmodel/forms';

export class UserStore {
	model: UserModel = new UserModel({});
	private _original: UserModel = new UserModel({});
	isLoading = false;
	saveError: string | null = null;

	constructor() {
		makeAutoObservable(this);
	}

	// Derived: validation runs whenever model changes
	get validation() {
		return this.model.$qCheckRules();
	}

	get isValid() {
		return this.validation.valid;
	}

	// Dirty tracking: compare current model against the snapshot taken on load
	get isDirty() {
		return this._original.$qIsDirty(this.model);
	}

	// $qCopy() is IMMUTABLE — reassigning this.model triggers MobX reactivity
	patch(data: Partial<IUser>) {
		this.model = this.model.$qCopy(data) as UserModel;
	}

	reset() {
		this.model = this._original.$qCopy({}) as UserModel;
	}

	load = action((raw: object) => {
		const user = new UserModel(raw);
		this.model = user;
		this._original = user;
	});

	save = flow(function* (this: UserStore) {
		this.isLoading = true;
		this.saveError = null;

		try {
			// Async rules (e.g. email uniqueness check)
			const result = yield qCheckRulesAsync(this.model, {
				mode: 'parallel',
			});
			if (!result.valid) {
				this.saveError = result.errors
					.map((e: { message: string }) => e.message)
					.join(', ');
				return;
			}

			yield fetch(`/api/users/${this.model.id}`, {
				method: 'PUT',
				body: JSON.stringify(this.model.$qSerialize()),
				headers: { 'Content-Type': 'application/json' },
			});

			// Commit: new baseline from the saved model
			this._original = this.model;
		} catch {
			this.saveError = 'Save failed';
		} finally {
			this.isLoading = false;
		}
	});
}

// Singleton
export const userStore = new UserStore();
```

## React — Observing the Store

```tsx
// components/UserEditor.tsx
import { observer } from 'mobx-react-lite';
import { userStore } from '../stores/user.store';

export const UserEditor = observer(() => {
	const { model, validation, isDirty, isLoading } = userStore;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				userStore.save();
			}}>
			<input
				value={model.firstName}
				onChange={(e) => userStore.patch({ firstName: e.target.value })}
			/>
			{validation.errors
				.filter((err) => err.field === 'firstName')
				.map((err) => (
					<span
						key={err.field}
						className="error">
						{err.message}
					</span>
				))}

			<input
				value={model.email}
				type="email"
				onChange={(e) => userStore.patch({ email: e.target.value })}
			/>

			{/* @QComputed — reactive, no extra derivations needed */}
			<p>Full name: {model.fullName}</p>

			<button
				type="submit"
				disabled={!isDirty || isLoading || !validation.valid}>
				{isLoading ? 'Saving…' : 'Save'}
			</button>

			{isDirty && (
				<button
					type="button"
					onClick={() => userStore.reset()}>
					Reset
				</button>
			)}
		</form>
	);
});
```

## List Store — `createMany()` in a MobX action

```typescript
// stores/product-list.store.ts
import { makeAutoObservable, action } from 'mobx';
import { ProductModel } from '../models/product.model';

export class ProductListStore {
	products: Map<string, ProductModel> = new Map();
	isLoading = false;

	constructor() {
		makeAutoObservable(this);
	}

	get sortedByPrice() {
		return [...this.products.values()].sort((a, b) => a.price - b.price);
	}

	get lowStockCount() {
		return [...this.products.values()].filter((p) => p.isLowStock).length;
	}

	loadFromApi = flow(function* (this: ProductListStore) {
		this.isLoading = true;
		try {
			const raw: unknown[] = yield fetch('/api/products').then((r) =>
				r.json()
			);
			const { instances, errors } = ProductModel.createMany(raw);

			if (errors.length) {
				console.warn(`${errors.length} products skipped`);
			}

			// Rebuild the map inside a single MobX batch
			this.products = new Map(instances.map((p) => [p.id, p]));
		} finally {
			this.isLoading = false;
		}
	});

	updateProduct = action((id: string, patch: Partial<IProduct>) => {
		const existing = this.products.get(id);
		if (!existing) return;
		// $qCopy() returns new instance — MobX tracks the Map reassignment
		this.products.set(id, existing.$qCopy(patch) as ProductModel);
	});
}
```

## MobX Reactions — Side Effects on Validation

```typescript
import { reaction } from 'mobx';
import { userStore } from '../stores/user.store';

// Log whenever the user becomes valid/invalid
reaction(
	() => userStore.isValid,
	(isValid) => {
		console.log(
			isValid ? 'Form is valid — save button enabled' : 'Form has errors'
		);
	}
);

// Auto-save draft when isDirty changes (debounced)
let saveTimer: ReturnType<typeof setTimeout>;
reaction(
	() => userStore.isDirty,
	(dirty) => {
		if (!dirty) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			localStorage.setItem(
				'draft',
				JSON.stringify(userStore.model.$qSerialize())
			);
		}, 800);
	}
);
```

## MobX Root Store Pattern

```typescript
// stores/root.store.ts
import { UserStore } from './user.store';
import { ProductListStore } from './product-list.store';

export class RootStore {
	user = new UserStore();
	products = new ProductListStore();
}

export const rootStore = new RootStore();
```

## Comparison: MobX vs Zustand with QuickModel

| Feature            | MobX + QuickModel                  | Zustand + QuickModel               |
| ------------------ | ---------------------------------- | ---------------------------------- |
| Reactivity model   | Observable proxy auto-tracking     | Explicit selectors + subscriptions |
| Derived state      | `get computed()` accessor          | `create` selector or `useMemo`     |
| Async flows        | `flow` generator (built-in cancel) | Async action function              |
| Store size         | Class-based, verbose but explicit  | Functional, concise                |
| `$qCopy()` trigger | Reassign `this.model` in `action`  | `set({ model: prev.$qCopy(...) })` |
| DevTools           | MobX DevTools extension            | Zustand DevTools middleware        |

::: tip When to choose MobX
MobX works best for large, domain-rich stores with many derived values and side effects.
If your store has more than 5 computed fields and multiple `reaction`s, MobX's class-based
OOP model pairs naturally with QuickModel's class-based model design.
:::

## See Also

- [Zustand Integration](./zustand-integration) — functional reactive alternative
- [Redux Toolkit Integration](./redux-toolkit-integration) — explicit action/reducer pattern
- [Validation](/en/guide/validation) — `@QRule` and `qCheckRulesAsync()`

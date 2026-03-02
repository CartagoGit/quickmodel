# Valtio

Valtio uses JavaScript `Proxy` to make plain objects reactive. QuickModel DTOs are class instances, not plain objects — this guide shows how to wrap them safely and keep `@QComputed` properties reactive.

## Quick Reference

| Feature               | Valtio alone | With QuickModel                           |
| --------------------- | ------------ | ----------------------------------------- |
| Coercion              | ❌           | ✅ `coercionStrategy`                     |
| Extra-field stripping | ❌           | ✅ `unknownPropertyPolicy: 'strip'`       |
| Computed properties   | ❌           | ✅ `@QComputed`                           |
| Validation            | Manual       | ✅ `qCheckRules()` / `qCheckRulesAsync()` |
| Immutable updates     | Manual       | ✅ `$qCopy()`                             |
| Dirty tracking        | Manual       | ✅ `$qIsDirty()`                          |

## Installation

```bash
npm install valtio quickmodel
```

## Basic Store with a QModel DTO

Valtio proxies plain objects. The recommended pattern is to store the **serialized form** (plain object) and rehydrate to a `QModel` instance when you need validation or computed properties:

```typescript
import { proxy, useSnapshot } from 'valtio';
import { QModel, Quick, QRule, QComputed } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

interface IUser {
	id: string;
	name: string;
	email: string;
	role: string;
	age: number;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		email: 'string',
		role: 'string',
		age: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserDto extends QModel<IUser> {
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	declare id: string;
	declare name: string;
	declare role: string;
	declare age: number;

	@QComputed()
	get label(): string {
		return `${this.name} (${this.role})`;
	}
}

// Store: keep serialized plain object — Valtio proxies this natively
const userStore = proxy<{ current: Record<string, unknown> | null }>({
	current: null,
});

// Actions
function loadUser(raw: object) {
	const dto = new UserDto(raw);
	userStore.current = dto.$qSerialize() as Record<string, unknown>;
}

function updateUser(patch: Partial<IUser>) {
	if (!userStore.current) return;
	const updated = new UserDto(userStore.current).$qCopy(patch);
	userStore.current = updated.$qSerialize() as Record<string, unknown>;
}
```

## React Component — `useSnapshot`

```tsx
import { useSnapshot } from 'valtio';

function UserProfile() {
	const snap = useSnapshot(userStore);

	if (!snap.current) return <p>No user loaded</p>;

	// Rehydrate on read to access @QComputed and typed fields
	const dto = new UserDto(snap.current);

	return (
		<div>
			<p>{dto.label}</p>
			<p>{dto.email}</p>
			<button onClick={() => updateUser({ name: 'Bob' })}>Rename</button>
		</div>
	);
}
```

## Validation Before Mutation

Run `qCheckRules()` before writing to the Valtio store to avoid invalid state:

```typescript
import { qCheckRules } from 'quickmodel/forms';

function saveUser(formData: object) {
	const dto = new UserDto(formData);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		console.error(errors.map((e) => e.message));
		return;
	}

	userStore.current = dto.$qSerialize() as Record<string, unknown>;
}
```

## Async Validation

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

async function saveUserAsync(formData: object) {
	const dto = new UserDto(formData);
	const { valid, errors } = await qCheckRulesAsync(dto);

	if (!valid) return { errors };
	userStore.current = dto.$qSerialize() as Record<string, unknown>;
	return { ok: true };
}
```

## `$qIsDirty()` — Unsaved Changes Guard

Track whether the in-progress edit differs from the last saved state:

```typescript
import { proxy } from 'valtio';

const editorStore = proxy<{
	saved: Record<string, unknown> | null;
	draft: Record<string, unknown> | null;
}>({
	saved: null,
	draft: null,
});

function startEditing(raw: object) {
	const dto = new UserDto(raw);
	const serialized = dto.$qSerialize() as Record<string, unknown>;
	editorStore.saved = serialized;
	editorStore.draft = { ...serialized };
}

function applyPatch(patch: Partial<IUser>) {
	if (!editorStore.draft) return;
	const updated = new UserDto(editorStore.draft).$qCopy(patch);
	editorStore.draft = updated.$qSerialize() as Record<string, unknown>;
}

function hasUnsavedChanges(): boolean {
	if (!editorStore.saved || !editorStore.draft) return false;
	const saved = new UserDto(editorStore.saved);
	const draft = new UserDto(editorStore.draft);
	// $qIsDirty() compares against the snapshot set at construction time
	const draftWithBaseline = saved.$qCopy(editorStore.draft as Partial<IUser>);
	return draftWithBaseline.$qIsDirty();
}
```

## `subscribe` — React-Free Side Effects

```typescript
import { subscribe } from 'valtio';

subscribe(userStore, () => {
	if (userStore.current) {
		// Persist to localStorage whenever the store changes
		localStorage.setItem('user', JSON.stringify(userStore.current));
	}
});
```

## `proxyWithComputed` — Reactive Derived State

Use Valtio's `proxyWithComputed` to expose `@QComputed` fields directly without rehydrating in every component:

```typescript
import { proxyWithComputed } from 'valtio/utils';

const computedUserStore = proxyWithComputed(
	{
		current: null as Record<string, unknown> | null,
	},
	{
		// Derived state: rehydrate DTO and expose @QComputed
		label: (snap) => {
			if (!snap.current) return '';
			return new UserDto(snap.current).label;
		},
	}
);
```

## Valtio vs Zustand vs Jotai

| Feature             | Valtio              | Zustand             | Jotai                |
| ------------------- | ------------------- | ------------------- | -------------------- |
| API style           | Mutable proxy       | Functional store    | Atomic state         |
| QModel integration  | Serialize+rehydrate | Serialize+rehydrate | Atom wraps DTO       |
| Computed properties | `proxyWithComputed` | Selector            | `atom((get) => ...)` |
| Async actions       | Manual async fn     | Middleware / action | `atomWithQuery`      |
| DevTools            | Valtio DevTools ext | Redux DevTools      | Jotai DevTools ext   |

## See Also

- [Zustand Integration](./zustand-integration) — functional store alternative
- [Jotai Integration](./jotai-integration) — atomic state management
- [React Integration](./react-integration) — `useState` and `useReducer` patterns

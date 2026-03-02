# Redux Toolkit (RTK) Integration

QuickModel works naturally with Redux Toolkit. `serialize()` produces plain JSON-safe objects
ideal for Redux state, and `copy()` provides the **immutable update pattern** expected by reducers
without extra dependencies like Immer.

## Key Patterns

| Pattern                       | QuickModel API                                  |
| ----------------------------- | ----------------------------------------------- |
| Serializable Redux state      | `dto.$qSerialize()` → plain object              |
| Immutable reducer update      | `dto.$qCopy(patch)` → new instance              |
| Typed `createAsyncThunk`      | `new UserDto(response)` in payload creator      |
| Normalized entity adapter     | `createMany()` → `Map<id, serialized>`          |
| RTK Query `transformResponse` | `new UserDto(raw).serialize()`                  |
| Pre-dispatch validation       | `qCheckRules(dto)` before `dispatch(action)`    |
| Typed selector                | `new UserDto(stored).toInterface()`             |
| DevTools-friendly payloads    | `serialize()` returns inspectable plain objects |

## Installation

```bash
npm install quickmodel @reduxjs/toolkit react-redux
```

## Model Setup

```typescript
import { QModel, Quick, QField, QRule, QComputed } from 'quickmodel';

interface IUser {
	uid: string;
	name: string;
	email: string;
	role: string;
	age: number;
	label?: string;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		email: 'string',
		role: 'string',
		age: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserDto extends QModel<IUser> {
	declare uid: string;
	declare name: string;

	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QRule((val: number) => val >= 18, 'Must be 18+')
	declare age: number;

	@QComputed()
	get label(): string {
		return `${this.name} (${this.role})`;
	}
}
```

## createSlice — serialize() as Redux State

`serialize()` returns a **plain JSON-safe object** — exactly what Redux requires for
serializable state. Store the serialized form; rehydrate to a `QModel` instance when you
need computed properties or validation.

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IUserState {
	current: Record<string, unknown> | null;
	loading: boolean;
}

const userSlice = createSlice({
	name: 'user',
	initialState: { current: null, loading: false } as IUserState,
	reducers: {
		setUser(state, action: PayloadAction<Record<string, unknown>>) {
			const dto = new UserDto(action.payload);
			state.current = dto.$qSerialize() as Record<string, unknown>;
		},
		clearUser(state) {
			state.current = null;
		},
	},
});
```

## Reducer with copy() — Immutable Update

`copy(patch)` returns a **new instance** — Redux doesn't need Immer when you use QuickModel:

```typescript
reducers: {
  updateUser(
    state,
    action: PayloadAction<{ uid: string; patch: Partial<IUser> }>
  ) {
    const { uid, patch } = action.payload;
    const stored = state.entities[uid];
    if (!stored) return;
    const updated = new UserDto(stored).copy(patch);
    state.entities[uid] = updated.$qSerialize() as Record<string, unknown>;
    // @QComputed is recalculated automatically on the new instance
  },
},
```

## createAsyncThunk — Typed Fetch

Wrap API responses in a DTO inside the payload creator for automatic coercion and field stripping:

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk<Record<string, unknown>, string>(
	'users/fetch',
	async (uid) => {
		const response = await fetch(`/api/users/${uid}`);
		const raw = (await response.json()) as object;
		// Coerce types, strip unknown fields, add @QComputed
		return new UserDto(raw).serialize() as Record<string, unknown>;
	}
);
```

## createEntityAdapter — Normalized Store

Use `createMany()` for bulk loading and the QModel `uid` as the entity id:

```typescript
import { createEntityAdapter } from '@reduxjs/toolkit';

const usersAdapter = createEntityAdapter<Record<string, unknown>>({
	selectId: (entity) => entity['uid'] as string,
});

// In a thunk or slice:
const { instances } = UserDto.createMany(apiData);
const serialized = instances.map(
	(inst) => inst.$qSerialize() as Record<string, unknown>
);
usersAdapter.setAll(state, serialized);
```

## RTK Query — transformResponse

Clean API responses at the query boundary before they enter the cache:

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
	baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
	endpoints: (builder) => ({
		getUser: builder.query<Record<string, unknown>, string>({
			query: (uid) => `/users/${uid}`,
			transformResponse: (raw: object) =>
				new UserDto(raw).serialize() as Record<string, unknown>,
		}),
		getUsers: builder.query<Record<string, unknown>[], void>({
			query: () => '/users',
			transformResponse: (rawList: object[]) => {
				const { instances } = UserDto.createMany(rawList);
				return instances.map(
					(inst) => inst.$qSerialize() as Record<string, unknown>
				);
			},
		}),
	}),
});
```

## checkRules() Before Dispatch — Validation Guard

Validate before firing the action to avoid invalid state:

```typescript
import { qCheckRules } from 'quickmodel/forms';

function handleCreateUser(formData: object) {
	const dto = new CreateUserDto(formData);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		dispatch(setFormErrors(errors));
		return;
	}

	dispatch(createUser(dto.$qToInterface()));
}
```

For async validation (e.g., uniqueness checks against the server):

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

async function handleSubmit(formData: object) {
	const dto = new CreateUserDto(formData);
	const { valid, errors } = await qCheckRulesAsync(dto);
	if (!valid) {
		/* handle errors */ return;
	}
	dispatch(createUser(dto.$qToInterface()));
}
```

## Typed Selectors

Rehydrate from the normalized store to access typed fields and computed properties:

```typescript
import { createSelector } from '@reduxjs/toolkit';

// Raw selector from store
const selectUserRaw = (state: RootState, uid: string) =>
	usersAdapter.getSelectors().selectById(state.users, uid);

// Typed selector — returns IUser plain object
export const selectUser = createSelector(selectUserRaw, (raw) =>
	raw ? new UserDto(raw).toInterface() : undefined
);

// Selector with computed fields
export const selectUserWithLabel = createSelector(selectUserRaw, (raw) =>
	raw ? new UserDto(raw).serialize() : undefined
);
```

## DevTools-Friendly Payloads

`serialize()` always returns a **plain inspectable object** — no class instances, no circular
references, no Symbol keys. Redux DevTools shows the full state including `@QComputed` fields:

```typescript
// In Redux DevTools you'll see:
{
  uid: "u1",
  name: "Alice",
  email: "alice@example.com",
  role: "user",
  age: 25,
  label: "Alice (user)"   // @QComputed — included in serialize() output
}
```

## Comparison

| Feature                 | Plain Redux | Redux + Zod      | Redux + QuickModel         |
| ----------------------- | ----------- | ---------------- | -------------------------- |
| Type coercion           | ❌          | ❌               | ✅ `coercionStrategy`      |
| Unknown field stripping | ❌          | ❌               | ✅ `unknownPropertyPolicy` |
| Computed properties     | ❌          | ❌               | ✅ `@QComputed`            |
| Immutable updates       | Immer       | Immer            | ✅ `copy()`                |
| Async validation        | Custom      | `safeParseAsync` | ✅ `qCheckRulesAsync`      |
| DevTools-safe payloads  | ✅          | ✅               | ✅ `serialize()`           |

## See Also

- [Zustand Integration](./zustand-integration) — simpler local state
- [TanStack Query Integration](./tanstack-query-integration) — server state caching
- [Validation](./validation) — `@QRule`, `checkRules()`, `checkRulesAsync()`

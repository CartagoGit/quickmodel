# Integración con Redux Toolkit (RTK)

QuickModel encaja perfectamente con Redux Toolkit. `serialize()` produce objetos planos
seguros para JSON — exactamente lo que Redux necesita como estado serializable — y `copy()`
ofrece el **patrón de actualización inmutable** que los reducers esperan, sin necesidad de Immer.

## Patrones clave

| Patrón                        | API de QuickModel                              |
| ----------------------------- | ---------------------------------------------- |
| Estado Redux serializable     | `dto.serialize()` → objeto plano               |
| Actualización inmutable       | `dto.copy(patch)` → nueva instancia            |
| `createAsyncThunk` tipado     | `new UserDto(response)` en el payload creator  |
| Entity adapter normalizado    | `createMany()` → `Map<id, serializado>`        |
| `transformResponse` RTK Query | `new UserDto(raw).serialize()`                 |
| Validación antes de dispatch  | `qCheckRules(dto)` antes de `dispatch(action)` |
| Selector tipado               | `new UserDto(stored).toInterface()`            |
| Payloads legibles en DevTools | `serialize()` devuelve objetos inspeccionables |

## Instalación

```bash
npm install quickmodel @reduxjs/toolkit react-redux
```

## Configuración del modelo

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
	@QRule((val: string) => val.includes('@'), 'Email inválido')
	declare email: string;

	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Rol inválido'
	)
	declare role: string;

	@QRule((val: number) => val >= 18, 'Debe tener 18+')
	declare age: number;

	@QComputed()
	get label(): string {
		return `${this.name} (${this.role})`;
	}
}
```

## createSlice — serialize() como estado Redux

`serialize()` devuelve un **objeto plano seguro para JSON** — exactamente lo que Redux
requiere. Almacena la forma serializada; rehidrata a instancia `QModel` cuando necesites
propiedades computadas o validación.

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
			state.current = dto.$qm.serialize() as Record<string, unknown>;
		},
		clearUser(state) {
			state.current = null;
		},
	},
});
```

## Reducer con copy() — Actualización inmutable

`copy(patch)` devuelve una **nueva instancia** — Redux no necesita Immer cuando usas QuickModel:

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
    state.entities[uid] = updated.$qm.serialize() as Record<string, unknown>;
    // @QComputed se recalcula automáticamente en la nueva instancia
  },
},
```

## createAsyncThunk — Fetch tipado

Envuelve las respuestas de la API en un DTO dentro del payload creator para coerción
y eliminación de campos automáticas:

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk<Record<string, unknown>, string>(
	'users/fetch',
	async (uid) => {
		const response = await fetch(`/api/users/${uid}`);
		const raw = (await response.json()) as object;
		// Coerciona tipos, elimina campos desconocidos, añade @QComputed
		return new UserDto(raw).serialize() as Record<string, unknown>;
	}
);
```

## createEntityAdapter — Store normalizado

Usa `createMany()` para carga masiva y el `uid` de QModel como id de entidad:

```typescript
import { createEntityAdapter } from '@reduxjs/toolkit';

const usersAdapter = createEntityAdapter<Record<string, unknown>>({
	selectId: (entity) => entity['uid'] as string,
});

// En un thunk o slice:
const { instances } = UserDto.createMany(apiData);
const serialized = instances.map(
	(inst) => inst.$qm.serialize() as Record<string, unknown>
);
usersAdapter.setAll(state, serialized);
```

## RTK Query — transformResponse

Limpia las respuestas de la API en la frontera de la query antes de que entren en la caché:

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
					(inst) => inst.$qm.serialize() as Record<string, unknown>
				);
			},
		}),
	}),
});
```

## checkRules() Antes de Dispatch — Guard de validación

Valida antes de disparar la acción para evitar estado inválido:

```typescript
import { qCheckRules } from 'quickmodel/forms';

function handleCreateUser(formData: object) {
	const dto = new CreateUserDto(formData);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		dispatch(setFormErrors(errors));
		return;
	}

	dispatch(createUser(dto.toInterface()));
}
```

Para validación asíncrona (ej. checks de unicidad contra el servidor):

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

async function handleSubmit(formData: object) {
	const dto = new CreateUserDto(formData);
	const { valid, errors } = await qCheckRulesAsync(dto);
	if (!valid) {
		/* gestionar errores */ return;
	}
	dispatch(createUser(dto.toInterface()));
}
```

## Selectores tipados

Rehidrata desde el store normalizado para acceder a campos tipados y propiedades computadas:

```typescript
import { createSelector } from '@reduxjs/toolkit';

// Selector raw del store
const selectUserRaw = (state: RootState, uid: string) =>
	usersAdapter.getSelectors().selectById(state.users, uid);

// Selector tipado — devuelve IUser como objeto plano
export const selectUser = createSelector(selectUserRaw, (raw) =>
	raw ? new UserDto(raw).toInterface() : undefined
);

// Selector con campos computados
export const selectUserWithLabel = createSelector(selectUserRaw, (raw) =>
	raw ? new UserDto(raw).serialize() : undefined
);
```

## Payloads legibles en DevTools

`serialize()` siempre devuelve un **objeto plano inspeccionable** — sin instancias de clase,
sin referencias circulares, sin claves Symbol. Redux DevTools muestra el estado completo
incluyendo los campos `@QComputed`:

```typescript
// En Redux DevTools verás:
{
  uid: "u1",
  name: "Alice",
  email: "alice@example.com",
  role: "user",
  age: 25,
  label: "Alice (user)"   // @QComputed — incluido en la salida de serialize()
}
```

## Comparativa

| Característica              | Redux puro | Redux + Zod      | Redux + QuickModel         |
| --------------------------- | ---------- | ---------------- | -------------------------- |
| Coerción de tipos           | ❌         | ❌               | ✅ `coercionStrategy`      |
| Eliminación de campos extra | ❌         | ❌               | ✅ `unknownPropertyPolicy` |
| Propiedades computadas      | ❌         | ❌               | ✅ `@QComputed`            |
| Actualizaciones inmutables  | Immer      | Immer            | ✅ `copy()`                |
| Validación asíncrona        | Custom     | `safeParseAsync` | ✅ `qCheckRulesAsync`      |
| Payloads seguros DevTools   | ✅         | ✅               | ✅ `serialize()`           |

## Ver también

- [Integración con Zustand](./zustand-integration) — estado local más sencillo
- [Integración con TanStack Query](./tanstack-query-integration) — caché de estado del servidor
- [Validación](./validation) — `@QRule`, `checkRules()`, `checkRulesAsync()`

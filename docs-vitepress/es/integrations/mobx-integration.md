# Integración con MobX

MobX y QuickModel son una pareja natural: MobX proporciona reactividad transparente mediante
`makeAutoObservable` mientras QuickModel gestiona la coerción, validación y actualizaciones
inmutables. El patrón recomendado es envolver una instancia QModel en un store MobX —
`$qCopy()` crea nuevas instancias que desencadenan la reasignación observable, y los campos
`@QComputed` se convierten automáticamente en valores `computed` de MobX.

## Patrones clave

| Caso de uso                             | Solución QuickModel                                       |
| --------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| Estado del modelo observable            | El store tiene `model: QModel                             | null`; el setter llama a `$qCopy()` |
| Estado de validación derivado           | `get validation()` llama a `$qCheckRules()`               |
| Acciones MobX + actualización inmutable | `action` reasigna `this.model = this.model.$qCopy(patch)` |
| Carga masiva desde API                  | `createMany()` dentro de un `flow` o `action` MobX        |
| Seguimiento de cambios                  | `get isDirty()` → `original.$qIsDirty(this.model)`        |
| Validación asíncrona                    | Generador `flow` + `qCheckRulesAsync()`                   |

## Definiendo el Modelo

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

	@QField({ label: 'Nombre', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Demasiado corto')
	declare firstName: string;

	@QField({ label: 'Apellidos', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Demasiado corto')
	declare lastName: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
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

## Store MobX

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

	// Derivado: la validación se ejecuta cada vez que el modelo cambia
	get validation() {
		return this.model.$qCheckRules();
	}

	get isValid() {
		return this.validation.valid;
	}

	// Seguimiento de cambios: compara el modelo actual con la instantánea tomada al cargar
	get isDirty() {
		return this._original.$qIsDirty(this.model);
	}

	// $qCopy() es INMUTABLE — reasignar this.model desencadena la reactividad de MobX
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
			// Reglas asíncronas (p.ej. unicidad de email)
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

			// Confirmar: nueva línea base desde el modelo guardado
			this._original = this.model;
		} catch {
			this.saveError = 'El guardado falló';
		} finally {
			this.isLoading = false;
		}
	});
}

// Singleton
export const userStore = new UserStore();
```

## React — Observar el Store

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

			{/* @QComputed — reactivo, no se necesitan derivaciones adicionales */}
			<p>Nombre completo: {model.fullName}</p>

			<button
				type="submit"
				disabled={!isDirty || isLoading || !validation.valid}>
				{isLoading ? 'Guardando…' : 'Guardar'}
			</button>

			{isDirty && (
				<button
					type="button"
					onClick={() => userStore.reset()}>
					Restablecer
				</button>
			)}
		</form>
	);
});
```

## Store de Lista — `createMany()` en una Acción MobX

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
				console.warn(`${errors.length} productos omitidos`);
			}

			// Reconstruir el Map en un único batch MobX
			this.products = new Map(instances.map((p) => [p.id, p]));
		} finally {
			this.isLoading = false;
		}
	});

	updateProduct = action((id: string, patch: Partial<IProduct>) => {
		const existing = this.products.get(id);
		if (!existing) return;
		// $qCopy() devuelve nueva instancia — MobX rastrea la reasignación en el Map
		this.products.set(id, existing.$qCopy(patch) as ProductModel);
	});
}
```

## Reacciones MobX — Efectos Secundarios sobre Validación

```typescript
import { reaction } from 'mobx';
import { userStore } from '../stores/user.store';

// Registrar cuándo el usuario pasa a ser válido/inválido
reaction(
	() => userStore.isValid,
	(isValid) => {
		console.log(
			isValid
				? 'Formulario válido — botón guardar habilitado'
				: 'Formulario con errores'
		);
	}
);

// Guardar borrador automáticamente cuando isDirty cambia (con debounce)
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

## Patrón Root Store MobX

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

## Comparativa: MobX vs Zustand con QuickModel

| Característica           | MobX + QuickModel                        | Zustand + QuickModel                  |
| ------------------------ | ---------------------------------------- | ------------------------------------- |
| Modelo de reactividad    | Proxy observable con rastreo automático  | Selectores explícitos + suscripciones |
| Estado derivado          | Accesores `get computed()`               | Selector en `create` o `useMemo`      |
| Flujos asíncronos        | Generador `flow` (cancelación integrada) | Función de action asíncrona           |
| Tamaño del store         | Basado en clases, verbose pero explícito | Funcional, conciso                    |
| Disparador de `$qCopy()` | Reasignar `this.model` en `action`       | `set({ model: prev.$qCopy(...) })`    |
| DevTools                 | Extensión MobX DevTools                  | Middleware Zustand DevTools           |

::: tip Cuándo elegir MobX
MobX funciona mejor para stores grandes y ricos en dominio con muchos valores derivados y efectos
secundarios. Si tu store tiene más de 5 campos computed y múltiples `reaction`, el modelo OOP
basado en clases de MobX se combina de forma natural con el diseño de modelos basado en clases de
QuickModel.
:::

## Ver también

- [Integración con Zustand](./zustand-integration) — alternativa reactiva funcional
- [Integración con Redux Toolkit](./redux-toolkit-integration) — patrón explícito action/reducer
- [Validación](/es/guide/validation) — `@QRule` y `qCheckRulesAsync()`

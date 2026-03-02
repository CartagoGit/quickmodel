# Integración con Solid.js

QuickModel se integra de forma natural con los primitivos reactivos de Solid.js. Como `$qCopy()` devuelve
una **nueva instancia** (actualización inmutable), se combina a la perfección con `createSignal` de Solid
— reasignar la señal desencadena la reactividad sin necesidad de trackers de mutación ni intercepción por proxy.

## Patrones clave

| Caso de uso                          | Solución QuickModel                                        |
| ------------------------------------ | ---------------------------------------------------------- |
| Estado de formulario basado en señal | `createSignal(new Model({}))` + `$qCopy()` para actualizar |
| Validación derivada                  | `createMemo(() => form().$qCheckRules())`                  |
| Estado compartido con store          | `createStore` con instancias QModel                        |
| Carga de datos con `createResource`  | `createMany()` para respuestas API tipadas                 |
| Validación asíncrona                 | `createResource` + `qCheckRulesAsync()`                    |
| SolidStart server actions            | DTO + `$qCheckRules()` en funciones `"use server"`         |

## Formulario Basado en Señal

```tsx
// ProfileEditor.tsx
import { createSignal, createMemo } from 'solid-js';
import { QModel, Quick, QField, QRule } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

interface IProfile {
	name: string;
	bio: string;
	age: number;
}

@Quick({ name: 'string', bio: 'string', age: 'number' })
class ProfileModel extends QModel<IProfile> {
	@QField({ label: 'Nombre', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QField({ label: 'Bio' })
	@QRule((v: string) => v.length <= 200, 'Bio demasiado larga')
	declare bio: string;

	@QField({ label: 'Edad' })
	@QRule((v: number) => v >= 18, 'Debes tener 18+')
	declare age: number;
}

export default function ProfileEditor() {
	const [form, setForm] = createSignal(new ProfileModel({}));

	// $qCopy() es INMUTABLE — reasignar la señal desencadena la reactividad
	const update = <K extends keyof IProfile>(field: K, value: IProfile[K]) =>
		setForm((prev) => prev.$qCopy({ [field]: value }) as ProfileModel);

	// Validación derivada — se recalcula automáticamente cuando form() cambia
	const validation = createMemo(() => form().$qCheckRules());

	const handleSubmit = (e: SubmitEvent) => {
		e.preventDefault();
		if (!validation().valid) return;
		console.log(form().$qSerialize());
	};

	return (
		<form onSubmit={handleSubmit}>
			<input
				value={form().name}
				onInput={(e) => update('name', e.currentTarget.value)}
			/>
			{validation()
				.errors.filter((err) => err.field === 'name')
				.map((err) => (
					<span class="error">{err.message}</span>
				))}

			<input
				type="number"
				value={form().age}
				onInput={(e) => update('age', Number(e.currentTarget.value))}
			/>

			<button
				type="submit"
				disabled={!validation().valid}>
				Guardar
			</button>
		</form>
	);
}
```

## `createStore` — Estado Compartido Mutable

Para estado de aplicación complejo con múltiples modelos, usa `createStore`:

```tsx
import { createStore } from 'solid-js/store';
import { UserModel } from '../models/user.model';
import { CartItemModel } from '../models/cart-item.model';

interface IAppStore {
	user: UserModel | null;
	cartItems: Map<string, CartItemModel>;
}

const [store, setStore] = createStore<IAppStore>({
	user: null,
	cartItems: new Map(),
});

// Actualizar usuario — $qCopy() devuelve nueva instancia, el setter desencadena reactividad
function updateUser(patch: Partial<IUser>) {
	setStore('user', (prev) =>
		prev ? (prev.$qCopy(patch) as UserModel) : null
	);
}

// Añadir artículo al carrito
function addToCart(raw: ICartItem) {
	setStore('cartItems', (prev) => {
		const item = new CartItemModel(raw);
		const next = new Map(prev);
		next.set(item.productId, item);
		return next;
	});
}
```

## `createResource` — Datos API Tipados

```tsx
import { createResource, For, Suspense } from 'solid-js';
import { ProductModel } from '../models/product.model';

async function fetchProducts(): Promise<ProductModel[]> {
	const raw: unknown[] = await fetch('/api/products').then((r) => r.json());
	const { instances, errors } = ProductModel.createMany(raw);

	if (errors.length) {
		console.warn(`${errors.length} productos fallaron la coerción`);
	}

	return instances; // ProductModel[] — completamente coercionados, @QComputed listos
}

export default function ProductList() {
	const [products] = createResource(fetchProducts);

	return (
		<Suspense fallback={<p>Cargando...</p>}>
			<For each={products()}>
				{(product) => (
					<article>
						<h2>{product.title}</h2>
						<p>{product.formattedPrice}</p> {/* @QComputed */}
					</article>
				)}
			</For>
		</Suspense>
	);
}
```

## Validación Asíncrona con `createResource`

```tsx
import { createSignal, createResource } from 'solid-js';
import { qCheckRulesAsync } from 'quickmodel/forms';
import { RegistrationModel } from '../models/registration.model';

export default function RegistrationForm() {
	const [form, setForm] = createSignal(new RegistrationModel({}));
	const [submitted, setSubmitted] = createSignal(false);

	// Solo se ejecuta cuando submitted() es true
	const [result] = createResource(
		() => (submitted() ? form() : null),
		async (dto) => qCheckRulesAsync(dto, { mode: 'parallel' })
	);

	const handleSubmit = (e: SubmitEvent) => {
		e.preventDefault();
		setSubmitted(true);
	};

	return (
		<form onSubmit={handleSubmit}>
			<input
				placeholder="Email"
				onInput={(e) =>
					setForm(
						(prev) =>
							prev.$qCopy({
								email: e.currentTarget.value,
							}) as RegistrationModel
					)
				}
			/>
			{result()?.errors.map((err) => (
				<p class="error">{err.message}</p>
			))}
			<button
				type="submit"
				disabled={result.loading}>
				{result.loading ? 'Comprobando...' : 'Registrarse'}
			</button>
		</form>
	);
}
```

## `$qIsDirty()` — Guarda Cambios No Guardados

```tsx
import { createSignal, createMemo, onCleanup } from 'solid-js';
import { DocumentModel } from '../models/document.model';

export default function DocumentEditor({ initial }: { initial: IDocument }) {
	const baseline = new DocumentModel(initial);
	const [current, setCurrent] = createSignal(baseline);

	const isDirty = createMemo(() => baseline.$qIsDirty(current()));

	// Avisar antes de navegar al salir
	const handleBeforeUnload = (e: BeforeUnloadEvent) => {
		if (isDirty()) {
			e.preventDefault();
		}
	};

	window.addEventListener('beforeunload', handleBeforeUnload);
	onCleanup(() =>
		window.removeEventListener('beforeunload', handleBeforeUnload)
	);

	return (
		<div>
			<textarea
				value={current().body}
				onInput={(e) =>
					setCurrent(
						(prev) =>
							prev.$qCopy({
								body: e.currentTarget.value,
							}) as DocumentModel
					)
				}
			/>
			{isDirty() && (
				<button onClick={() => setCurrent(baseline)}>
					Restablecer
				</button>
			)}
		</div>
	);
}
```

## SolidStart — Server Actions

```typescript
// src/routes/api/users.ts  (ruta de servidor SolidStart)
import { json } from '@solidjs/router';
import { UserDto } from '../../dto/user.dto';
import { qCheckRulesAsync } from 'quickmodel/forms';

export async function POST({ request }: { request: Request }) {
	const body = await request.json();
	const dto = new UserDto(body);

	const result = await qCheckRulesAsync(dto);
	if (!result.valid) {
		return json({ errors: result.errors }, { status: 422 });
	}

	const saved = await db.users.create({ data: dto.$qToInterface() });
	return json(saved, { status: 201 });
}
```

## Formulario Dinámico con `getFormSchema()`

```tsx
import { For } from 'solid-js';
import { UserSignupModel } from '../models/user-signup.model';

export default function DynamicForm() {
	const schema = UserSignupModel.getFormSchema();
	// [{ field: 'username', label: 'Username', required: true, widget: 'text' }, ...]

	const [form, setForm] = createSignal(new UserSignupModel({}));

	return (
		<form>
			<For each={schema}>
				{({ field, label, required, widget }) => (
					<div>
						<label>
							{label}
							{required && ' *'}
						</label>
						<input
							type={widget === 'email' ? 'email' : 'text'}
							onInput={(e) =>
								setForm(
									(prev) =>
										prev.$qCopy({
											[field]: e.currentTarget.value,
										}) as UserSignupModel
								)
							}
						/>
					</div>
				)}
			</For>
		</form>
	);
}
```

## Comparativa: señales de Solid vs useState de React

| Patrón                            | React                                        | Solid.js                                   |
| --------------------------------- | -------------------------------------------- | ------------------------------------------ |
| Actualización de estado inmutable | `setForm(prev => prev.$qCopy())`             | `setForm(prev => prev.$qCopy())`           |
| Validación derivada               | `useMemo(() => form.$qCheckRules(), [form])` | `createMemo(() => form().$qCheckRules())`  |
| Reactividad de grano fino         | Re-renderiza el componente                   | Actualiza solo los nodos DOM que cambiaron |
| Carga de recursos                 | `useEffect` + estado                         | `createResource` — incorporado             |
| Sin envoltura necesaria           | ✅                                           | ✅ (no requiere proxy/observer)            |

## Ver también

- [Integración con React](./react-integration) — patrón inmutable `$qCopy()` similar con señales
- [Validación](/es/guide/validation) — `@QRule` y `qCheckRules()`
- [Integración con Valtio](./valtio-integration) — alternativa de estado basada en proxy

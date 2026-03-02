# Solid.js Integration

QuickModel integrates naturally with Solid.js reactive primitives. Because `$qCopy()` returns a
**new instance** (immutable update), it pairs perfectly with Solid's `createSignal` — reassigning
the signal triggers reactivity without needing mutation trackers or proxy interception.

## Key patterns

| Use case                      | QuickModel solution                                  |
| ----------------------------- | ---------------------------------------------------- |
| Signal-based form state       | `createSignal(new Model({}))` + `$qCopy()` to update |
| Derived validation            | `createMemo(() => form().$qCheckRules())`            |
| Store-based shared state      | `createStore` with QModel instances                  |
| `createResource` data loading | `createMany()` for typed API responses               |
| Async validation              | `createResource` + `qCheckRulesAsync()`              |
| SolidStart server actions     | DTO + `$qCheckRules()` in `"use server"` functions   |

## Signal-Based Form

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
	@QField({ label: 'Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Name too short')
	declare name: string;

	@QField({ label: 'Bio' })
	@QRule((v: string) => v.length <= 200, 'Bio too long')
	declare bio: string;

	@QField({ label: 'Age' })
	@QRule((v: number) => v >= 18, 'Must be 18+')
	declare age: number;
}

export default function ProfileEditor() {
	const [form, setForm] = createSignal(new ProfileModel({}));

	// $qCopy() is IMMUTABLE — reassigning the signal triggers reactivity
	const update = <K extends keyof IProfile>(field: K, value: IProfile[K]) =>
		setForm((prev) => prev.$qCopy({ [field]: value }) as ProfileModel);

	// Derived validation — automatically recalculates when form() changes
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
				Save
			</button>
		</form>
	);
}
```

## `createStore` — Shared Mutable State

For complex app state with multiple models, use `createStore`:

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

// Update user — $qCopy() returns new instance, setter triggers reactivity
function updateUser(patch: Partial<IUser>) {
	setStore('user', (prev) =>
		prev ? (prev.$qCopy(patch) as UserModel) : null
	);
}

// Add item to cart
function addToCart(raw: ICartItem) {
	setStore('cartItems', (prev) => {
		const item = new CartItemModel(raw);
		const next = new Map(prev);
		next.set(item.productId, item);
		return next;
	});
}
```

## `createResource` — Typed API Data

```tsx
import { createResource, For, Suspense } from 'solid-js';
import { ProductModel } from '../models/product.model';

async function fetchProducts(): Promise<ProductModel[]> {
	const raw: unknown[] = await fetch('/api/products').then((r) => r.json());
	const { instances, errors } = ProductModel.createMany(raw);

	if (errors.length) {
		console.warn(`${errors.length} products failed coercion`);
	}

	return instances; // ProductModel[] — fully coerced, @QComputed ready
}

export default function ProductList() {
	const [products] = createResource(fetchProducts);

	return (
		<Suspense fallback={<p>Loading...</p>}>
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

## Async Validation with `createResource`

```tsx
import { createSignal, createResource } from 'solid-js';
import { qCheckRulesAsync } from 'quickmodel/forms';
import { RegistrationModel } from '../models/registration.model';

export default function RegistrationForm() {
	const [form, setForm] = createSignal(new RegistrationModel({}));
	const [submitted, setSubmitted] = createSignal(false);

	// Only runs when submitted() is true
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
				{result.loading ? 'Checking...' : 'Register'}
			</button>
		</form>
	);
}
```

## `$qIsDirty()` — Unsaved Changes Guard

```tsx
import { createSignal, createMemo, onCleanup } from 'solid-js';
import { DocumentModel } from '../models/document.model';

export default function DocumentEditor({ initial }: { initial: IDocument }) {
	const baseline = new DocumentModel(initial);
	const [current, setCurrent] = createSignal(baseline);

	const isDirty = createMemo(() => baseline.$qIsDirty(current()));

	// Warn before navigating away
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
				<button onClick={() => setCurrent(baseline)}>Reset</button>
			)}
		</div>
	);
}
```

## SolidStart — Server Actions

```typescript
// src/routes/api/users.ts  (SolidStart server route)
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

## Dynamic Form Rendering with `getFormSchema()`

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

## Comparison: Solid signals vs React useState

| Pattern                 | React                                        | Solid.js                                  |
| ----------------------- | -------------------------------------------- | ----------------------------------------- |
| Immutable state update  | `setForm(prev => prev.$qCopy())`             | `setForm(prev => prev.$qCopy())`          |
| Derived validation      | `useMemo(() => form.$qCheckRules(), [form])` | `createMemo(() => form().$qCheckRules())` |
| Fine-grained reactivity | Re-renders the component                     | Updates only the DOM nodes that changed   |
| Resource loading        | `useEffect` + state                          | `createResource` — built-in               |
| No wrapping needed      | ✅                                           | ✅ (no proxy/observer required)           |

## See Also

- [React Integration](./react-integration) — similar `$qCopy()` immutable signal pattern
- [Validation](/en/guide/validation) — `@QRule` and `qCheckRules()`
- [Valtio Integration](./valtio-integration) — proxy-based state alternative

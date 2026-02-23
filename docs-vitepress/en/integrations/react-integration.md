# React Integration

QuickModel works with React using plain TypeScript classes for form validation and `QModel` subclasses for data management. No React-specific APIs are required — just TypeScript.

## Key Separation

| Use case                            | Approach                                    |
| ----------------------------------- | ------------------------------------------- |
| Controlled form validation          | Plain TS class + `@QRule` + `qCheckRules()` |
| Server Actions / API coercion       | `QModel` subclass + `@Quick()`              |
| Global state (Zustand / useReducer) | `QModel` + `copy()` (immutable updates)     |
| Custom hooks                        | Wrap `QModel` in a `useQModel` hook         |

## Installation

```bash
npm install @cartago-git/quickmodel
```

Enable decorators in `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Controlled Form Validation (useState)

```typescript
import { QRule, QField } from '@cartago-git/quickmodel';
import { qCheckRules } from '@cartago-git/quickmodel/core/helpers/q-check-rules';

class LoginForm {
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Invalid email address'
	)
	email = '';

	@QField({ label: 'Password', widget: 'password', required: true })
	@QRule(
		(v: string) => v.length >= 8,
		'Password must be at least 8 characters'
	)
	@QRule((v: string) => /[A-Z]/.test(v), 'Password needs an uppercase letter')
	password = '';
}
```

```tsx
// LoginPage.tsx
function LoginPage() {
	const [form] = useState(() => new LoginForm());
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const result = qCheckRules(form);
		if (!result.valid) {
			const map: Record<string, string> = {};
			result.errors.forEach((err) => {
				map[err.field] = err.message;
			});
			setErrors(map);
			return;
		}
		// proceed with form.email, form.password
	};

	return (
		<form onSubmit={handleSubmit}>
			<input
				value={form.email}
				onChange={(e) => {
					form.email = e.target.value;
				}}
				aria-invalid={!!errors.email}
			/>
			{errors.email && <span role="alert">{errors.email}</span>}
			{/* ... */}
		</form>
	);
}
```

::: tip Two available patterns

- **Plain class** (above): `@QRule` + `@QField` only — no `QModel` inheritance required.
- **With `QModel` + `@Quick`** (below): also unlocks `copy()`, `serialize()`, `checkIntegrity()`, and immutable updates.
  :::

### With QModel + @Quick

```typescript
// models/login-form.ts
import { QModel, Quick, QField, QRule } from '@cartago-git/quickmodel';

@Quick({ email: 'string', password: 'string' })
class LoginForm extends QModel<ILoginForm> {
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Invalid email address'
	)
	declare email: string;

	@QField({ label: 'Password', widget: 'password', required: true })
	@QRule(
		(v: string) => v.length >= 8,
		'Password must be at least 8 characters'
	)
	@QRule((v: string) => /[A-Z]/.test(v), 'Password needs an uppercase letter')
	declare password: string;
}
```

```tsx
// LoginPage.tsx
const [form, setForm] = useState(() => new LoginForm({}));

const handleChange = (field: keyof ILoginForm, value: string) => {
	// copy() is IMMUTABLE — captures the new instance
	setForm((prev) => prev.copy({ [field]: value }) as LoginForm);
};

const handleSubmit = (e: FormEvent) => {
	e.preventDefault();
	const { valid, errors: ruleErrors } = form.checkRules();
	if (!valid) {
		const map: Record<string, string> = {};
		ruleErrors.forEach((err) => {
			map[err.field] = err.message;
		});
		setErrors(map);
		return;
	}
	// proceed with form.email, form.password
};
```

## React Hook Form — Custom Resolver

```typescript
import { qCheckRules } from '@cartago-git/quickmodel/core/helpers/q-check-rules';
import type { Resolver } from 'react-hook-form';

export function qModelResolver<TForm extends object>(
	FormClass: new () => TForm
): Resolver<TForm> {
	return (values) => {
		const instance = Object.assign(new FormClass(), values);
		const result = qCheckRules(instance);
		if (result.valid) return { values, errors: {} };
		const errors = result.errors.reduce<
			Record<string, { message: string }>
		>((acc, e) => {
			if (!acc[e.field]) acc[e.field] = { message: e.message };
			return acc;
		}, {});
		return { values: {}, errors };
	};
}
```

```tsx
// usage with react-hook-form
const { register, handleSubmit, formState } = useForm({
	resolver: qModelResolver(ProductForm),
});
```

### Typed variant with QModel

If your form class extends `QModel`, you can enforce a stricter type contract and call `instance.checkRules()` directly:

```typescript
// hooks/useQModelResolver.ts
import type { Resolver } from 'react-hook-form';
import { QModel } from '@cartago-git/quickmodel';

export function createQModelResolver<T extends QModel<object>>(
	FormClass: new (data?: object) => T
): Resolver<T> {
	return (values) => {
		const instance = new FormClass(values);
		const { valid, errors } = instance.checkRules();
		if (valid) return { values, errors: {} };
		return {
			values: {},
			errors: Object.fromEntries(
				errors.map((e) => [
					e.field,
					{ type: 'validation', message: e.message },
				])
			),
		};
	};
}
```

```tsx
// ProductForm must extend QModel
const resolver = createQModelResolver(ProductForm);
```

::: info Which one should I use?
| Goal | Function |
|---|---|
| Validate with `@QRule` only, no inheritance | `qModelResolver` — accepts any class |
| Full `QModel` with coercion and serialization | `createQModelResolver` — strong typing |
:::

## Next.js Server Actions

Coerce and sanitize incoming `FormData` on the server:

```typescript
// app/actions.ts
'use server';
import { QModel, Quick } from '@cartago-git/quickmodel';

@Quick(
	{
		productId: 'string',
		quantity: 'number',
		unitPrice: 'number',
		orderedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class OrderItemDto extends QModel<IOrderItem> {
	declare productId: string;
	declare quantity: number; // coerced from string FormData
	declare unitPrice: number; // coerced from string FormData
	declare orderedAt: Date;

	@QComputed()
	get totalPrice(): number {
		return this.quantity * this.unitPrice;
	}
}

export async function createOrder(formData: FormData) {
	const raw = Object.fromEntries(formData);
	const dto = new OrderItemDto(raw); // auto-coerces strings to numbers
	// dto.totalPrice is available as a @QComputed field
	return dto.serialize();
}
```

::: tip coercionStrategy: 'loose'
FormData values are always strings. Add `coercionStrategy: 'loose'` to automatically convert `'3'` → `3`, `'true'` → `true`, etc.
:::

## Zustand Store Pattern

```typescript
import { create } from 'zustand';
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick(
	{ sku: 'string', name: 'string', qty: 'number', price: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class CartItem extends QModel<ICartItem> {
	declare sku: string;
	declare name: string;
	declare qty: number;
	declare price: number;

	@QComputed()
	get subtotal(): number {
		return this.qty * this.price;
	}
}

interface ICartStore {
	items: Map<string, CartItem>;
	addItem: (data: object) => void;
	updateQty: (sku: string, qty: number) => void;
	total: () => number;
}

const useCartStore = create<ICartStore>((set, get) => ({
	items: new Map(),

	addItem: (data) =>
		set((state) => {
			const item = new CartItem(data);
			const items = new Map(state.items);
			items.set(item.sku, item);
			return { items };
		}),

	updateQty: (sku, qty) =>
		set((state) => {
			const current = state.items.get(sku);
			if (!current) return state;
			const items = new Map(state.items);
			// copy() is IMMUTABLE — always capture the returned new instance
			items.set(sku, current.copy({ qty }));
			return { items };
		}),

	total: () =>
		[...get().items.values()].reduce(
			(sum, item) => sum + item.qty * item.price,
			0
		),
}));
```

## Custom Hook — useQModel

```typescript
import { useReducer, useCallback } from 'react';
import { QModel } from '@cartago-git/quickmodel';

export function useQModel<T extends object, M extends QModel<T>>(initial: M) {
	const [model, dispatch] = useReducer((_prev: M, next: M) => next, initial);

	const update = useCallback(
		(patch: Partial<T>) => dispatch(model.copy(patch) as M), // as M is safe: M extends QModel<T>
		[model]
	);

	return { model, update, snapshot: model.serialize() };
}
```

```tsx
// usage
const { model, update, snapshot } = useQModel(
	new UserProfile({
		id: 'u1',
		displayName: 'Alice',
		bio: 'Dev',
		avatarUrl: '',
	})
);

// update via immutable merge
update({ bio: 'Senior Dev' });
```

## Async Validation

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

// in a useEffect or server action
const result = await qCheckRulesAsync(form, { mode: 'parallel' });
if (!result.valid) {
	setErrors(result.errors);
}
```

## createMany() — Bulk Data Loading

```typescript
// In Next.js page or data fetching
const raw = await fetch('/api/products').then((r) => r.json());
const { instances, errors } = ProductModel.createMany(raw);
// All items are coerced and type-safe
const serialized = instances.map((p) => p.serialize());
```

# Integración con React

QuickModel proporciona una capa de validación y tipo para aplicaciones React — compatible con `useState`, React Hook Form, Next.js Server Actions y stores Zustand.

## Patrones principales

| Caso de uso                          | Solución QuickModel                   |
| ------------------------------------ | ------------------------------------- |
| `useState` / formularios controlados | Clase plana + `qCheckRules()`         |
| React Hook Form resolver             | Adaptador personalizado               |
| Next.js Server Actions               | DTO en el servidor                    |
| Store Zustand                        | `copy()` inmutable                    |
| Validación asíncrona                 | `@QRule` async + `qCheckRulesAsync()` |
| Hook personalizado                   | `useQModel()`                         |

## Formularios controlados con useState

```typescript
// models/contact-form.ts
import { QField, QRule } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

class ContactForm {
	@QField({ label: 'Nombre', required: true })
	@QRule((v: string) => v.length >= 2, 'Nombre muy corto')
	name = '';

	@QField({ label: 'Email', widget: 'email' })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	email = '';

	@QField({ label: 'Mensaje' })
	@QRule((v: string) => v.length >= 10, 'Mensaje muy corto')
	message = '';
}
```

```tsx
// components/ContactForm.tsx
const [form, setForm] = useState(() => new ContactForm());

const handleChange = (field: keyof ContactForm, value: string) => {
	const updated = new ContactForm();
	Object.assign(updated, form, { [field]: value });
	setForm(updated);
};

const { valid, errors } = qCheckRules(form);
```

::: tip Dos patrones disponibles

- **Clase plana** (arriba): solo `@QRule` + `@QField` — sin herencia de `QModel`.
- **Con `QModel` + `@Quick`** (abajo): accedes además a `copy()`, `serialize()`, `checkIntegrity()` y actualizaciones inmutables.
  :::

### Con QModel + @Quick

```typescript
// models/contact-form.ts
import { QModel, Quick, QField, QRule } from 'quickmodel';

@Quick({ name: 'string', email: 'string', message: 'string' })
class ContactForm extends QModel<IContactForm> {
	@QField({ label: 'Nombre', required: true })
	@QRule((v: string) => v.length >= 2, 'Nombre muy corto')
	declare name: string;

	@QField({ label: 'Email', widget: 'email' })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	declare email: string;

	@QField({ label: 'Mensaje' })
	@QRule((v: string) => v.length >= 10, 'Mensaje muy corto')
	declare message: string;
}
```

```tsx
// components/ContactForm.tsx
const [form, setForm] = useState(() => new ContactForm({}));

// copy() es inmutable — devuelve una nueva instancia
const handleChange = (field: keyof IContactForm, value: string) => {
	setForm((prev) => prev.$qm.copy({ [field]: value }) as ContactForm);
};

const { valid, errors } = form.$qm.checkRules();
```

## React Hook Form — Adaptador resolver

```typescript
// hooks/useQuickResolver.ts
import type { Resolver } from 'react-hook-form';
import { qCheckRules } from 'quickmodel/forms';

export function createQuickResolver<T extends object>(
	FormClass: new () => T
): Resolver<T> {
	return (values) => {
		const instance = Object.assign(new FormClass(), values);
		const { valid, errors } = qCheckRules(instance);
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
// components/RegisterForm.tsx
const resolver = createQuickResolver(RegistrationForm);
const {
	register,
	handleSubmit,
	formState: { errors },
} = useForm({ resolver });
```

### Variante tipada con QModel

Si usas `QModel`, puedes tiparlo más estrictamente y usar `instance.checkRules()` directamente:

```typescript
// hooks/useQuickResolver.ts — variante QModel
import type { Resolver } from 'react-hook-form';
import { QModel } from 'quickmodel';

export function createQModelResolver<T extends QModel<object>>(
	FormClass: new (data?: object) => T
): Resolver<T> {
	return (values) => {
		const instance = new FormClass(values);
		const { valid, errors } = instance.$qm.checkRules();
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
// RegistrationForm debe extender QModel
const resolver = createQModelResolver(RegistrationForm);
```

::: info ¿Cuál usar?
| Objetivo | Función |
|---|---|
| Solo validar con `@QRule`, sin herencia | `createQuickResolver` — acepta cualquier clase |
| `QModel` completo con coerción y serialización | `createQModelResolver` — tipado fuerte |
:::

## Next.js Server Actions

```typescript
// app/actions/orders.ts
'use server';
import { QModel, Quick, QField, QRule, QComputed } from 'quickmodel';

@Quick(
	{ productId: 'string', quantity: 'number', price: 'number' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class OrderItemDto extends QModel<IOrderItem> {
	declare productId: string;
	declare quantity: number;
	declare price: number;

	@QComputed()
	get total(): number {
		return this.quantity * this.price;
	}
}

export async function createOrder(formData: FormData) {
	const raw = {
		productId: formData.get('productId'),
		quantity: formData.get('quantity'), // string → número con coercionStrategy: 'loose'
		price: formData.get('price'),
	};
	const dto = new OrderItemDto(raw);
	const { valid, errors } = dto.$qm.checkRules();
	if (!valid) return { success: false, errors };
	// dto.total está disponible via @QComputed
	return { success: true, data: dto.$qm.serialize() };
}
```

## Store de tipo Zustand

```typescript
// stores/cart.store.ts
import { QModel, Quick, QField, QRule } from 'quickmodel';

@Quick(
	{ id: 'string', name: 'string', qty: 'number', unitPrice: 'number' },
	{ coercionStrategy: 'loose' }
)
class CartItem extends QModel<ICartItem> {
	declare id: string;
	declare name: string;
	declare qty: number;
	declare unitPrice: number;
}

interface ICartStore {
	items: Map<string, CartItem>;
	addItem: (data: ICartItem) => void;
	updateQty: (id: string, qty: number) => void;
}

const useCartStore = create<ICartStore>((set) => ({
	items: new Map(),
	addItem: (data) =>
		set((state) => {
			const item = new CartItem(data);
			state.items.set(item.id, item);
			return { items: new Map(state.items) };
		}),
	updateQty: (id, qty) =>
		set((state) => {
			const item = state.items.get(id);
			if (!item) return state;
			// copy() es INMUTABLE — guarda la nueva instancia
			state.items.set(id, item.$qm.copy({ qty }));
			return { items: new Map(state.items) };
		}),
}));
```

## Validación asíncrona

```typescript
// hooks/useEmailValidation.ts
import { qCheckRulesAsync } from 'quickmodel/forms';

const validateEmail = async (email: string) => {
	const form = new AsyncRegistrationForm();
	form.email = email;
	const result = await qCheckRulesAsync(form);
	return result.errors.filter((e) => e.field === 'email');
};
```

## Hook useQModel

```typescript
// hooks/useQModel.ts
import { useState, useCallback } from 'react';
import { QModel } from 'quickmodel';

export function useQModel<T extends QModel<object>>(
	ModelClass: new (data: object) => T,
	initialData: object
) {
	const [model, setModel] = useState(() => new ModelClass(initialData));

	const update = useCallback((patch: Partial<object>) => {
		setModel((prev) => prev.$qm.copy(patch) as T);
	}, []);

	const validate = useCallback(() => model.$qm.checkRules(), [model]);

	return { model, update, validate, isDirty: model.$qm.isDirty() };
}
```

::: tip coercionStrategy: 'loose'
Cuando recibes datos de `FormData` o parámetros URL, todos los valores son strings. Usa `coercionStrategy: 'loose'` para convertir automáticamente `"3"` → `3` y `"true"` → `true`.
:::

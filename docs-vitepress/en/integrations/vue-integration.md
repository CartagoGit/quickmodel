# Vue 3 Integration

QuickModel integrates with **Vue 3** and **Nuxt** through the Composition API. Use plain form classes for validation and `QModel` subclasses for Pinia stores and data coercion.

## Key Separation

| Use case                        | Approach                                    |
| ------------------------------- | ------------------------------------------- |
| Composition API form validation | Plain TS class + `@QRule` + `qCheckRules()` |
| Pinia store state               | `QModel` + `$qCopy()` (immutable actions)   |
| VeeValidate adapter             | `qCheckRules()` as field-level validator    |
| Nuxt server routes / API        | `QModel` + `unknownPropertyPolicy: 'strip'` |

## Installation

```bash
npm install quickmodel
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

## Composition API — Form Validation

```typescript
// composables/useContactForm.ts
import { reactive } from 'vue';
import { QRule, QField } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

class ContactForm {
	@QField({ label: 'Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Name must be at least 2 chars')
	name = '';

	@QField({ label: 'Email', widget: 'email' })
	@QRule((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
	email = '';
}

export function useContactForm() {
	const form = reactive(new ContactForm());

	function validate() {
		return qCheckRules(form);
	}

	function fieldError(field: keyof ContactForm): string | null {
		const result = qCheckRules(form);
		return (
			result.errors.find((e) => e.field === String(field))?.message ??
			null
		);
	}

	return { form, validate, fieldError };
}
```

```vue
<!-- ContactForm.vue -->
<script setup lang="ts">
const { form, fieldError, validate } = useContactForm();

function onSubmit() {
	const { valid } = validate();
	if (!valid) return;
	// form.name and form.email are valid
}
</script>

<template>
	<input v-model="form.name" />
	<span v-if="fieldError('name')">{{ fieldError('name') }}</span>

	<input v-model="form.email" />
	<span v-if="fieldError('email')">{{ fieldError('email') }}</span>
</template>
```

::: tip Two available patterns

- **Plain class** (above): `@QRule` + `@QField` only — no `QModel` inheritance required.
- **With `QModel` + `@Quick`** (below): also unlocks `$qCopy()`, `$qSerialize()`, `$qCheckIntegrity()`, and `$qDiff()`.
  :::

### With QModel + @Quick

```typescript
// composables/useContactForm.ts
import { reactive, toRaw } from 'vue';
import { QModel, Quick, QField, QRule } from 'quickmodel';

@Quick({ name: 'string', email: 'string' })
class ContactForm extends QModel<IContactForm> {
	@QField({ label: 'Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Name must be at least 2 chars')
	declare name: string;

	@QField({ label: 'Email', widget: 'email' })
	@QRule((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
	declare email: string;
}

export function useContactForm() {
	const form = reactive(new ContactForm({}));

	// toRaw() needed so QModel's internal `this` is not the Vue Proxy
	function validate() {
		return toRaw(form).$qCheckRules();
	}

	function fieldError(field: keyof IContactForm): string | null {
		const result = toRaw(form).$qCheckRules();
		return (
			result.errors.find((e) => e.field === String(field))?.message ??
			null
		);
	}

	function patch(data: Partial<IContactForm>) {
		return toRaw(form).$qCopy(data) as ContactForm;
	}

	return { form, validate, fieldError, patch };
}
```

::: warning `toRaw()` with QModel methods
Vue wraps instances in a `Proxy`. Always call `toRaw(form).$qCheckRules()` / `toRaw(form).$qCopy(...)` to prevent QuickModel's internal `this` from pointing to the Proxy instead of the real instance. See [Proxy compatibility](#qmodel-in-vue-reactive-proxy-compatibility).
:::

## Pinia Store — QModel as State

```typescript
// stores/articles.ts
import { defineStore } from 'pinia';
import { QModel, Quick, QComputed } from 'quickmodel';

@Quick(
	{
		id: 'string',
		title: 'string',
		content: 'string',
		published: 'boolean',
		publishedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class ArticleModel extends QModel<IArticle> {
	declare id: string;
	declare title: string;
	declare content: string;
	declare published: boolean;
	declare publishedAt: Date;

	@QComputed()
	get excerpt(): string {
		return this.content.slice(0, 100);
	}
}

export const useArticleStore = defineStore('articles', {
	state: () => ({
		articles: new Map<string, ArticleModel>(),
		selectedId: null as string | null,
	}),

	getters: {
		selectedArticle: (state) => {
			const art = state.selectedId
				? state.articles.get(state.selectedId)
				: null;
			return art ? art.$qSerialize() : null;
		},
		publishedArticles: (state) =>
			[...state.articles.values()]
				.filter((a) => a.published)
				.map((a) => a.$qSerialize()),
	},

	actions: {
		addArticle(data: object) {
			const article = new ArticleModel(data);
			this.articles.set(article.id, article);
		},

		updateArticle(id: string, patch: Partial<IArticle>) {
			const article = this.articles.get(id);
			if (!article) return;
			// $qCopy() is IMMUTABLE — always capture the new instance
			const updated = article.$qCopy(patch);
			this.articles.set(id, updated);
		},
	},
});
```

::: warning `$qCopy()` is immutable
Always assign the result of `$qCopy()` back to the store. The original model is never mutated.
:::

## VeeValidate Adapter

```typescript
// composables/useQModelField.ts
import { qCheckRules } from 'quickmodel/forms';

export function useQModelField<TForm extends object>(
	instance: TForm,
	field: keyof TForm
) {
	const result = qCheckRules(instance);
	const errors = result.errors.filter((e) => e.field === String(field));
	return {
		value: instance[field],
		errorMessage: errors[0]?.message ?? null,
		meta: { valid: errors.length === 0 },
	};
}
```

Integration with VeeValidate's `defineRule`:

```typescript
import { defineRule } from 'vee-validate';
import { qCheckRules } from 'quickmodel/forms';

defineRule('qmodel', (value: unknown, [instance, field]: [object, string]) => {
	instance[field as keyof object] = value as never;
	const result = qCheckRules(instance);
	const errors = result.errors.filter((e) => e.field === field);
	return errors.length === 0 || errors[0]!.message;
});
```

## Nuxt — useAsyncData with createMany()

```typescript
// composables/useProducts.ts
import { QModel, Quick, QComputed } from 'quickmodel';

@Quick(
	{
		id: 'number',
		name: 'string',
		price: 'number',
		inStock: 'boolean',
		updatedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class ProductModel extends QModel<IProduct> {
	declare id: number;
	declare name: string;
	declare price: number;
	declare inStock: boolean;
	declare updatedAt: Date;

	@QComputed()
	get displayPrice(): string {
		return `$${this.price.toFixed(2)}`;
	}
}

export function useProducts() {
	return useAsyncData('products', async () => {
		const raw = await $fetch<object[]>('/api/products');
		const { instances } = ProductModel.createMany(raw);
		return instances.map((p) => p.$qSerialize());
	});
}
```

## Async Validation

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

// In a Vue composable
const validate = async () => {
	const result = await qCheckRulesAsync(form, { mode: 'parallel' });
	if (!result.valid) {
		errorMap.value = Object.fromEntries(
			result.errors.map((e) => [e.field, e.message])
		);
	}
	return result.valid;
};
```

## Nuxt Server Route — DTO Coercion

```typescript
// server/api/users.post.ts
import { QModel, Quick } from 'quickmodel';

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const dto = new CreateUserDto(body); // coerces + strips unknowns
	const validation = dto.$qCheckRules();

	if (!validation.valid) {
		throw createError({
			statusCode: 422,
			data: { errors: validation.errors },
		});
	}

	return dto.$qSerialize();
});
```

## `$qDiff()` — Change Detection for Optimistic UI

```typescript
const original = new ArticleModel({ ... });
// user edits
const edited = original.$qCopy({ title: 'New Title' });

const changes = original.$qDiff(edited);
// { title: { before: 'Old Title', after: 'New Title' } }

// Only send changed fields to the server
await $fetch('/api/articles/1', { method: 'PATCH', body: changes });
```

## QModel in Vue `reactive()` — Proxy Compatibility

Vue's `reactive()` wraps objects in a `Proxy`. QuickModel installs lazy getters on instances via `Object.defineProperty`. This combination has a few rough edges you need to know about.

### Reading and writing through a reactive Proxy

Property access and assignment work correctly out of the box:

```typescript
import { reactive } from 'vue';

const user = new User({ name: 'Alice', age: 30, createdAt: '2024-01-01' });
const reactiveUser = reactive(user);

// Reads through the Proxy ✅
console.log(reactiveUser.name); // 'Alice'
console.log(reactiveUser.age); // 30
console.log(reactiveUser.createdAt); // Date instance

// Writes propagate back to the original model ✅
reactiveUser.name = 'Alice Updated';
console.log(user.name); // 'Alice Updated'
```

### Calling methods on a reactive model — use `toRaw()`

Vue's `Proxy` intercepts method calls. When `this` inside a QuickModel method resolves to the Proxy instead of the original instance, the internal backing store is not reachable. Always unwrap the model with `toRaw()` before calling QuickModel methods:

```typescript
import { reactive, toRaw } from 'vue';

const user = new User({ name: 'Alice', createdAt: '2024-01-01' });
const reactiveUser = reactive(user);

// ❌ Avoid — `this` inside $qSerialize() resolves to the Proxy
const data = reactiveUser.$qSerialize();

// ✅ Correct — toRaw() returns the unwrapped original instance
const data = toRaw(reactiveUser).$qSerialize();
const json = JSON.stringify(toRaw(reactiveUser).$qSerialize());
```

::: danger `JSON.stringify(reactiveProxy)` double-encodes
`QModel.toJSON()` returns a **string** (not a plain object). If you call `JSON.stringify(reactiveProxy)` directly, Vue's Proxy invokes `toJSON()`, gets a string, and `JSON.stringify` wraps it in quotes again. The fix:

```typescript
// ❌ Double-encoded: '"{\\"name\\":\\"Alice\\"}"'
JSON.stringify(reactiveUser);

// ✅ Correct plain-object serialization first, then stringify
JSON.stringify(toRaw(reactiveUser).$qSerialize());
```

:::

### `createReadonly()` + `reactive()` — avoid this combination

`createReadonly()` calls `Object.freeze()` on the instance. Vue's `reactive()` detects frozen objects and refuses to wrap them (Vue issues a runtime warning and returns the frozen object unchanged — no dependency tracking):

```typescript
const frozenUser = User.createReadonly({
	name: 'Bob',
	age: 25,
	createdAt: '2024-01-01',
});

// ⚠️ Vue warns: "[Vue warn] Target is non-extensible."
// reactive() returns the frozen object as-is — no reactivity.
const reactiveUser = reactive(frozenUser);
```

Reads still work through the Proxy, but mutations correctly throw in strict mode and don't trigger re-renders. Use `createReadonly()` only for display-only data. For live reactive state, use a mutable instance.

### Nested QModel instances

Nested `QModel` instances are wrapped in a Proxy on access — Vue recurses automatically:

```typescript
const user = new User({
	name: 'Alice',
	address: { city: 'Madrid', zip: '28001' },
});
const reactiveUser = reactive(user);

// ✅ Reads on nested models work
console.log(reactiveUser.address?.city); // 'Madrid'
console.log(reactiveUser.address instanceof Address); // true

// ✅ Writes on nested models propagate to the original instance
reactiveUser.address!.city = 'Barcelona';
console.log(user.address?.city); // 'Barcelona'
```

### Pinia store — recommended pattern

Pinia state is automatically reactive. Use `toRaw()` inside actions before calling `$qCopy()` so QuickModel's internal `this` is always the real instance:

```typescript
// stores/articles.ts
actions: {
  updateArticle(id: string, partial: Partial<IArticle>) {
    const prev = this.articles.get(id);
    if (!prev) return;
    // toRaw() → unwrap from reactive proxy before calling $qCopy()
    // $qCopy() → returns a new instance; Pinia detects the reference change
    this.articles.set(id, toRaw(prev).$qCopy(partial) as ArticleModel);
  },
},

getters: {
  // Serialize via toRaw() to avoid Proxy overhead in serialization
  articleList: (state) =>
    [...state.articles.values()].map((a) => toRaw(a).$qSerialize()),
},
```

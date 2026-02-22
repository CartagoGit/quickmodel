# Vue 3 Integration

QuickModel integrates with **Vue 3** and **Nuxt** through the Composition API. Use plain form classes for validation and `QModel` subclasses for Pinia stores and data coercion.

## Key Separation

| Use case                        | Approach                                    |
| ------------------------------- | ------------------------------------------- |
| Composition API form validation | Plain TS class + `@QRule` + `qCheckRules()` |
| Pinia store state               | `QModel` + `merge()` (immutable actions)    |
| VeeValidate adapter             | `qCheckRules()` as field-level validator    |
| Nuxt server routes / API        | `QModel` + `unknownPropertyPolicy: 'strip'` |

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

## Composition API — Form Validation

```typescript
// composables/useContactForm.ts
import { reactive } from 'vue';
import { QRule, QField } from '@cartago-git/quickmodel';
import { qCheckRules } from '@cartago-git/quickmodel/core/helpers/q-check-rules';

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

## Pinia Store — QModel as State

```typescript
// stores/articles.ts
import { defineStore } from 'pinia';
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

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
			return art ? art.serialize() : null;
		},
		publishedArticles: (state) =>
			[...state.articles.values()]
				.filter((a) => a.published)
				.map((a) => a.serialize()),
	},

	actions: {
		addArticle(data: object) {
			const article = new ArticleModel(data);
			this.articles.set(article.id, article);
		},

		updateArticle(id: string, patch: Partial<IArticle>) {
			const article = this.articles.get(id);
			if (!article) return;
			// merge() is IMMUTABLE — always capture the new instance
			const updated = article.merge(patch);
			this.articles.set(id, updated);
		},
	},
});
```

::: warning merge() is immutable
Always assign the result of `merge()` back to the store. The original model is never mutated.
:::

## VeeValidate Adapter

```typescript
// composables/useQModelField.ts
import { qCheckRules } from '@cartago-git/quickmodel/core/helpers/q-check-rules';

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
import { qCheckRules } from '@cartago-git/quickmodel/core/helpers/q-check-rules';

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
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

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
		return instances.map((p) => p.serialize());
	});
}
```

## Async Validation

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

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
import { QModel, Quick } from '@cartago-git/quickmodel';

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const dto = new CreateUserDto(body); // coerces + strips unknowns
	const validation = dto.checkRules();

	if (!validation.valid) {
		throw createError({
			statusCode: 422,
			data: { errors: validation.errors },
		});
	}

	return dto.serialize();
});
```

## diff() — Change Detection for Optimistic UI

```typescript
const original = new ArticleModel({ ... });
// user edits
const edited = original.merge({ title: 'New Title' });

const changes = original.diff(edited);
// { title: { before: 'Old Title', after: 'New Title' } }

// Only send changed fields to the server
await $fetch('/api/articles/1', { method: 'PATCH', body: changes });
```

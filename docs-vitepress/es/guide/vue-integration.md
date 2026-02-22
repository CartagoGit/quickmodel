# Integración con Vue 3

QuickModel encaja con la Composition API de Vue, stores Pinia, adaptadores VeeValidate y el sistema `useAsyncData` de Nuxt.

## Patrones principales

| Caso de uso               | Solución QuickModel                   |
| ------------------------- | ------------------------------------- |
| Composition API           | Clase plana + `qCheckRules()`         |
| Pinia store               | `QModel` + `merge()` inmutable        |
| VeeValidate               | Adaptador de campo personalizado      |
| `v-model` / `defineModel` | Binding directo                       |
| Nuxt `useAsyncData`       | `createMany()`                        |
| Validación asíncrona      | `@QRule` async + `qCheckRulesAsync()` |

## Composition API — Validación de formularios

```typescript
// composables/useProfileForm.ts
import { reactive, computed } from 'vue';
import { QField, QRule, qCheckRules } from '@cartago-git/quickmodel';

class ProfileForm {
	@QField({ label: 'Bio', required: true })
	@QRule((v: string) => v.length >= 10, 'Bio muy corta')
	bio = '';

	@QField({ label: 'Website', widget: 'url' })
	@QRule((v: string) => !v || /^https?:\/\//.test(v), 'URL inválida')
	website = '';
}

export function useProfileForm() {
	const form = reactive(new ProfileForm());
	const validation = computed(() => qCheckRules(form));
	return { form, validation };
}
```

```vue
<!-- components/ProfileForm.vue -->
<script setup>
const { form, validation } = useProfileForm();
</script>

<template>
	<input v-model="form.bio" />
	<span v-if="!validation.valid">{{ validation.errors[0]?.message }}</span>
</template>
```

## Pinia Store

```typescript
// stores/user.store.ts
import { defineStore } from 'pinia';
import { QModel, Quick, QField, QRule } from '@cartago-git/quickmodel';

@Quick({ id: 'string', name: 'string', role: 'string', points: 'number' })
class UserRecord extends QModel<IUser> {
	declare id: string;

	@QField({ label: 'Nombre', required: true })
	declare name: string;

	@QField({ label: 'Rol' })
	@QRule(
		(v: string) => ['admin', 'editor', 'viewer'].includes(v),
		'Rol inválido'
	)
	declare role: string;

	declare points: number;
}

export const useUserStore = defineStore('user', {
	state: () => ({ records: new Map<string, UserRecord>() }),
	actions: {
		add(data: IUser) {
			const record = new UserRecord(data);
			this.records.set(record.id, record);
		},
		update(id: string, patch: Partial<IUser>) {
			const record = this.records.get(id);
			if (!record) return;
			// merge() es INMUTABLE — captura la nueva instancia
			this.records.set(id, record.merge(patch) as UserRecord);
		},
	},
});
```

## Adaptador VeeValidate

```typescript
// composables/useQField.ts
import { ref, computed } from 'vue';
import { qCheckRules, QField, QRule } from '@cartago-git/quickmodel';

export function useQField<T extends object>(form: T, fieldName: keyof T) {
	const value = ref(form[fieldName]);

	const error = computed(() => {
		(form as any)[fieldName] = value.value;
		const { errors } = qCheckRules(form);
		return errors.find((e) => e.field === String(fieldName))?.message ?? '';
	});

	return { value, error };
}
```

## v-model / defineModel

```typescript
// composables/useSettingsForm.ts
class SettingsForm {
	@QField({ label: 'Idioma' })
	@QRule((v: string) => ['es', 'en', 'fr'].includes(v), 'Idioma inválido')
	language = 'es';

	@QField({ label: 'Notificaciones' })
	notifications = true;
}

export function useSettingsForm(initial: Partial<SettingsForm> = {}) {
	const form = reactive(Object.assign(new SettingsForm(), initial));
	const { valid, errors } = qCheckRules(form);
	return { form, valid, errors };
}
```

## Nuxt — useAsyncData con createMany()

```typescript
// composables/useProducts.ts
const { data, error } = await useAsyncData('products', async () => {
	const rawItems = await $fetch<unknown[]>('/api/products');
	const { instances, errors } = ProductDto.createMany(rawItems);

	if (errors.length) {
		console.warn(`${errors.length} productos no válidos`);
	}

	return instances.map((item) => item.serialize());
});
```

## Rutas de servidor Nuxt

```typescript
// server/api/users/index.post.ts
import { CreateUserDto } from '~/dto/create-user.dto';

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const dto = new CreateUserDto(body);
	const { valid, errors } = dto.checkRules();

	if (!valid) {
		throw createError({ statusCode: 422, data: { errors } });
	}

	// Guardar en base de datos...
	return dto.serialize();
});
```

## Validación asíncrona

```typescript
// composables/useUsernameCheck.ts
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

class UsernameDto {
	@QRule(async (username: string) => {
		const { available } = await $fetch(`/api/check-username?q=${username}`);
		return available;
	}, 'Nombre de usuario no disponible')
	username = '';
}

export async function checkUsername(username: string) {
	const dto = new UsernameDto();
	dto.username = username;
	return qCheckRulesAsync(dto);
}
```

::: tip createMany() devuelve { instances, errors }
Siempre desestructura el resultado:

```typescript
const { instances, errors } = MyDto.createMany(rawArray);
```

Los errores contienen los índices de los elementos que fallaron la coerción.
:::

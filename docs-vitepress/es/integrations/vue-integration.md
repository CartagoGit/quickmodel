# Integración con Vue 3

QuickModel encaja con la Composition API de Vue, stores Pinia, adaptadores VeeValidate y el sistema `useAsyncData` de Nuxt.

## Patrones principales

| Caso de uso               | Solución QuickModel                   |
| ------------------------- | ------------------------------------- |
| Composition API           | Clase plana + `qCheckRules()`         |
| Pinia store               | `QModel` + `copy()` inmutable         |
| VeeValidate               | Adaptador de campo personalizado      |
| `v-model` / `defineModel` | Binding directo                       |
| Nuxt `useAsyncData`       | `createMany()`                        |
| Validación asíncrona      | `@QRule` async + `qCheckRulesAsync()` |

## Composition API — Validación de formularios

```typescript
// composables/useProfileForm.ts
import { reactive, computed } from 'vue';
import { QField, QRule } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

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

::: tip Dos patrones disponibles

- **Clase plana** (arriba): solo `@QRule` + `@QField` — sin herencia de `QModel`.
- **Con `QModel` + `@Quick`** (abajo): accedes además a `copy()`, `serialize()`, `checkIntegrity()` y `diff()`.
  :::

### Con QModel + @Quick

```typescript
// composables/useProfileForm.ts
import { reactive, toRaw } from 'vue';
import { QModel, Quick, QField, QRule } from 'quickmodel';

@Quick({ bio: 'string', website: 'string' })
class ProfileForm extends QModel<IProfileForm> {
	@QField({ label: 'Bio', required: true })
	@QRule((v: string) => v.length >= 10, 'Bio muy corta')
	declare bio: string;

	@QField({ label: 'Website', widget: 'url' })
	@QRule((v: string) => !v || /^https?:\/\//.test(v), 'URL inválida')
	declare website: string;
}

export function useProfileForm() {
	const form = reactive(new ProfileForm({}));

	// toRaw() necesario para que `this` interno de QModel no sea el Proxy
	function validate() {
		return toRaw(form).$qCheckRules();
	}

	function patch(data: Partial<IProfileForm>) {
		return toRaw(form).$qCopy(data) as ProfileForm;
	}

	return { form, validate, patch };
}
```

::: warning `toRaw()` con métodos de QModel
Vue envuelve las instancias en un `Proxy`. Llama siempre a `toRaw(form).$qCheckRules()` / `toRaw(form).$qCopy(...)` para evitar que `this` interno apunte al Proxy en vez de a la instancia real. Ver [compatibilidad con Proxy](#qmodel-dentro-de-vue-reactive-compatibilidad-con-proxy).
:::

## Pinia Store

```typescript
// stores/user.store.ts
import { defineStore } from 'pinia';
import { QModel, Quick, QField, QRule } from 'quickmodel';

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
			// copy() es INMUTABLE — captura la nueva instancia
			this.records.set(id, record.$qCopy(patch) as UserRecord);
		},
	},
});
```

## Adaptador VeeValidate

```typescript
// composables/useQField.ts
import { ref, computed } from 'vue';
import { QField, QRule } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

export function useQField<T extends object>(form: T, fieldName: keyof T) {
	const value = ref(form[fieldName]);

	const error = computed(() => {
		Object.assign(form, { [fieldName]: value.value }); // typed — compatible with keyof T, no cast
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

	return instances.map((item) => item.$qSerialize());
});
```

## Rutas de servidor Nuxt

```typescript
// server/api/users/index.post.ts
import { CreateUserDto } from '~/dto/create-user.dto';

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const dto = new CreateUserDto(body);
	const { valid, errors } = dto.$qCheckRules();

	if (!valid) {
		throw createError({ statusCode: 422, data: { errors } });
	}

	// Guardar en base de datos...
	return dto.$qSerialize();
});
```

## Validación asíncrona

```typescript
// composables/useUsernameCheck.ts
import { qCheckRulesAsync } from 'quickmodel/forms';

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

## QModel dentro de Vue `reactive()` — Compatibilidad con Proxy

Vue envuelve los objetos pasados a `reactive()` en un `Proxy`. QuickModel instala lazy getters en las instancias mediante `Object.defineProperty`. Esta combinación tiene algunas fricciones concretas que debes conocer.

### Lectura y escritura a través de un Proxy reactivo

El acceso y la asignación de propiedades funcionan correctamente:

```typescript
import { reactive } from 'vue';

const user = new User({ name: 'Alice', age: 30, createdAt: '2024-01-01' });
const reactiveUser = reactive(user);

// Lecturas a través del Proxy ✅
console.log(reactiveUser.name); // 'Alice'
console.log(reactiveUser.age); // 30
console.log(reactiveUser.createdAt); // instancia de Date

// Escrituras se propagan al modelo original ✅
reactiveUser.name = 'Alice Actualizada';
console.log(user.name); // 'Alice Actualizada'
```

### Llamar métodos en un modelo reactivo — usa `toRaw()`

El `Proxy` de Vue intercepta las llamadas a métodos. Cuando `this` dentro de un método de QuickModel apunta al Proxy en lugar de la instancia original, el backing store interno no es accesible. Siempre desenvuelve el modelo con `toRaw()` antes de invocar métodos de QuickModel:

```typescript
import { reactive, toRaw } from 'vue';

const user = new User({ name: 'Alice', createdAt: '2024-01-01' });
const reactiveUser = reactive(user);

// ❌ Evitar — `this` dentro de serialize() apunta al Proxy
const data = reactiveUser.$qSerialize();

// ✅ Correcto — toRaw() devuelve la instancia original sin envolver
const data = toRaw(reactiveUser).$qSerialize();
const json = JSON.stringify(toRaw(reactiveUser).$qSerialize());
```

::: danger `JSON.stringify(reactiveProxy)` codifica doble
`QModel.toJSON()` devuelve un **string** (no un objeto plano). Si llamas a `JSON.stringify(reactiveProxy)` directamente, el Proxy de Vue invoca `toJSON()`, obtiene un string, y `JSON.stringify` lo vuelve a envolver entre comillas.

```typescript
// ❌ Resultado: doble codificación
JSON.stringify(reactiveUser);

// ✅ Correcto: serializar primero a objeto plano y después stringify
JSON.stringify(toRaw(reactiveUser).$qSerialize());
```

:::

### `createReadonly()` + `reactive()` — evita esta combinación

`createReadonly()` llama a `Object.freeze()` sobre la instancia. Vue detecta objetos congelados y se niega a envolverlos — emite un aviso en consola y devuelve el objeto tal cual, **sin tracking de dependencias**:

```typescript
const frozenUser = User.createReadonly({
	name: 'Bob',
	age: 25,
	createdAt: '2024-01-01',
});

// ⚠️ Vue advierte: "[Vue warn] Target is non-extensible."
// reactive() devuelve el objeto congelado sin reactividad
const reactiveUser = reactive(frozenUser);
```

Las lecturas siguen funcionando a través del Proxy, pero las mutaciones lanzan en strict mode y no provocan re-renders. Usa `createReadonly()` solo para datos de solo lectura. Para estado reactivo en vivo, usa una instancia mutable.

### Modelos anidados

Vue envuelve automáticamente en Proxy los objetos anidados al acceder a ellos:

```typescript
const user = new User({
	name: 'Alice',
	address: { city: 'Madrid', zip: '28001' },
});
const reactiveUser = reactive(user);

// ✅ Lecturas en modelos anidados funcionan
console.log(reactiveUser.address?.city); // 'Madrid'
console.log(reactiveUser.address instanceof Address); // true

// ✅ Escrituras en modelos anidados se propagan a la instancia original
reactiveUser.address!.city = 'Barcelona';
console.log(user.address?.city); // 'Barcelona'
```

### Pinia — patrón recomendado

El estado de Pinia ya es reactivo. Usa `toRaw()` dentro de las acciones antes de llamar a `copy()` para que `this` interno de QuickModel siempre sea la instancia real:

```typescript
// stores/articles.ts
actions: {
  updateArticle(id: string, partial: Partial<IArticle>) {
    const prev = this.articles.get(id);
    if (!prev) return;
    // toRaw() → desenvuelve del proxy antes de llamar copy()
    // copy() → devuelve una nueva instancia; Pinia detecta el cambio de referencia
    this.articles.set(id, toRaw(prev).$qCopy(partial) as ArticleModel);
  },
},

getters: {
  // Serializar via toRaw() para evitar el overhead del Proxy en la serialización
  articleList: (state) =>
    [...state.articles.values()].map((art) => toRaw(art).$qSerialize()),
},
```

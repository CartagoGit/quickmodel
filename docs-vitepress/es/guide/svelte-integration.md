# Integración con Svelte 5# Integración con Svelte 5

:::SvelteKit `request.formData()` devuelve todos los valores como `string`. Usa `coercionStrategy: 'loose'` para convertir automáticamente números y booleanos.::: tip FormData siempre devuelve strings`{#if slugError}<span class="error">{slugError}</span>{/if}<input bind:value={slug} on:blur={checkSlug} /></script>  }    slugError = errors[0]?.message ?? '';    const { errors } = await validateSlug(slug);  async function checkSlug() {  let slugError = $state('');  let slug = $state('');  import { validateSlug } from '$lib/validators/slug-check';<script lang="ts"><!-- PostEditor.svelte -->`svelte``}  return qCheckRulesAsync(dto);  dto.slug = slug;  const dto = new SlugDto();export async function validateSlug(slug: string) {}  slug = '';  )    'Este slug ya está en uso'    },      return available;      const { available } = await res.json();      const res = await fetch(`/api/check-slug?q=${slug}`);    async (slug: string) => {  @QRule(class SlugDto {import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';// lib/validators/slug-check.ts``typescript## Validación asíncrona de slug``};  };    products: instances.map(p => p.serialize()),  return {  }    console.warn(`${errors.length} productos rechazados`);  if (errors.length) {  const { instances, errors } = ProductDto.createMany(rawProducts);  const rawProducts = await fetch('/api/products').then(r => r.json());export const load: PageServerLoad = async ({ fetch }) => {import { ProductDto } from '$lib/dto/product.dto';import type { PageServerLoad } from './$types';// src/routes/products/+page.server.ts``typescript## SvelteKit — Función load con createMany()`};  },    return { success: true };    // Guardar usuario...    }      return fail(422, { errors });    if (!valid) {    const { valid, errors } = dto.checkRules();    const dto = new RegistrationDto(raw);    // coercionStrategy: 'loose' convierte age de string a number    const raw = Object.fromEntries(data);    const data = await request.formData();  default: async ({ request }) => {export const actions: Actions = {}  declare age: number;  @QRule((v: number) => v >= 18, 'Debes ser mayor de edad')  @QField({ label: 'Edad' })  declare password: string;  @QRule((v: string) => v.length >= 8, 'Mínimo 8 caracteres')  @QField({ label: 'Contraseña' })  declare email: string;  )    'Email inválido'    (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),  @QRule(  @QField({ label: 'Email' })  declare username: string;  @QRule((v: string) => v.length >= 3, 'Mínimo 3 caracteres')  @QField({ label: 'Usuario', required: true })class RegistrationDto extends QModel<IRegistration> {)  { unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }  { username: 'string', email: 'string', password: 'string', age: 'number' },@Quick(import { fail } from '@sveltejs/kit';import { QModel, Quick, QField, QRule } from '@cartago-git/quickmodel';import type { Actions } from './$types';// src/routes/register/+page.server.ts`typescript## SvelteKit — Form Actions`export const userStore = createUserStore();}  };    }),      return new Map(store);      store.set(id, record.merge(patch) as UserRecord);      // merge() es INMUTABLE — captura la nueva instancia      if (!record) return store;      const record = store.get(id);    updateRecord: (id: string, patch: Partial<IUser>) => update(store => {    }),      return new Map(store);      store.set(record.id, record);      const record = new UserRecord(data);    add: (data: IUser) => update(store => {    subscribe,  return {  const { subscribe, update } = writable(new Map<string, UserRecord>());function createUserStore() {}  declare active: boolean;  declare email: string;  @QField({ label: 'Email' })  declare name: string;  @QField({ label: 'Nombre', required: true })  declare id: string;class UserRecord extends QModel<IUser> {@Quick({ id: 'string', name: 'string', email: 'string', active: 'boolean' })import { QModel, Quick, QField, QRule } from '@cartago-git/quickmodel';import { writable } from 'svelte/store';// stores/user.store.ts`typescript## Writable Store`{#if usernameError}<span class="error">{usernameError}</span>{/if}<input bind:value={form.username} /></script>  );    validation.errors.find(e => e.field === 'username')?.message ?? ''  let usernameError = $derived(  let validation = $derived(qCheckRules(form));  let form = $state(new UserForm());  }    email = '';    )      'Email inválido'      (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),    @QRule(    @QField({ label: 'Email', widget: 'email' })    username = '';    @QRule((v: string) => v.length >= 3, 'Mínimo 3 caracteres')    @QField({ label: 'Nombre de usuario', required: true })  class UserForm {  import { QField, QRule, qCheckRules } from '@cartago-git/quickmodel';<script lang="ts"><!-- UserForm.svelte -->`svelte## Runes $state y $derived (Svelte 5)| Validación asíncrona | `@QRule` async + `qCheckRulesAsync()` || Función `load` | `createMany()` para datos en masa || SvelteKit form actions | DTO con `coercionStrategy: 'loose'` || Writable store | `QModel` en un `writable<T>` || Runes `$state`/`$derived` | Clase plana + `qCheckRules()` ||---|---|| Caso de uso | Solución QuickModel |## Patrones principalesQuickModel integra con los runes `$state`/`$derived` de Svelte 5, stores writables y las form actions + funciones `load` de SvelteKit.
QuickModel funciona con las runes de Svelte 5 (`$state`, `$derived`), stores escribibles, SvelteKit form actions y funciones `load`.

## Patrones principales

| Caso de uso                      | Solución QuickModel                   |
| -------------------------------- | ------------------------------------- |
| Runes `$state` / `$derived`      | Clase plana + `qCheckRules()`         |
| Stores escribibles               | `writable(new Model(data))`           |
| SvelteKit form actions           | DTO en el servidor                    |
| Función `load` con datos masivos | `createMany()`                        |
| Validación asíncrona             | `@QRule` async + `qCheckRulesAsync()` |

## Runes de Svelte 5 — `$state` y `$derived`

```svelte
<!-- ProfileEditor.svelte -->
<script lang="ts">
  import { QField, QRule, qCheckRules } from '@cartago-git/quickmodel';

  class ProfileRune {
    @QField({ label: 'Bio', required: true })
    @QRule((v: string) => v.length >= 10, 'Bio muy corta')
    bio = $state('');

    @QField({ label: 'Seguidores' })
    @QRule((v: number) => v >= 0, 'Valor inválido')
    followers = $state(0);
  }

  const form = new ProfileRune();
  const validation = $derived(qCheckRules(form));
</script>

<input bind:value={form.bio} />
{#if !validation.valid}
  <p>{validation.errors[0]?.message}</p>
{/if}
```

## Stores escribibles

```typescript
// stores/user-record.store.ts
import { writable } from 'svelte/store';
import { QModel, Quick, QField, QRule } from '@cartago-git/quickmodel';

@Quick({ id: 'string', name: 'string', email: 'string', active: 'boolean' })
class UserRecord extends QModel<IUser> {
	declare id: string;
	declare name: string;

	@QField({ label: 'Email', widget: 'email' })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	declare email: string;

	declare active: boolean;
}

export function createUserStore(initial: IUser) {
	const record = new UserRecord(initial);
	const { subscribe, set } = writable(record);

	return {
		subscribe,
		update: (patch: Partial<IUser>) => {
			// merge() es INMUTABLE — captura la nueva instancia
			set(record.merge(patch) as UserRecord);
		},
	};
}
```

## SvelteKit — Form Actions

```typescript
// src/routes/signup/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { RegistrationDto } from '$lib/dto/registration.dto';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const dto = new RegistrationDto({
			username: formData.get('username'),
			email: formData.get('email'),
			password: formData.get('password'),
		});

		const { valid, errors } = dto.checkRules();
		if (!valid) {
			return fail(422, { errors });
		}

		// Crear usuario...
		return { success: true };
	},
};
```

```svelte
<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form;
</script>

<form method="POST" use:enhance>
  <input name="username" />
  {#if form?.errors?.find(e => e.field === 'username')}
    <span>{form.errors.find(e => e.field === 'username').message}</span>
  {/if}
  <!-- ... -->
</form>
```

## Función load con createMany()

```typescript
// src/routes/products/+page.server.ts
import type { PageServerLoad } from './$types';
import { ProductDto } from '$lib/dto/product.dto';

export const load: PageServerLoad = async ({ fetch }) => {
	const rawItems = await fetch('/api/products').then((r) => r.json());
	const { instances, errors } = ProductDto.createMany(rawItems);

	if (errors.length) {
		console.warn(`${errors.length} productos no válidos`);
	}

	return {
		products: instances.map((p) => p.serialize()),
	};
};
```

## Validación asíncrona — Slug único

```typescript
// lib/dto/post.dto.ts
import { QField, QRule, qCheckRulesAsync } from '@cartago-git/quickmodel';

class PostDto {
	@QField({ label: 'Título', required: true })
	title = '';

	@QRule(async (slug: string) => {
		const exists = await checkSlugExists(slug);
		return !exists;
	}, 'Slug ya en uso')
	@QField({ label: 'Slug' })
	slug = '';
}

// Uso en un action:
const dto = new PostDto();
Object.assign(dto, formData);
const result = await qCheckRulesAsync(dto);
if (!result.valid) {
	return fail(422, { errors: result.errors });
}
```

::: tip Compatibilidad con Svelte 4
Para Svelte 4 (sin runes), usa stores escribibles convencionales. El patrón `merge()` inmutable sigue aplicando:

```typescript
store.update((prev) => prev.merge(patch));
```

:::
